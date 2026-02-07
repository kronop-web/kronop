// ==================== BRIDGES INDEX ====================
// Centralized export for all upload bridges
// ONE POINT OF ACCESS FOR ALL UPLOAD SERVICES

// Stream API Bridges (Video Content)
import { reelsBridge, ReelsBridge } from './ReelsBridge';
import { videoBridge, VideoBridge } from './VideoBridge';
import { liveBridge, LiveBridge } from './LiveBridge';

// Storage API Bridges (Image/Document Content)
import { storyBridge, StoryBridge } from './StoryBridge';
import { photoBridge, PhotoBridge } from './PhotoBridge';
import { shayariBridge, ShayariBridge } from './ShayariBridge';

// Type exports for better TypeScript support
export type { ReelUploadResult, ReelMetadata } from './ReelsBridge';
export type { VideoUploadResult, VideoMetadata } from './VideoBridge';
export type { LiveUploadResult, LiveMetadata } from './LiveBridge';
export type { StoryUploadResult, StoryMetadata } from './StoryBridge';
export type { PhotoUploadResult, PhotoMetadata } from './PhotoBridge';
export type { ShayariUploadResult, ShayariMetadata } from './ShayariBridge';

// ==================== BRIDGE MANAGER ====================
// Centralized management for all upload operations

export interface BridgeType {
  REELS: 'reels';
  VIDEO: 'video';
  LIVE: 'live';
  STORY: 'story';
  PHOTO: 'photo';
  SHAYARI: 'shayari';
}

export const BRIDGE_TYPES: BridgeType = {
  REELS: 'reels',
  VIDEO: 'video',
  LIVE: 'live',
  STORY: 'story',
  PHOTO: 'photo',
  SHAYARI: 'shayari'
} as const;

export type BridgeTypeKey = keyof BridgeType;

/**
 * Bridge Manager - Centralized upload management
 * Provides unified interface for all upload operations
 */
export class BridgeManager {
  private static instance: BridgeManager;

  private constructor() {}

  public static getInstance(): BridgeManager {
    if (!BridgeManager.instance) {
      BridgeManager.instance = new BridgeManager();
    }
    return BridgeManager.instance;
  }

