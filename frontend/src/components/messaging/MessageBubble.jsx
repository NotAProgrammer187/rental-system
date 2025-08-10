import React, { useState } from 'react';
import messageService from '../../services/messageService';

const MessageBubble = ({ message, isOwn, onReply }) => {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const renderAttachment = (attachment) => {
    if (attachment.isImage && !imageError) {
      return (
        <div className="mt-2">
          <img
            src={attachment.url}
            alt={attachment.originalName}
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachment.url, '_blank')}
            onError={handleImageError}
          />
          {attachment.originalName && (
            <p className="text-xs text-gray-500 mt-1">{attachment.originalName}</p>
          )}
        </div>
      );
    } else {
      return (
        <div className="mt-2 bg-gray-100 rounded-lg p-3 max-w-xs">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">
              {messageService.getFileIcon(attachment.originalName)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {attachment.originalName}
              </p>
              <p className="text-xs text-gray-500">
                {(attachment.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          <button
            onClick={() => window.open(attachment.url, '_blank')}
            className="w-full mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Download
          </button>
        </div>
      );
    }
  };

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`relative max-w-lg ${isOwn ? 'order-1' : 'order-2'}`}>
        {/* Message Bubble */}
        <div
          className={`
            px-4 py-2 rounded-2xl shadow-sm
            ${isOwn 
              ? 'bg-blue-600 text-white rounded-br-md' 
              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
            }
          `}
        >
          {/* Reply Preview */}
          {message.replyTo && (
            <div className={`
              mb-2 p-2 rounded-lg border-l-2 text-sm
              ${isOwn 
                ? 'bg-blue-500 border-blue-300 text-blue-100' 
                : 'bg-gray-50 border-gray-300 text-gray-600'
              }
            `}>
              <p className="font-medium text-xs mb-1">
                {message.replyTo.sender?.name || 'Unknown'}
              </p>
              <p className="truncate">{message.replyTo.content}</p>
            </div>
          )}

          {/* Message Content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.map((attachment, index) => (
            <div key={index}>
              {renderAttachment(attachment)}
            </div>
          ))}

          {/* Message Type Indicators */}
          {message.messageType === 'auto_reply' && (
            <div className={`
              text-xs mt-1 opacity-75
              ${isOwn ? 'text-blue-200' : 'text-gray-500'}
            `}>
              🤖 Auto-reply
            </div>
          )}

          {message.metadata?.isFromTemplate && (
            <div className={`
              text-xs mt-1 opacity-75
              ${isOwn ? 'text-blue-200' : 'text-gray-500'}
            `}>
              📝 Template
            </div>
          )}
        </div>

        {/* Message Info */}
        <div className={`
          flex items-center mt-1 space-x-2 text-xs text-gray-500
          ${isOwn ? 'justify-end' : 'justify-start'}
        `}>
          <span>{formatTime(message.createdAt)}</span>
          
          {isOwn && (
            <div className="flex items-center space-x-1">
              {message.isRead ? (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          )}

          {message.isEdited && (
            <span className="text-xs opacity-50">edited</span>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className={`
            absolute top-0 flex items-center space-x-1
            ${isOwn ? '-left-20' : '-right-20'}
          `}>
            <button
              onClick={() => onReply(message)}
              className="p-2 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Reply"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>

            {/* More actions could be added here */}
          </div>
        )}
      </div>

      {/* Avatar for other user */}
      {!isOwn && (
        <div className="order-1 mr-2 flex-shrink-0">
          <img
            src={message.sender.avatar || '/default-avatar.png'}
            alt={message.sender.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
