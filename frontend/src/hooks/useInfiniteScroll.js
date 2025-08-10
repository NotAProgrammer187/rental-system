import { useState, useEffect, useCallback } from 'react';

const useInfiniteScroll = (loadMore, hasMore, threshold = 100) => {
  const [loading, setLoading] = useState(false);

  const handleScroll = useCallback(async (element) => {
    if (!element || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const isNearBottom = scrollHeight - scrollTop - clientHeight <= threshold;

    if (isNearBottom) {
      setLoading(true);
      try {
        await loadMore();
      } catch (error) {
        console.error('Error loading more items:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [loadMore, hasMore, loading, threshold]);

  const scrollRef = useCallback((element) => {
    if (!element) return;

    const handleScrollEvent = () => handleScroll(element);
    element.addEventListener('scroll', handleScrollEvent);

    return () => {
      element.removeEventListener('scroll', handleScrollEvent);
    };
  }, [handleScroll]);

  return { loading, scrollRef };
};

export default useInfiniteScroll;
