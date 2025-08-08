const NodeCache = require('node-cache');

// Create cache instance with 5 minutes default TTL
const cache = new NodeCache({ stdTTL: 300 });

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query parameters
    const key = `${req.originalUrl || req.url}`;
    
    // Check if data exists in cache
    const cachedData = cache.get(key);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Store original send method
    const originalSend = res.json;

    // Override send method to cache the response
    res.json = function(data) {
      // Cache the response
      cache.set(key, data, duration);
      
      // Call original send method
      return originalSend.call(this, data);
    };

    next();
  };
};

// Clear cache for specific patterns
const clearCache = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  matchingKeys.forEach(key => cache.del(key));
};

// Clear all cache
const clearAllCache = () => {
  cache.flushAll();
};

module.exports = { cacheMiddleware, clearCache, clearAllCache, cache };
