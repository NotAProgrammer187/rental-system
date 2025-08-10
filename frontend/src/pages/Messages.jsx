import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessagingProvider } from '../context/MessagingContext';
import ConversationList from '../components/messaging/ConversationList';
import ChatView from '../components/messaging/ChatView';
import MessageSearch from '../components/messaging/MessageSearch';
import NotificationPanel from '../components/messaging/NotificationPanel';

const Messages = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showConversationList, setShowConversationList] = useState(true);

  // Handle auto-selection from navigation state
  useEffect(() => {
    if (location.state?.conversationId && location.state?.autoSelect) {
      setSelectedConversationId(location.state.conversationId);
      if (isMobile) {
        setShowConversationList(false);
      }
    }
  }, [location.state, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowConversationList(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleConversationSelect = (conversationId) => {
    setSelectedConversationId(conversationId);
    if (isMobile) {
      setShowConversationList(false);
    }
  };

  const handleBackToList = () => {
    setShowConversationList(true);
    setSelectedConversationId(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access your messages.</p>
        </div>
      </div>
    );
  }

  return (
    <MessagingProvider>
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">Stay connected with your hosts and guests</p>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[800px] flex">
            {/* Mobile Navigation */}
            {isMobile && selectedConversationId && (
              <div className="absolute top-4 left-4 z-10">
                <button
                  onClick={handleBackToList}
                  className="bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Conversation List */}
            <div className={`
              ${isMobile ? 'w-full' : 'w-80'} 
              ${isMobile && !showConversationList ? 'hidden' : 'block'}
              border-r border-gray-200 bg-gray-50
            `}>
              <div className="h-full flex flex-col">
                {/* Search */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <MessageSearch />
                </div>

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto">
                  <ConversationList 
                    onConversationSelect={handleConversationSelect}
                    selectedConversationId={selectedConversationId}
                  />
                </div>
              </div>
            </div>

            {/* Chat View */}
            <div className={`
              flex-1 
              ${isMobile && showConversationList ? 'hidden' : 'block'}
            `}>
              {selectedConversationId ? (
                <ChatView 
                  conversationId={selectedConversationId}
                  onBackToList={isMobile ? handleBackToList : null}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
                      <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm2.07-7.75l-.9.92C11.45 10.9 11 11.5 11 13h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H6c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                    <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notifications Panel */}
          <NotificationPanel />
        </div>
      </div>
    </MessagingProvider>
  );
};

export default Messages;
