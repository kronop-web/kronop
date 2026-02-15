// Auto-Sync System - 40-Second Pulse
// Background MongoDB ↔ BunnyCDN Sync with Zero UI Interruption
// Ultra-Fast Content Detection and Fetching

import { videosApi, photosApi, reelsApi } from './api';
import { getLongVideos } from './longVideoService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sync Configuration
const SYNC_INTERVAL = 40000; // 40 seconds
const SYNC_STORAGE_KEY = 'last_sync_timestamp';
const MAX_CACHE_AGE = 30000; // 30 seconds cache validity

interface SyncResult {
  hasNewData: boolean;
  timestamp: number;
  contentType: 'videos' | 'photos' | 'reels' | 'longVideos' | 'all';
  itemCount: number;
}

interface ContentHash {
  videos: string;
  photos: string;
  reels: string;
  longVideos: string;
}

class AutoSyncSystem {
  private lastSync: number = 0;
  private lastContentHash: ContentHash = {
    videos: '',
    photos: '',
    reels: '',
    longVideos: ''
  };
  private syncTimer: any = null;
  private isRunning: boolean = false;

  constructor() {
    this.initialize();
  }

  // Initialize auto-sync system
  private async initialize() {
    try {
      // Load last sync timestamp
      const stored = await AsyncStorage.getItem(SYNC_STORAGE_KEY);
      if (stored) {
        this.lastSync = parseInt(stored, 10);
      }

      // Start 40-second pulse
      this.startSyncPulse();
      
      console.log('🔄 Auto-Sync System initialized - 40s pulse active');
    } catch (error) {
      console.error('❌ Failed to initialize Auto-Sync:', error);
    }
  }

