import React, { useState, useRef, useEffect } from 'react';
import { useMessaging } from '../../context/MessagingContext';

const MessageSearch = () => {
  const { messageService } = useMessaging();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await messageService.searchMessages(searchQuery);
      setResults(response.data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 500);
  };

  const handleResultClick = (message) => {
    // You could implement navigation to the specific conversation/message here
    console.log('Navigate to message:', message);
    setShowResults(false);
    setQuery('');
  };

  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? 
        <mark key={i} className="bg-yellow-200">{part}</mark> : 
        part
    );
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search messages..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {query.length < 2 ? 'Type at least 2 characters to search' : 'No messages found'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.slice(0, 10).map((message) => (
                <div
                  key={message._id}
                  onClick={() => handleResultClick(message)}
                  className="p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <img
                      src={message.sender.avatar || '/default-avatar.png'}
                      alt={message.sender.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {message.sender.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {messageService.formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {highlightMatch(message.content, query)}
                      </p>
                      {message.conversation?.property && (
                        <p className="text-xs text-gray-400 mt-1">
                          in {message.conversation.property.title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {results.length > 10 && (
                <div className="p-3 text-center text-sm text-gray-500">
                  Showing first 10 results of {results.length}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageSearch;
