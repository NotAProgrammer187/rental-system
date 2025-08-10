const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> { socketId, userData }
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: function (origin, callback) {
          // Allow requests with no origin (mobile apps, etc.)
          if (!origin) return callback(null, true);
          
                  const allowedOrigins = [
          process.env.FRONTEND_URL,
          ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
        ].filter(Boolean); // Remove any undefined values
        
        if (allowedOrigins.length === 0) {
          console.error('🚨 SECURITY ERROR: FRONTEND_URL or ALLOWED_ORIGINS environment variable is required!');
          process.exit(1);
        }
          
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupAuthentication();
    this.setupEventHandlers();
    
    console.log('WebSocket service initialized');
  }

  setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.userData = {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role
        };

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userData.name} connected (${socket.id})`);
      
      // Store connected user
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        userData: socket.userData,
        lastSeen: new Date()
      });

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);
      
      // Broadcast that user is online to all conversations they're part of
      this.broadcastUserOnlineStatus(socket.userId, true);
      
      // Send current online users from all their conversations
      this.sendCurrentOnlineUsers(socket.userId);

      // Handle joining conversation rooms
      socket.on('join_conversation', async (conversationId) => {
        try {
          const conversation = await Conversation.findById(conversationId);
          
          if (!conversation || !conversation.isParticipant(socket.userId)) {
            socket.emit('error', { message: 'Access denied to conversation' });
            return;
          }

          socket.join(`conversation_${conversationId}`);
          console.log(`User ${socket.userData.name} joined conversation ${conversationId}`);
          
          // Notify other participants that user is online
          socket.to(`conversation_${conversationId}`).emit('user_online', {
            userId: socket.userId,
            userData: socket.userData
          });

          // Send current online users in this conversation to the newly joined user
          const conversationUsers = this.getConversationUsers(conversationId);
          const onlineUserIds = conversationUsers
            .filter(user => user.userId !== socket.userId) // Exclude self
            .map(user => user.userId);
          
          // Send current online status for each participant
          onlineUserIds.forEach(userId => {
            socket.emit('user_online', { userId });
          });

        } catch (error) {
          console.error('Error joining conversation:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Handle leaving conversation rooms
      socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`User ${socket.userData.name} left conversation ${conversationId}`);
        
        // Notify other participants that user left
        socket.to(`conversation_${conversationId}`).emit('user_offline', {
          userId: socket.userId
        });
      });

      // Handle sending messages
      socket.on('send_message', async (data) => {
        try {
          const { conversationId, content, messageType = 'text', replyTo } = data;

          // Validate conversation access
          const conversation = await Conversation.findById(conversationId);
          if (!conversation || !conversation.isParticipant(socket.userId)) {
            socket.emit('error', { message: 'Access denied to conversation' });
            return;
          }

          // Get recipient
          const otherParticipant = conversation.getOtherParticipant(socket.userId);
          if (!otherParticipant) {
            socket.emit('error', { message: 'No recipient found' });
            return;
          }

          // Create message
          const message = new Message({
            conversation: conversationId,
            sender: socket.userId,
            recipient: otherParticipant.user,
            content: content,
            messageType: messageType,
            replyTo: replyTo || null,
            metadata: {
              userAgent: socket.handshake.headers['user-agent'],
              ipAddress: socket.handshake.address
            }
          });

          await message.save();
          await message.populate('sender', 'name avatar');
          await message.populate('recipient', 'name avatar');
          if (replyTo) {
            await message.populate('replyTo', 'content sender');
          }

          // Update conversation
          await conversation.updateLastMessage(message._id, socket.userId);

          // Emit to conversation room
          this.io.to(`conversation_${conversationId}`).emit('new_message', {
            message: message,
            conversationId: conversationId
          });

          // Send push notification to offline users
          await this.sendNotificationToUser(otherParticipant.user, {
            type: 'new_message',
            title: `New message from ${socket.userData.name}`,
            body: content.substring(0, 100),
            conversationId: conversationId,
            senderId: socket.userId
          });

          console.log(`Message sent in conversation ${conversationId}`);

        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (conversationId) => {
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userData.name
        });
      });

      socket.on('typing_stop', (conversationId) => {
        socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
          userId: socket.userId
        });
      });

      // Handle message read receipts
      socket.on('mark_messages_read', async (data) => {
        try {
          const { conversationId, messageIds } = data;

          // Validate conversation access
          const conversation = await Conversation.findById(conversationId);
          if (!conversation || !conversation.isParticipant(socket.userId)) {
            return;
          }

          // Mark messages as read
          await Message.updateMany(
            {
              _id: { $in: messageIds },
              recipient: socket.userId,
              isRead: false
            },
            {
              $set: {
                isRead: true,
                readAt: new Date()
              },
              $push: {
                readBy: {
                  user: socket.userId,
                  readAt: new Date()
                }
              }
            }
          );

          // Update conversation unread count
          await conversation.markAsReadBy(socket.userId);

          // Notify sender about read receipts
          socket.to(`conversation_${conversationId}`).emit('messages_read', {
            messageIds: messageIds,
            readBy: socket.userId,
            readAt: new Date()
          });

        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      // Handle getting online users
      socket.on('get_online_users', (conversationId) => {
        const onlineUsers = [];
        const socketsInRoom = this.io.sockets.adapter.rooms.get(`conversation_${conversationId}`);
        
        if (socketsInRoom) {
          socketsInRoom.forEach(socketId => {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket && socket.userId !== socket.userId) {
              onlineUsers.push({
                userId: socket.userId,
                userData: socket.userData
              });
            }
          });
        }

        socket.emit('online_users', { conversationId, users: onlineUsers });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`User ${socket.userData.name} disconnected: ${reason}`);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.userId);
        
        // Broadcast that user is offline to all conversations they're part of
        this.broadcastUserOnlineStatus(socket.userId, false);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  // Send notification to user (for offline users)
  async sendNotificationToUser(userId, notification) {
    try {
      const userConnection = this.connectedUsers.get(userId.toString());
      
      if (userConnection) {
        // User is online, send via socket
        this.io.to(`user_${userId}`).emit('notification', notification);
      } else {
        // User is offline, could integrate with push notification service
        console.log(`User ${userId} is offline, notification queued:`, notification.title);
        // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    const userConnection = this.connectedUsers.get(userId.toString());
    if (userConnection) {
      this.io.to(`user_${userId}`).emit(event, data);
      return true;
    }
    return false;
  }

  // Send message to conversation
  sendToConversation(conversationId, event, data) {
    this.io.to(`conversation_${conversationId}`).emit(event, data);
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId.toString());
  }

  // Get connected users in conversation
  getConversationUsers(conversationId) {
    const room = this.io.sockets.adapter.rooms.get(`conversation_${conversationId}`);
    const users = [];
    
    if (room) {
      room.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          users.push({
            userId: socket.userId,
            userData: socket.userData
          });
        }
      });
    }
    
    return users;
  }

  // Broadcast user online/offline status to all their conversations
  async broadcastUserOnlineStatus(userId, isOnline) {
    try {
      // Find all conversations the user is part of
      const conversations = await Conversation.find({
        'participants.user': userId,
        'participants.isActive': true
      }).select('_id');

      // Broadcast to all conversation rooms
      conversations.forEach(conversation => {
        const event = isOnline ? 'user_online' : 'user_offline';
        this.io.to(`conversation_${conversation._id}`).emit(event, {
          userId: userId
        });
      });
    } catch (error) {
      console.error('Error broadcasting user status:', error);
    }
  }

  // Send current online users to a newly connected user
  async sendCurrentOnlineUsers(userId) {
    try {
      // Find all conversations the user is part of
      const conversations = await Conversation.find({
        'participants.user': userId,
        'participants.isActive': true
      }).select('_id participants');

      // For each conversation, find online users and notify the newly connected user
      conversations.forEach(conversation => {
        const conversationUsers = this.getConversationUsers(conversation._id.toString());
        const onlineUserIds = conversationUsers
          .filter(user => user.userId !== userId.toString()) // Exclude self
          .map(user => user.userId);
        
        // Send current online status for each participant to this user
        onlineUserIds.forEach(onlineUserId => {
          this.io.to(`user_${userId}`).emit('user_online', { userId: onlineUserId });
        });
      });
    } catch (error) {
      console.error('Error sending current online users:', error);
    }
  }

  // Emit event to specific user
  emitToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Emit event to all users in a conversation
  emitToConversation(conversationId, event, data) {
    this.io.to(`conversation_${conversationId}`).emit(event, data);
  }
}

module.exports = new WebSocketService();
