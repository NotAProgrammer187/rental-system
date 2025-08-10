import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import messageService from '../../services/messageService';

const ContactHostButton = ({ property, className = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleContactHost = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Get host/owner ID from different possible property structures
    const hostId = property.owner?._id || property.owner?.id || property.host?._id || property.host?.id;
    
    if (!hostId) {
      alert("Unable to find host information.");
      return;
    }

    if (user.id === hostId) {
      alert("You can't message yourself!");
      return;
    }

    setLoading(true);
    try {
      // Create or find existing conversation
      const response = await messageService.createConversation(
        hostId,
        property._id,
        null, // no booking ID for direct inquiries
        `Inquiry about ${property.title}`
      );

      console.log('Conversation created:', response.data);

      // Navigate to messages page with the specific conversation
      if (response.data && response.data._id) {
        // Small delay to ensure conversation is properly saved
        setTimeout(() => {
          navigate('/messages', { 
            state: { 
              conversationId: response.data._id,
              autoSelect: true 
            }
          });
        }, 500);
      } else {
        navigate('/messages');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!property || (!property.owner && !property.host)) {
    return null;
  }

  return (
    <button
      onClick={handleContactHost}
      disabled={loading}
      className={`
        flex items-center justify-center space-x-2 px-4 py-2 
        bg-blue-600 text-white rounded-lg hover:bg-blue-700 
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Contact Host</span>
        </>
      )}
    </button>
  );
};

export default ContactHostButton;
