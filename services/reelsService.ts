// ==================== REELS SERVICE ====================
// MongoDB-based service for Reels management
// Uses ReelsBridge for BunnyCDN uploads, handles all data operations via MongoDB API

import { authService } from './authService';
import { reelsBridge } from './bridges/ReelsBridge';
import { BUNNY_CONFIG, API_KEYS } from '../constants/Config';

export interface ReelData {
  id?: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_url?: string;
  duration?: number;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  user_id: string;
  bunny_video_id?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ReelUploadResult {
  success: boolean;
  reel?: ReelData;
  error?: string;
}

/**
 * Reels Service - Handles all Reels operations through MongoDB API
 * Upload flow: MongoDB API -> ReelsBridge (BunnyCDN) -> MongoDB API (save metadata)
 */
export class ReelsService {
  private readonly API_BASE = API_KEYS.KOYEB_URL || 'https://common-jesse-kronop-app-19cf0acc.koyeb.app';

  /**
   * Get authentication token for MongoDB API calls
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await authService.getAuthToken();
    } catch (error) {
      console.error('🎬 ReelsService: Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Create headers for MongoDB API calls
   */
  private async createHeaders(contentType: string = 'application/json'): Promise<Record<string, string>> {
    // BYPASS LOGIN: No authentication required for testing
    return {
      'Content-Type': contentType,
      // 'Authorization': 'Bearer dummy_token_for_testing'
    };
    // Original code commented for testing:
    // return await authService.createAuthHeaders(contentType);
  }

  /**
   * Upload a new reel - Complete flow
   */
  async uploadReel(file: any, metadata: Partial<ReelData>): Promise<ReelUploadResult> {
    try {
      console.log('🎬 ReelsService: Starting reel upload process...');

      // Step 1: Upload to BunnyCDN via ReelsBridge
      console.log('🎬 Step 1: Uploading to BunnyCDN...');
      // BYPASS LOGIN: Add dummy user ID if not provided
      const bunnyResult = await reelsBridge.uploadReel(file, {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        userId: metadata.user_id || 'guest_user'
      });

      if (!bunnyResult.success || !bunnyResult.videoId) {
        throw new Error(bunnyResult.error || 'Failed to upload to BunnyCDN');
      }

      console.log('🎬 BunnyCDN upload successful:', bunnyResult.videoId);

      // Step 2: Save metadata to MongoDB
      console.log('🎬 Step 2: Saving metadata to MongoDB...');
      const reelData: Partial<ReelData> = {
        ...metadata,
        bunny_video_id: bunnyResult.videoId,
        video_url: bunnyResult.url,
        thumbnail_url: `https://${BUNNY_CONFIG.reels.host}/${bunnyResult.videoId}/thumbnail.jpg`,
        views_count: 0,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/api/reels`, {
        method: 'POST',
        headers,
        body: JSON.stringify(reelData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save reel metadata: ${response.status} - ${errorText}`);
      }

      const savedReel = await response.json();
      console.log('🎬 Reel metadata saved to MongoDB:', savedReel);

      return {
        success: true,
        reel: savedReel.data || savedReel
      };

    } catch (error) {
      console.error('🎬❌ ReelsService: Upload failed:', error);
      return {
        success: false,
        error: `Reel upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all reels for the current user
   */
  async getUserReels(page: number = 1, limit: number = 20): Promise<ReelData[]> {
    try {
      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/api/reels?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reels: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result || [];
    } catch (error) {
      console.error('🎬❌ ReelsService: Failed to fetch reels:', error);
      return [];
    }
  }

  /**
   * Get public reels (for feed)
   */
  async getPublicReels(page: number = 1, limit: number = 20): Promise<ReelData[]> {
    try {
      const headers = await this.createHeaders();
      // Fixed: Use correct route /content/reels instead of /api/reels/public
      const response = await fetch(`${this.API_BASE}/content/reels?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch public reels: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result || [];
    } catch (error) {
      console.error('🎬❌ ReelsService: Failed to fetch public reels:', error);
      return [];
    }
  }

  /**
   * Update reel metadata
   */
  async updateReel(reelId: string, updates: Partial<ReelData>): Promise<ReelData | null> {
    try {
      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/api/reels/${reelId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update reel: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('🎬❌ ReelsService: Failed to update reel:', error);
      return null;
    }
  }

  /**
   * Delete a reel
   */
  async deleteReel(reelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First get reel info to delete from BunnyCDN
      const headers = await this.createHeaders();
      const getResponse = await fetch(`${this.API_BASE}/api/reels/${reelId}`, {
        method: 'GET',
        headers
      });

      if (!getResponse.ok) {
        throw new Error(`Failed to get reel info: ${getResponse.status}`);
      }

      const reel = await getResponse.json();
      const reelData = Array.isArray(reel) ? reel : reel.data || [];

      // Delete from BunnyCDN if bunny_video_id exists
      if (reelData.bunny_video_id) {
        const bunnyResult = await reelsBridge.deleteReel(reelData.bunny_video_id);
        if (!bunnyResult.success) {
          console.warn('🎬 Warning: Failed to delete from BunnyCDN:', bunnyResult.error);
        }
      }

      // Delete from MongoDB
      const deleteResponse = await fetch(`${this.API_BASE}/api/reels/${reelId}`, {
        method: 'DELETE',
        headers
      });

      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete reel from MongoDB: ${deleteResponse.status}`);
      }

      console.log('🎬 Reel deleted successfully:', reelId);
      return { success: true };

    } catch (error) {
      console.error('🎬❌ ReelsService: Failed to delete reel:', error);
      return {
        success: false,
        error: `Reel deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Like/unlike a reel
   */
  async toggleReelLike(reelId: string): Promise<{ liked: boolean; likes_count: number }> {
    try {
      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/api/reels/${reelId}/like`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle like: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('🎬❌ ReelsService: Failed to toggle like:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const reelsService = new ReelsService();
export default reelsService;
