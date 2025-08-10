import { useState, useRef, useMemo } from 'react';

const MESSAGE_CACHE_SIZE = 50; // Keep last 50 messages per conversation in memory

const useMessageCache = () => {
  const cacheRef = useRef(new Map()); // conversationId -> messages array
  const [cacheKeys, setCacheKeys] = useState(new Set());

  const getCachedMessages = (conversationId) => {
    return cacheRef.current.get(conversationId) || [];
  };

  const setCachedMessages = (conversationId, messages) => {
    const cache = cacheRef.current;
    
    // Limit messages to cache size
    const limitedMessages = messages.slice(-MESSAGE_CACHE_SIZE);
    cache.set(conversationId, limitedMessages);
    
    // Update cache keys for re-render trigger
    setCacheKeys(new Set(cache.keys()));
    
    // Clean up old conversations if cache gets too large
    if (cache.size > 10) {
      const keys = Array.from(cache.keys());
      const oldestKey = keys[0];
      cache.delete(oldestKey);
      setCacheKeys(new Set(cache.keys()));
    }
  };

  const addMessageToCache = (conversationId, message) => {
    const existingMessages = getCachedMessages(conversationId);
    const updatedMessages = [...existingMessages, message];
    setCachedMessages(conversationId, updatedMessages);
  };

  const updateMessageInCache = (conversationId, messageId, updates) => {
    const messages = getCachedMessages(conversationId);
    const updatedMessages = messages.map(msg => 
      msg._id === messageId ? { ...msg, ...updates } : msg
    );
    setCachedMessages(conversationId, updatedMessages);
  };

  const clearCache = () => {
    cacheRef.current.clear();
    setCacheKeys(new Set());
  };

  const clearConversationCache = (conversationId) => {
    cacheRef.current.delete(conversationId);
    setCacheKeys(new Set(cacheRef.current.keys()));
  };

  const getCacheStats = useMemo(() => {
    const cache = cacheRef.current;
    return {
      conversationCount: cache.size,
      totalMessages: Array.from(cache.values()).reduce((total, messages) => total + messages.length, 0),
      cacheKeys: Array.from(cache.keys())
    };
  }, [cacheKeys]);

  return {
    getCachedMessages,
    setCachedMessages,
    addMessageToCache,
    updateMessageInCache,
    clearCache,
    clearConversationCache,
    getCacheStats
  };
};

export default useMessageCache;
