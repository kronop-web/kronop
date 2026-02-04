// ==================== REELS SERVICE ====================
// Dedicated service for Reels functionality with real-time updates

import { reelsApi } from './api';

export interface Reel {
  id: string;
  user_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  views_count: number;
  likes_count: number;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    username: string;
    avatar_url: string;
  };
}

export const reelService = {
  /**
   * Upload a new reel
   */
  uploadReel: async (
    videoFile: { uri: string; name: string; type: string },
    thumbnailFile: { uri: string; name: string } | null,
    metadata: {
      title?: string;
      description?: string;
      duration?: number;
      tags?: string[];
      isPublic?: boolean;
    }
  ) => {
    return await reelsApi.uploadReel(videoFile, metadata);
  },

  /**
   * Get all reels
   */
  getAllReels: async () => {
    return await reelsApi.getAllReels();
  },

  /**
   * Get user's reels
   */
  getUserReels: async () => {
    return await reelsApi.getUserReels();
  },

  /**
   * Delete reel
   */
  deleteReel: async (reelId: string) => {
    return await reelsApi.deleteReel(reelId);
  },

  /**
   * Create polling service for real-time updates
   */
  createReelsPolling: (interval: number = 5000) => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const subscribers: ((data: any[]) => void)[] = [];
    const start = () => {
      if (timer) return;
      timer = setInterval(async () => {
        const result = await reelsApi.getAllReels();
        const data = result.data || [];
        subscribers.forEach(cb => cb(data));
      }, interval);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const subscribe = (cb: (data: any[]) => void) => {
      subscribers.push(cb);
      return () => {
        const idx = subscribers.indexOf(cb);
        if (idx >= 0) subscribers.splice(idx, 1);
      };
    };
    start();
    return { stop, subscribe };
  },

  /**
   * Format duration (seconds to mm:ss)
   */
  formatDuration: (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Format views count
   */
  formatViews: (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  },

  /**
   * Validate video file
   */
  validateVideoFile: (
    file: { uri: string; size?: number; type?: string }
  ): { valid: boolean; error?: string } => {
    // Check file type
    if (file.type && !file.type.startsWith('video/')) {
      return { valid: false, error: 'Please select a video file' };
    }

    // Check file size (100MB max for reels)
    if (file.size && file.size > 104857600) {
      return { 
        valid: false, 
        error: 'Video size must be less than 100MB' 
      };
    }

    return { valid: true };
  },
};

export default reelService;