  /**
   * Upload content using the appropriate bridge
   * @param type - Content type (reels, video, live, story, photo, shayari)
   * @param file - File to upload
   * @param metadata - Additional metadata
   * @returns Promise with upload result
   */
  async upload(
    type: keyof BridgeType,
    file: any,
    metadata?: any
  ): Promise<any> {
    try {
      console.log(`🌉 BridgeManager: Starting ${type} upload...`);

      switch (type) {
        case 'REELS':
          return await reelsBridge.uploadReel(file, metadata);
        case 'VIDEO':
          return await videoBridge.uploadVideo(file, metadata);
        case 'LIVE':
          return await liveBridge.uploadLiveContent(file, metadata);
        case 'STORY':
          return await storyBridge.uploadStory(file, metadata);
        case 'PHOTO':
          return await photoBridge.uploadPhoto(file, metadata);
        case 'SHAYARI':
          return await shayariBridge.uploadShayari(file, metadata);
        default:
          throw new Error(`BridgeManager: Unsupported upload type: ${type}`);
      }

    } catch (error) {
      console.error(`🌉❌ BridgeManager: ${type} upload failed:`, error);
      return {
        success: false,
        error: `${type} upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete content using the appropriate bridge
   * @param type - Content type
   * @param id - File/video ID or filename
   * @returns Promise with delete result
   */
  async delete(
    type: keyof BridgeType,
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🌉 BridgeManager: Deleting ${type}: ${id}`);

      switch (type) {
        case 'REELS':
          return await reelsBridge.deleteReel(id);
        case 'VIDEO':
          return await videoBridge.deleteVideo(id);
        case 'LIVE':
          return await liveBridge.deleteLiveContent(id);
        case 'STORY':
          return await storyBridge.deleteStory(id);
        case 'PHOTO':
          return await photoBridge.deletePhoto(id);
        case 'SHAYARI':
          return await shayariBridge.deleteShayari(id);
        default:
          throw new Error(`BridgeManager: Unsupported delete type: ${type}`);
      }

    } catch (error) {
      console.error(`🌉❌ BridgeManager: ${type} delete failed:`, error);
      return {
        success: false,
        error: `${type} delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get content info using the appropriate bridge
   * @param type - Content type
   * @param id - File/video ID or filename
   * @returns Promise with content info
   */
  async getInfo(
    type: keyof BridgeType,
    id: string
  ): Promise<any> {
    try {
      console.log(`🌉 BridgeManager: Getting ${type} info: ${id}`);

      switch (type) {
        case 'REELS':
          return await reelsBridge.getReelInfo(id);
        case 'VIDEO':
          return await videoBridge.getVideoInfo(id);
        case 'LIVE':
          return await liveBridge.getLiveContentInfo(id);
        case 'STORY':
          return await storyBridge.getStoryInfo(id);
        case 'PHOTO':
          return await photoBridge.getPhotoInfo(id);
        case 'SHAYARI':
          return await shayariBridge.getShayariInfo(id);
        default:
          throw new Error(`BridgeManager: Unsupported info type: ${type}`);
      }

    } catch (error) {
      console.error(`🌉❌ BridgeManager: ${type} info failed:`, error);
      throw error;
    }
  }

  /**
   * List content using the appropriate bridge
   * @param type - Content type
   * @param options - Additional options (category, prefix, etc.)
   * @returns Promise with content list
   */
  async list(
    type: keyof BridgeType,
    options?: any
  ): Promise<any[]> {
    try {
      console.log(`🌉 BridgeManager: Listing ${type}...`);

      switch (type) {
        case 'STORY':
          return await storyBridge.listStories();
        case 'PHOTO':
          return await photoBridge.listPhotos(options?.prefix);
        case 'SHAYARI':
          if (options?.category) {
            return await shayariBridge.listShayariByCategory(options.category);
          }
          return await shayariBridge.listAllShayari();
        case 'REELS':
        case 'VIDEO':
        case 'LIVE':
          // Stream API doesn't have direct list endpoint
          // You would need to implement this via your backend
          console.warn(`🌉 BridgeManager: ${type} listing not directly available via Stream API`);
          return [];
        default:
          throw new Error(`BridgeManager: Unsupported list type: ${type}`);
      }

    } catch (error) {
      console.error(`🌉❌ BridgeManager: ${type} list failed:`, error);
      throw error;
    }
  }

  /**
   * Get storage statistics for storage-based bridges
   * @param type - Content type (only storage-based)
   * @returns Promise with storage stats
   */
  async getStorageStats(type: 'STORY' | 'PHOTO' | 'SHAYARI'): Promise<any> {
    try {
      console.log(`🌉 BridgeManager: Getting ${type} storage stats...`);

      switch (type) {
        case 'STORY':
          return await storyBridge.getStorageStats();
        case 'PHOTO':
          return await photoBridge.getStorageStats();
        case 'SHAYARI':
          return await shayariBridge.getStorageStats();
        default:
          throw new Error(`BridgeManager: Storage stats not available for: ${type}`);
      }

    } catch (error) {
      console.error(`🌉❌ BridgeManager: ${type} storage stats failed:`, error);
      throw error;
    }
  }

  /**
   * Check if content exists
   * @param type - Content type
   * @param id - File/video ID or filename
   * @returns Promise<boolean>
   */
  async exists(
    type: keyof BridgeType,
    id: string
  ): Promise<boolean> {
    try {
      console.log(`🌉 BridgeManager: Checking if ${type} exists: ${id}`);

      switch (type) {
        case 'STORY':
          return await storyBridge.storyExists(id);
        case 'PHOTO':
          return await photoBridge.photoExists(id);
        case 'SHAYARI':
          return await shayariBridge.shayariExists(id);
        case 'REELS':
        case 'VIDEO':
        case 'LIVE':
          // For Stream API, try to get info
          try {
            await this.getInfo(type, id);
            return true;
          } catch {
            return false;
          }
        default:
          throw new Error(`BridgeManager: Unsupported exists type: ${type}`);
      }

    } catch (error) {
      console.error(`🌉❌ BridgeManager: ${type} exists check failed:`, error);
      return false;
    }
  }

  /**
   * Get bridge instance by type
   * @param type - Content type
   * @returns Bridge instance
   */
  getBridge(type: keyof BridgeType) {
    switch (type) {
      case 'REELS':
        return reelsBridge;
      case 'VIDEO':
        return videoBridge;
      case 'LIVE':
        return liveBridge;
      case 'STORY':
        return storyBridge;
      case 'PHOTO':
        return photoBridge;
      case 'SHAYARI':
        return shayariBridge;
      default:
        throw new Error(`BridgeManager: Unsupported bridge type: ${type}`);
    }
  }

  /**
   * Get all available bridge types
   * @returns Array of bridge types
   */
  getAvailableTypes(): (keyof BridgeType)[] {
    return Object.keys(BRIDGE_TYPES) as (keyof BridgeType)[];
  }

  /**
   * Check if type uses Stream API (video content)
   * @param type - Content type
   * @returns Boolean indicating if it uses Stream API
   */
  isStreamApiType(type: keyof BridgeType): boolean {
    return ['REELS', 'VIDEO', 'LIVE'].includes(type);
  }

  /**
   * Check if type uses Storage API (image/document content)
   * @param type - Content type
   * @returns Boolean indicating if it uses Storage API
   */
  isStorageApiType(type: keyof BridgeType): boolean {
    return ['STORY', 'PHOTO', 'SHAYARI'].includes(type);
  }
}

// Export singleton instance
export const bridgeManager = BridgeManager.getInstance();

// Default export
export default {
  // Individual bridges
  reelsBridge,
  videoBridge,
  liveBridge,
  storyBridge,
  photoBridge,
  shayariBridge,
  
  // Manager
  bridgeManager,
  
  // Types and constants
  BRIDGE_TYPES,
  BridgeManager
};
