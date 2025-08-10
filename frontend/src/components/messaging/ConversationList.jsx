import React, { useEffect, useState } from 'react';
import { useMessaging } from '../../context/MessagingContext';
import { useAuth } from '../../context/AuthContext';
import messageService from '../../services/messageService';

const ConversationList = ({ onConversationSelect, selectedConversationId }) => {
  const { user } = useAuth();
  const { 
    conversations, 
    loadConversations, 
    loading, 
    onlineUsers,
    getUserRole 
  } = useMessaging();
  
  const [showArchived, setShowArchived] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadConversations(1, showArchived);
    setPage(1);
  }, [showArchived, loadConversations]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    await loadConversations(nextPage, showArchived);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const message = conversation.lastMessage;
    
    if (message.messageType === 'image') {
      return '📷 Photo';
    } else if (message.messageType === 'file') {
      return '📎 File';
    } else {
      return message.content || 'Message';
    }
  };

  const getOtherParticipant = (conversation) => {
    return conversation.participants.find(p => p.user._id !== user.id);
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const getUnreadCount = (conversation) => {
    const userRole = getUserRole(conversation);
    return conversation.unreadCount?.[userRole] || 0;
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toggle Archived */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              !showArchived 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              showArchived 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            </div>
            <p className="font-medium">
              {showArchived ? 'No archived conversations' : 'No conversations yet'}
            </p>
            <p className="text-sm mt-1">
              {showArchived 
                ? 'Archived conversations will appear here' 
                : 'Start a conversation by booking a property'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const unreadCount = getUnreadCount(conversation);
              const isOnline = isUserOnline(otherParticipant?.user._id);
              const isSelected = selectedConversationId === conversation._id;

              return (
                <div
                  key={conversation._id}
                  onClick={() => onConversationSelect(conversation._id)}
                  className={`
                    p-4 cursor-pointer transition-colors duration-150 hover:bg-gray-50
                    ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
                  `}
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={otherParticipant?.user.avatar || '/default-avatar.png'}
                        alt={otherParticipant?.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`
                          text-sm font-medium truncate
                          ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}
                        `}>
                          {otherParticipant?.user.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {messageService.formatMessageTime(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-500 rounded-full">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Property Info */}
                      {conversation.property && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {conversation.property.title}
                        </p>
                      )}

                      {/* Last Message */}
                      <p className={`
                        text-sm mt-1 truncate
                        ${unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-600'}
                      `}>
                        {getLastMessagePreview(conversation)}
                      </p>

                      {/* Booking Info */}
                      {conversation.booking && (
                        <div className="flex items-center mt-2 space-x-2">
                          <span className={`
                            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            ${conversation.booking.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : conversation.booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                            }
                          `}>
                            {conversation.booking.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(conversation.booking.checkIn).toLocaleDateString()} - {new Date(conversation.booking.checkOut).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More */}
            {conversations.length > 0 && conversations.length % 20 === 0 && (
              <div className="p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
