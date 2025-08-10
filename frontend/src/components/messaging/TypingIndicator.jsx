import React from 'react';

const TypingIndicator = ({ userIds }) => {
  if (!userIds || userIds.length === 0) return null;

  return (
    <div className="flex justify-start">
      <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-2xl rounded-bl-md max-w-lg">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-sm">typing...</span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
