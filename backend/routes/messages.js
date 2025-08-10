const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const MessageTemplate = require('../models/MessageTemplate');
const websocketService = require('../services/websocketService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/messages');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and documents
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Content filtering function
function filterContent(content) {
  // Basic content filtering - in production, use more sophisticated filtering
  const bannedWords = ['spam', 'scam', 'fraud']; // Add more as needed
  const filtered = content;
  
  for (const word of bannedWords) {
    const regex = new RegExp(word, 'gi');
    if (regex.test(filtered)) {
      console.warn('Potentially inappropriate content detected');
      // Could flag for review instead of blocking
    }
  }
  
  return filtered;
}

// Validate XSS protection
function sanitizeContent(content) {
  // Basic XSS protection - in production, use a library like DOMPurify
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

// GET /api/messages/conversations - Get user's conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, archived = false } = req.query;
    const isArchived = archived === 'true';

    const conversations = await Conversation.getUserConversations(
      req.user._id, 
      isArchived, 
      parseInt(page), 
      parseInt(limit)
    );

    // Add online status for participants
    const conversationsWithStatus = conversations.map(conv => {
      const participants = conv.participants.map(p => ({
        ...p.toObject(),
        isOnline: websocketService.isUserOnline(p.user._id)
      }));

      return {
        ...conv.toObject(),
        participants
      };
    });

    res.json({
      success: true,
      data: conversationsWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: conversations.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch conversations' 
    });
  }
});

// GET /api/messages/conversations/:id - Get specific conversation
router.get('/conversations/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants.user', 'name avatar role')
      .populate('lastMessage', 'content messageType createdAt sender')
      .populate('property', 'title images')
      .populate('booking', 'checkIn checkOut status');

    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conversation not found' 
      });
    }

    if (!conversation.isParticipant(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Add online status for participants
    const participants = conversation.participants.map(p => ({
      ...p.toObject(),
      isOnline: websocketService.isUserOnline(p.user._id)
    }));

    res.json({
      success: true,
      data: {
        ...conversation.toObject(),
        participants
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch conversation' 
    });
  }
});

// GET /api/messages/conversations/:id/messages - Get conversation messages
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const conversationId = req.params.id;

    // Verify user access to conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isParticipant(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const messages = await Message.getConversationMessages(
      conversationId, 
      parseInt(page), 
      parseInt(limit), 
      req.user._id
    );

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch messages' 
    });
  }
});

// POST /api/messages/conversations/:id/messages - Send message
router.post('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { content, messageType = 'text', replyTo } = req.body;

    // Verify conversation access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isParticipant(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Get recipient
    const otherParticipant = conversation.getOtherParticipant(req.user._id);
    if (!otherParticipant) {
      return res.status(400).json({ 
        success: false, 
        message: 'No recipient found' 
      });
    }

    // Sanitize and filter content
    const sanitizedContent = sanitizeContent(content);
    const filteredContent = filterContent(sanitizedContent);

    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      recipient: otherParticipant.user,
      content: filteredContent,
      messageType: messageType,
      replyTo: replyTo || null,
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    await message.save();
    await message.populate('sender', 'name avatar');
    await message.populate('recipient', 'name avatar');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Update conversation
    await conversation.updateLastMessage(message._id, req.user._id);

    // Send via WebSocket
    websocketService.sendToConversation(conversationId, 'new_message', {
      message: message,
      conversationId: conversationId
    });

    // Send notification to offline users
    if (!websocketService.isUserOnline(otherParticipant.user)) {
      await websocketService.sendNotificationToUser(otherParticipant.user, {
        type: 'new_message',
        title: `New message from ${req.user.name}`,
        body: filteredContent.substring(0, 100),
        conversationId: conversationId,
        senderId: req.user._id
      });
    }

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message' 
    });
  }
});