  // Start 40-second sync pulse
  private startSyncPulse() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.performBackgroundSync();
    }, SYNC_INTERVAL);

    console.log(`⚡ Auto-Sync pulse started - ${SYNC_INTERVAL/1000}s interval`);
  }

  // Main background sync - ZERO UI interruption
  private async performBackgroundSync() {
    if (this.isRunning) {
      return; // Skip if already running
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🔍 Performing background sync check...');

      // Check all content types simultaneously
      const [videoResult, photoResult, reelsResult, longVideoResult] = await Promise.allSettled([
        this.checkContentHash('videos'),
        this.checkContentHash('photos'),
        this.checkContentHash('reels'),
        this.checkContentHash('longVideos')
      ]);

      // Process results
      const results = [videoResult, photoResult, reelsResult, longVideoResult];
      let hasNewData = false;
      let totalNewItems = 0;

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.hasNewData) {
          hasNewData = true;
          totalNewItems += result.value.itemCount;
          
          // Auto-fetch new content in background
          await this.autoFetchNewContent(result.value.contentType);
        }
      }

      // Update sync timestamp
      this.lastSync = Date.now();
      await AsyncStorage.setItem(SYNC_STORAGE_KEY, this.lastSync.toString());

      const duration = Date.now() - startTime;
      console.log(`✅ Background sync completed in ${duration}ms - New: ${hasNewData ? totalNewItems : 0} items`);

    } catch (error) {
      console.error('❌ Background sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Check content hash for new data detection
  private async checkContentHash(type: keyof ContentHash): Promise<SyncResult> {
    try {
      let currentHash = '';
      let itemCount = 0;

      switch (type) {
        case 'videos':
          const videos = await videosApi.getVideos(1, 20);
          itemCount = Array.isArray(videos) ? videos.length : 0;
          currentHash = this.generateContentHash(videos);
          break;

        case 'photos':
          const photos = await photosApi.getPhotos();
          itemCount = Array.isArray(photos) ? photos.length : 0;
          currentHash = this.generateContentHash(photos);
          break;

        case 'reels':
          const reels = await reelsApi.getReels();
          itemCount = Array.isArray(reels) ? reels.length : 0;
          currentHash = this.generateContentHash(reels);
          // Pre-load reel thumbnails
          for (const reel of reels.slice(0, 15)) {
            const thumbnailUrl = reel.thumbnail_url || reel.video_url || '';
            if (thumbnailUrl) {
              this.preloadContent(thumbnailUrl, thumbnailUrl);
            }
          }
          break;

        case 'longVideos':
          const longVideos = await getLongVideos();
          itemCount = longVideos.length;
          currentHash = this.generateContentHash(longVideos);
          break;
      }

      const hasNewData = currentHash !== this.lastContentHash[type];
      
      if (hasNewData) {
        this.lastContentHash[type] = currentHash;
        console.log(`🆕 New ${type} detected: ${itemCount} items`);
      }

      return {
        hasNewData,
        timestamp: Date.now(),
        contentType: type,
        itemCount
      };

    } catch (error) {
      console.error(`❌ Failed to check ${type} hash:`, error);
      return {
        hasNewData: false,
        timestamp: Date.now(),
        contentType: type,
        itemCount: 0
      };
    }
  }

  // Auto-fetch new content without UI refresh
  private async autoFetchNewContent(contentType: string) {
    try {
      console.log(`📥 Auto-fetching new ${contentType} content...`);

      // Pre-warm caches and initialize chunking
      switch (contentType) {
        case 'videos':
        case 'longVideos':
          const videos = await getLongVideos();
          // Initialize micro-chunking for all videos
          for (const video of videos.slice(0, 10)) { // Limit to first 10 for performance
            if (video.bunnyCDNUrl) {
              // Pre-load video and thumbnail URLs
              this.preloadContent(video.videoUrl, video.thumbnail);
            }
          }
          break;

        case 'photos':
          const photos = await photosApi.getPhotos();
          // Pre-load photo thumbnails
          for (const photo of photos.slice(0, 15)) { // Limit to first 15
            if (photo.url || photo.thumbnail_url) {
              this.preloadContent(photo.url || photo.thumbnail_url, photo.thumbnail_url || photo.url);
            }
          }
          break;

        case 'reels':
          const reels = await reelsApi.getReels();
          // Pre-load reel thumbnails
          for (const reel of reels.slice(0, 15)) {
            const thumbnailUrl = reel.thumbnail_url || reel.video_url || '';
            if (thumbnailUrl) {
              this.preloadContent(thumbnailUrl, thumbnailUrl);
            }
          }
          break;
      }

      console.log(`✅ Auto-fetch completed for ${contentType}`);
      
      // INSTANT SYNC CONFIRMATION: Trigger UI update for new content
      this.notifyNewContent(contentType);
      
    } catch (error) {
      console.error(`❌ Auto-fetch failed for ${contentType}:`, error);
    }
  }

  // Notify UI about new content for instant display
  private notifyNewContent(contentType: string) {
    try {
      // Store latest content timestamp for UI priority
      const timestamp = Date.now();
      AsyncStorage.setItem(`latest_${contentType}_timestamp`, timestamp.toString());
      
      // Emit event for UI components to listen
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const event = new CustomEvent('newContentAvailable', {
          detail: { contentType, timestamp }
        });
        window.dispatchEvent(event);
      }
      
      console.log(`🔔 New ${contentType} content ready for instant display`);
    } catch (error) {
      console.error('❌ Failed to notify new content:', error);
    }
  }

  // Preload content (video + thumbnail) for instant display
  private async preloadContent(videoUrl: string, thumbnailUrl: string) {
    try {
      // Combined thumbnail + video preloading
      const promises = [
        // Preload thumbnail first (higher priority)
        fetch(thumbnailUrl, { method: 'HEAD' }).catch(() => {}),
        // Then preload video
        fetch(videoUrl, { method: 'HEAD' }).catch(() => {})
      ];

      await Promise.allSettled(promises);
      
      // Cache in React Native Image if available
      if (typeof require !== 'undefined') {
        try {
          const { Image } = require('react-native');
          if (thumbnailUrl) Image.prefetch(thumbnailUrl).catch(() => {});
          if (videoUrl) Image.prefetch(videoUrl).catch(() => {});
        } catch {}
      }
    } catch (error) {
      // Silent fail - don't interrupt sync
    }
  }

  // Generate content hash for change detection
  private generateContentHash(content: any[]): string {
    if (!Array.isArray(content) || content.length === 0) {
      return '';
    }

    // Create hash from IDs, timestamps, and update times
    const hashData = content
      .slice(0, 10) // Limit to first 10 for performance
      .map(item => ({
        id: item.id || item._id,
        updated: item.updated_at || item.createdAt || item.timestamp,
        url: item.videoUrl || item.url || item.thumbnail_url
      }))
      .map(item => `${item.id}:${item.updated}:${item.url}`)
      .join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashData.length; i++) {
      const char = hashData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  // Get sync status
  public getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSync,
      interval: SYNC_INTERVAL,
      uptime: Date.now() - this.lastSync
    };
  }

  // Force sync manually
  public async forceSync() {
    console.log('🔄 Forcing immediate sync...');
    await this.performBackgroundSync();
  }

  // Stop auto-sync
  public stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    console.log('⏹️ Auto-Sync System stopped');
  }

  // Restart auto-sync
  public restart() {
    this.stop();
    this.startSyncPulse();
    console.log('🔄 Auto-Sync System restarted');
  }
}

// Singleton instance
export const autoSyncSystem = new AutoSyncSystem();

// Export for app usage
export default autoSyncSystem;
