import { useState, useCallback, useEffect } from 'react';
import { LongVideo, getLongVideos, toggleLike } from '../services/longVideoService';

export function useLongVideos() {
  const [videos, setVideos] = useState<LongVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch videos from BunnyCDN on mount
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedVideos = await getLongVideos();
        setVideos(fetchedVideos);
      } catch (err) {
        console.error('Error loading long videos:', err);
        setError(err instanceof Error ? err.message : 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, []);

  const handleToggleLike = useCallback((videoId: string) => {
    setVideos(prevVideos => toggleLike(videoId, prevVideos));
  }, []);

  return { 
    videos, 
    loading, 
    error,
    toggleLike: handleToggleLike,
    refresh: async () => {
      try {
        setLoading(true);
        const fetchedVideos = await getLongVideos();
        setVideos(fetchedVideos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to refresh videos');
      } finally {
        setLoading(false);
      }
    }
  };
}