// POST /api/messages/conversations/:id/upload - Upload file/image
router.post('/conversations/:id/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const conversationId = req.params.id;

    // Verify conversation access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isParticipant(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const file = req.file;
    const isImage = file.mimetype.startsWith('image/');
    let thumbnailUrl = null;

    // Generate thumbnail for images
    if (isImage) {
      const thumbnailPath = path.join(
        path.dirname(file.path),
        'thumb_' + path.basename(file.path)
      );

      try {
        await sharp(file.path)
          .resize(300, 300, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
        
        thumbnailUrl = `/uploads/messages/thumb_${path.basename(file.path)}`;
      } catch (error) {
        console.error('Error generating thumbnail:', error);
      }
    }

    // Get recipient
    const otherParticipant = conversation.getOtherParticipant(req.user._id);

    // Create message with attachment
    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      recipient: otherParticipant.user,
      content: req.body.caption || '',
      messageType: isImage ? 'image' : 'file',
      attachments: [{
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/messages/${file.filename}`,
        thumbnail: thumbnailUrl,
        isImage: isImage
      }],
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    await message.save();
    await message.populate('sender', 'name avatar');
    await message.populate('recipient', 'name avatar');

    // Update conversation
    await conversation.updateLastMessage(message._id, req.user._id);

    // Send via WebSocket
    websocketService.sendToConversation(conversationId, 'new_message', {
      message: message,
      conversationId: conversationId
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload file' 
    });
  }
});

// POST /api/messages/conversations - Start new conversation
router.post('/conversations', auth, async (req, res) => {
  try {
    const { participantId, propertyId, bookingId, subject } = req.body;

    console.log('Creating conversation with:', { participantId, propertyId, bookingId, subject, userId: req.user._id });

    if (!participantId || !propertyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Participant ID and Property ID are required' 
      });
    }

    // Determine roles based on user types
    const participant = await require('../models/User').findById(participantId);
    if (!participant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Participant not found' 
      });
    }

    let hostId, guestId;
    if (req.user.role === 'host' || req.user.role === 'admin') {
      hostId = req.user._id;
      guestId = participantId;
    } else {
      hostId = participantId;
      guestId = req.user._id;
    }

    console.log('Conversation participants:', { hostId, guestId, userRole: req.user.role });

    // Find or create conversation
    const conversation = await Conversation.findOrCreateConversation(
      hostId, 
      guestId, 
      propertyId, 
      bookingId
    );

    console.log('Created/found conversation:', conversation._id);

    if (subject) {
      conversation.subject = subject;
      await conversation.save();
    }

    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create conversation' 
    });
  }
});

// PUT /api/messages/conversations/:id/archive - Archive conversation
router.put('/conversations/:id/archive', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation || !conversation.isParticipant(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    await conversation.archiveForUser(req.user._id);

    res.json({
      success: true,
      message: 'Conversation archived successfully'
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to archive conversation' 
    });
  }
});

// PUT /api/messages/conversations/:id/unarchive - Unarchive conversation
router.put('/conversations/:id/unarchive', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation || !conversation.isParticipant(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    await conversation.unarchiveForUser(req.user._id);

    res.json({
      success: true,
      message: 'Conversation unarchived successfully'
    });
  } catch (error) {
    console.error('Error unarchiving conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to unarchive conversation' 
    });
  }
});

// PUT /api/messages/:id/read - Mark message as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message || !message.canUserAccess(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    await message.markAsRead(req.user._id);

    // Notify sender via WebSocket
    websocketService.sendToConversation(message.conversation, 'message_read', {
      messageId: message._id,
      readBy: req.user._id,
      readAt: new Date()
    });

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark message as read' 
    });
  }
});

// GET /api/messages/search - Search messages
router.get('/search', auth, async (req, res) => {
  try {
    const { query, conversationId } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query must be at least 2 characters' 
      });
    }

    let messages;
    if (conversationId) {
      // Search within specific conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.isParticipant(req.user._id)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }

      messages = await Message.searchMessages(conversationId, query, req.user._id);
    } else {
      // Search across all user's conversations
      const userConversations = await Conversation.find({
        'participants.user': req.user._id,
        'participants.isActive': true
      }).select('_id');

      const conversationIds = userConversations.map(c => c._id);

      messages = await Message.find({
        conversation: { $in: conversationIds },
        isDeleted: false,
        content: { $regex: query, $options: 'i' }
      })
      .populate('sender', 'name avatar')
      .populate('conversation', 'property participants')
      .sort({ createdAt: -1 })
      .limit(100);
    }

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search messages' 
    });
  }
});

// GET /api/messages/unread-count - Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get unread count' 
    });
  }
});

// PUT /api/messages/:messageId/read - Mark message as read
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the recipient
    if (message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark as read if not already read
    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();

      // Emit read receipt via WebSocket
      const websocketService = require('../services/websocketService');
      websocketService.emitToUser(message.sender, 'message_read', {
        messageId: message._id,
        conversationId: message.conversation,
        readAt: message.readAt,
        readBy: req.user._id
      });
    }

    res.json({
      success: true,
      data: {
        messageId: message._id,
        isRead: message.isRead,
        readAt: message.readAt
      }
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read'
    });
  }
});

// PUT /api/messages/conversations/:conversationId/read - Mark all messages in conversation as read
router.put('/conversations/:conversationId/read', auth, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    
    // Verify user access to conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark all unread messages in conversation as read
    const result = await Message.updateMany(
      {
        conversation: conversationId,
        recipient: req.user._id,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    // Get updated messages to send read receipts
    const updatedMessages = await Message.find({
      conversation: conversationId,
      recipient: req.user._id,
      readAt: { $exists: true }
    }).sort({ readAt: -1 }).limit(result.modifiedCount);

    // Emit read receipts via WebSocket
    if (result.modifiedCount > 0) {
      const websocketService = require('../services/websocketService');
      const messageIds = updatedMessages.map(msg => msg._id);
      
      websocketService.emitToConversation(conversationId, 'messages_read', {
        messageIds,
        conversationId,
        readAt: new Date(),
        readBy: req.user._id
      });
    }

    res.json({
      success: true,
      data: {
        conversationId,
        messagesMarked: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error marking conversation messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read'
    });
  }
});

module.exports = router;
