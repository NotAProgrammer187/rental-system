import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import websocketService from '../services/websocketService';
import messageService from '../services/messageService';

const MessagingContext = createContext();

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export const MessagingProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const activeConversationRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Notification state
  const [notifications, setNotifications] = useState([]);

  // Set up WebSocket event listeners (connection handled by AuthContext)
  useEffect(() => {
    if (user) {
      // Set up event listeners
      websocketService.on('connection_status', ({ connected }) => {
        setIsConnected(connected);
        if (connected) {
          loadConversations();
          loadUnreadCount();
        }
      });

      websocketService.on('new_message', handleNewMessage);
      websocketService.on('message_read', handleMessageRead);
      websocketService.on('messages_read', handleMessagesRead);
      websocketService.on('user_typing', handleUserTyping);
      websocketService.on('user_stopped_typing', handleUserStoppedTyping);
      websocketService.on('user_online', handleUserOnline);
      websocketService.on('user_offline', handleUserOffline);
      websocketService.on('notification', handleNotification);
    }

    return () => {
      // Cleanup event listeners when component unmounts
      if (websocketService && typeof websocketService.removeAllListeners === 'function') {
        websocketService.removeAllListeners();
      }
    };
  }, [user]);

  // Load conversations
  const loadConversations = useCallback(async (page = 1, archived = false) => {
    try {
      setLoading(true);
      const response = await messageService.getConversations(page, 20, archived);
      if (page === 1) {
        setConversations(response.data || []);
      } else {
        setConversations(prev => [...prev, ...(response.data || [])]);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages for conversation
  const loadMessages = useCallback(async (conversationId, page = 1) => {
    try {
      setLoading(true);
      const response = await messageService.getMessages(conversationId, page);
      if (page === 1) {
        setMessages(response.data || []);
      } else {
        setMessages(prev => [...(response.data || []), ...prev]);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await messageService.getUnreadCount();
      setUnreadCount(response.data?.unreadCount || 0);
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }, []);

  // Handle new message
  const handleNewMessage = useCallback((data) => {
    const { message, conversationId } = data;
    
    // Add to messages if it's the active conversation
    if (activeConversationRef.current?._id === conversationId) {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const existingMessage = prev.find(msg => msg._id === message._id);
        if (existingMessage) {
          return prev; // Don't add duplicate
        }
        return [...prev, message];
      });
    }

    // Update conversation list
    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv._id === conversationId) {
          return {
            ...conv,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount: message.sender._id !== user.id ? 
              { ...conv.unreadCount, [getUserRole(conv)] : (conv.unreadCount[getUserRole(conv)] || 0) + 1 } :
              conv.unreadCount
          };
        }
        return conv;
      });

      // Sort by last message time
      return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    });

    // Update unread count if message is for current user
    if (message.recipient._id === user.id) {
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification if page is not focused
      if (document.hidden) {
        showBrowserNotification(message);
      }
      
      // Play notification sound
      playNotificationSound();
    }
  }, [user]);

  // Handle message read
  const handleMessageRead = useCallback((data) => {
    const { messageId, readBy } = data;
    
    setMessages(prev => prev.map(msg => 
      msg._id === messageId ? { ...msg, isRead: true, readAt: data.readAt } : msg
    ));
  }, []);

  // Handle messages read
  const handleMessagesRead = useCallback((data) => {
    const { messageIds, readBy } = data;
    
    setMessages(prev => prev.map(msg => 
      messageIds.includes(msg._id) ? { ...msg, isRead: true, readAt: data.readAt } : msg
    ));
  }, []);

  // Handle typing indicators
  const handleUserTyping = useCallback((data) => {
    setTypingUsers(prev => new Set([...prev, data.userId]));
  }, []);

  const handleUserStoppedTyping = useCallback((data) => {
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.userId);
      return newSet;
    });
  }, []);

  // Handle user presence
  const handleUserOnline = useCallback((data) => {
    setOnlineUsers(prev => new Set([...prev, data.userId]));
  }, []);

  const handleUserOffline = useCallback((data) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.userId);
      return newSet;
    });
  }, []);

  // Handle notifications
  const handleNotification = useCallback((notification) => {
    setNotifications(prev => [...prev, {
      ...notification,
      id: Date.now() + Math.random(),
      timestamp: new Date()
    }]);
  }, []);

  // Send message
  const sendMessage = useCallback(async (conversationId, content, messageType = 'text', replyTo = null) => {
    try {
      if (websocketService.isSocketConnected()) {
        // Send via WebSocket for real-time delivery
        websocketService.sendMessage({
          conversationId,
          content,
          messageType,
          replyTo
        });
      } else {
        // Fallback to HTTP API
        await messageService.sendMessage(conversationId, content, messageType, replyTo);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      throw err;
    }
  }, []);

  // Upload file
  const uploadFile = useCallback(async (conversationId, file, caption = '') => {
    try {
      const response = await messageService.uploadFile(conversationId, file, caption);
      return response.data;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
      throw err;
    }
  }, []);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (conversationId) => {
    const unreadMessages = messages.filter(msg => 
      !msg.isRead && msg.recipient._id === user.id
    );

    if (unreadMessages.length > 0) {
      try {
        // Mark as read via API
        await messageService.markConversationAsRead(conversationId);
        
        // Update local state (WebSocket will also update this via handleMessagesRead)
        const messageIds = unreadMessages.map(msg => msg._id);
        setMessages(prev => prev.map(msg => 
          messageIds.includes(msg._id) ? { ...msg, isRead: true, readAt: new Date() } : msg
        ));
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - unreadMessages.length));
      } catch (error) {
        console.error('Error marking conversation as read:', error);
      }
    }
  }, [messages, user]);

  // Set active conversation
  const setActiveConversationById = useCallback(async (conversationId) => {
    try {

      
      if (activeConversation?._id) {
        websocketService.leaveConversation(activeConversation._id);
      }

      const response = await messageService.getConversation(conversationId);
      
      const conversation = response.data;
      
      if (!conversation) {
        console.error('No conversation data received');
        setError('Conversation not found');
        return;
      }
      
      setActiveConversation(conversation);
      activeConversationRef.current = conversation;
      websocketService.joinConversation(conversationId);
      
      // Load messages
      await loadMessages(conversationId);
      
      // Mark conversation as read
      markConversationAsRead(conversationId);
      
      // Clear any previous errors
      setError(null);
      
    } catch (err) {
      console.error('Error setting active conversation:', err);
      console.error('Error details:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error message:', err.message);
      setError('Failed to load conversation');
      
      // Try to refresh conversations in case it's a new conversation
      try {
        await loadConversations();
      } catch (refreshErr) {
        console.error('Failed to refresh conversations:', refreshErr);
      }
    }
  }, [loadMessages, markConversationAsRead, loadConversations]);

  // Typing indicators
  const startTyping = useCallback((conversationId) => {
    websocketService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId) => {
    websocketService.stopTyping(conversationId);
  }, []);

  // Utility functions
  const getUserRole = useCallback((conversation) => {
    const participant = conversation.participants.find(p => p.user._id === user.id);
    return participant?.role || 'guest';
  }, [user]);

  const showBrowserNotification = useCallback((message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New message from ${message.sender.name}`, {
        body: message.content.substring(0, 100),
        icon: message.sender.avatar || '/default-avatar.png',
        tag: 'message-notification'
      });
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    // Create a subtle notification sound
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore errors if audio can't be played
    });
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const value = {
    // State
    conversations,
    activeConversation,
    messages,
    typingUsers,
    onlineUsers,
    unreadCount,
    isConnected,
    loading,
    error,
    notifications,

    // Actions
    loadConversations,
    loadMessages,
    sendMessage,
    uploadFile,
    setActiveConversationById,
    markConversationAsRead,
    startTyping,
    stopTyping,
    requestNotificationPermission,
    clearNotifications,
    removeNotification,
    loadUnreadCount,

    // Utilities
    getUserRole,
    messageService,
    websocketService
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

export default MessagingContext;
