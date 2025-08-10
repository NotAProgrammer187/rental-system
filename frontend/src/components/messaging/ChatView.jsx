import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMessaging } from '../../context/MessagingContext';
import { useAuth } from '../../context/AuthContext';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import TypingIndicator from './TypingIndicator';
import FileUploadModal from './FileUploadModal';
import messageService from '../../services/messageService';

const ChatView = ({ conversationId, onBackToList }) => {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    setActiveConversationById,
    loadMessages,
    sendMessage,
    uploadFile,
    markConversationAsRead,
    startTyping,
    stopTyping,
    typingUsers,
    onlineUsers,
    loading
  } = useMessaging();

  const [showFileUpload, setShowFileUpload] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize conversation
  useEffect(() => {
    if (conversationId) {
      setActiveConversationById(conversationId);
      setPage(1);
      setHasMoreMessages(true);
    }
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Mark conversation as read when messages change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markConversationAsRead(conversationId);
    }
  }, [conversationId, messages, markConversationAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content, messageType = 'text') => {
    try {
      await sendMessage(conversationId, content, messageType, replyToMessage?._id);
      setReplyToMessage(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (files, caption) => {
    try {
      for (const file of files) {
        await uploadFile(conversationId, file, caption);
      }
      setShowFileUpload(false);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleTyping = useCallback(() => {
    startTyping(conversationId);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId);
    }, 3000);
  }, [conversationId, startTyping, stopTyping]);

  const handleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping(conversationId);
  }, [conversationId, stopTyping]);

  const handleScroll = async () => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMoreMessages) return;

    if (container.scrollTop === 0) {
      setLoadingMore(true);
      const nextPage = page + 1;
      
      try {
        const response = await loadMessages(conversationId, nextPage);
        const newMessages = response?.data || [];
        
        if (newMessages.length === 0) {
          setHasMoreMessages(false);
        } else {
          setPage(nextPage);
        }
      } catch (error) {
        console.error('Error loading more messages:', error);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const getOtherParticipant = () => {
    if (!activeConversation) return null;
    return activeConversation.participants.find(p => p.user._id !== user.id);
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const getTypingUsers = () => {
    return Array.from(typingUsers).filter(userId => userId !== user.id);
  };

  if (loading && !activeConversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Conversation not found</p>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant();
  const isOnline = otherParticipant && isUserOnline(otherParticipant.user._id);
  const typingUserIds = getTypingUsers();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBackToList && (
              <button
                onClick={onBackToList}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            {otherParticipant && (
              <>
                <div className="relative">
                  <img
                    src={otherParticipant.user.avatar || '/default-avatar.png'}
                    alt={otherParticipant.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                  )}
                </div>
                
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {otherParticipant.user.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Property Info */}
          {activeConversation.property && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {activeConversation.property.title}
              </p>
              {activeConversation.booking && (
                <p className="text-xs text-gray-500">
                  {new Date(activeConversation.booking.checkIn).toLocaleDateString()} - {new Date(activeConversation.booking.checkOut).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {/* Load More Indicator */}
        {loadingMore && (
          <div className="text-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          const showDate = index === 0 || 
            new Date(message.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();
          
          return (
            <div key={message._id}>
              {showDate && (
                <div className="text-center my-4">
                  <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                    {new Date(message.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
              
              <MessageBubble
                message={message}
                isOwn={message.sender._id === user.id}
                onReply={() => setReplyToMessage(message)}
              />
            </div>
          );
        })}

        {/* Typing Indicator */}
        {typingUserIds.length > 0 && (
          <TypingIndicator userIds={typingUserIds} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyToMessage && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Replying to {replyToMessage.sender.name}
              </p>
              <p className="text-sm text-gray-800 truncate">
                {replyToMessage.content}
              </p>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Message Composer */}
      <div className="bg-white border-t border-gray-200">
        <MessageComposer
          onSendMessage={handleSendMessage}
          onFileUpload={() => setShowFileUpload(true)}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          disabled={loading}
        />
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUploadModal
          onUpload={handleFileUpload}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  );
};

export default ChatView;
