// ==================== AUTO-SYNC SERVICE ====================
// 40 Second Polling System for Kronop App
// BunnyCDN → MongoDB → App Flow with Auto-Cleanup

import { BUNNY_CONFIG } from '../constants/Config';
import { API_URL } from './api';

export interface SyncResult {
  success: boolean;
  synced: number;
  cleaned: number;
  errors: string[];
  lastSync: string;
}

export interface ContentItem {
  id: string;
  bunny_id: string;
  url: string;
  thumbnail_url?: string;
  title?: string;
  type: 'reel' | 'video' | 'photo' | 'shayari' | 'story';
  created_at: string;
  updated_at: string;
}

/**
 * Auto-Sync Service - Background Data Management
 * Handles BunnyCDN → MongoDB → App synchronization
 */
export class AutoSyncService {
  private static instance: AutoSyncService;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private lastSyncTime: Date | null = null;
  private syncStats: SyncResult = {
    success: true,
    synced: 0,
    cleaned: 0,
    errors: [],
    lastSync: new Date().toISOString()
  };

  private constructor() {}

  static getInstance(): AutoSyncService {
    if (!AutoSyncService.instance) {
      AutoSyncService.instance = new AutoSyncService();
    }
    return AutoSyncService.instance;
  }

  /**
   * Start Auto-Sync Service (40 Second Polling)
   */
  start(): void {
    if (this.isRunning) {
      console.log('[AUTO_SYNC]: Already running');
      return;
    }

    console.log('[AUTO_SYNC]: Starting 40-second polling...');
    this.isRunning = true;

    // Initial sync immediately
    this.performSync();

    // Set up 40-second interval
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 40000); // 40 seconds
  }

  /**
   * Stop Auto-Sync Service
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('[AUTO_SYNC]: Stopped');
  }

  /**
   * Main Sync Operation - Runs in Background
   */
  private async performSync(): Promise<void> {
    try {
      console.log('[AUTO_SYNC]: Starting sync cycle...', new Date().toISOString());
      
      const startTime = Date.now();
      const stats: SyncResult = {
        success: true,
        synced: 0,
        cleaned: 0,
        errors: [],
        lastSync: new Date().toISOString()
      };

      // Step 1: Sync new content from BunnyCDN to MongoDB
      await this.syncBunnyToMongoDB(stats);

      // Step 2: Cleanup broken/missing content
      await this.cleanupBrokenContent(stats);

      // Step 3: Update sync stats
      this.syncStats = stats;
      this.lastSyncTime = new Date();

      const duration = Date.now() - startTime;
      console.log(`[AUTO_SYNC]: Sync completed in ${duration}ms`, {
        synced: stats.synced,
        cleaned: stats.cleaned,
        errors: stats.errors.length
      });

    } catch (error) {
      console.error('[AUTO_SYNC]: Sync failed:', error);
      this.syncStats.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Sync new BunnyCDN content to MongoDB
   */
  private async syncBunnyToMongoDB(stats: SyncResult): Promise<void> {
    console.log('[AUTO_SYNC]: Checking BunnyCDN for new content...');

    const contentTypes = [
      { type: 'reel', config: BUNNY_CONFIG.reels },
      { type: 'video', config: BUNNY_CONFIG.video },
      { type: 'live', config: BUNNY_CONFIG.live }
    ];

    for (const contentType of contentTypes) {
      try {
        await this.syncContentType(contentType.type, contentType.config, stats);
      } catch (error) {
        stats.errors.push(`${contentType.type}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Sync specific content type from BunnyCDN
   */
  private async syncContentType(type: string, config: any, stats: SyncResult): Promise<void> {
    if (!config.libraryId) return;

    console.log(`[AUTO_SYNC]: Syncing ${type} content...`);

    // Get videos from BunnyCDN Stream API
    const bunnyVideos = await this.fetchBunnyVideos(config.libraryId);
    
    // Get existing content from MongoDB
    const existingContent = await this.fetchMongoDBContent(type);

    // Find new videos (in Bunny but not in MongoDB)
    const newVideos = bunnyVideos.filter(bunny => 
      !existingContent.some(existing => existing.bunny_id === bunny.guid)
    );

    // Sync new videos to MongoDB
    for (const video of newVideos) {
      try {
        await this.saveToMongoDB(type, {
          bunny_id: video.guid,
          url: `https://${config.host}/${video.guid}/playlist.m3u8`,
          thumbnail_url: `https://${config.host}/${video.guid}/thumbnail.jpg`,
          title: video.title,
          type: type as any,
          created_at: new Date(video.dateCreated).toISOString(),
          updated_at: new Date().toISOString()
        });
        
        stats.synced++;
        console.log(`[AUTO_SYNC]: Synced new ${type}: ${video.guid}`);
      } catch (error) {
        stats.errors.push(`${type} ${video.guid}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Fetch videos from BunnyCDN Stream API
   */
  private async fetchBunnyVideos(libraryId: string): Promise<any[]> {
    try {
      const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
        headers: {
          'AccessKey': BUNNY_CONFIG.reels.streamKey || BUNNY_CONFIG.reels.apiKey,
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`BunnyCDN API error: ${response.status}`);
      }

      const result = await response.json();
      return result || [];
    } catch (error) {
      console.error(`[AUTO_SYNC]: Failed to fetch BunnyCDN videos:`, error);
      return [];
    }
  }

  /**
   * Fetch existing content from MongoDB
   */
  private async fetchMongoDBContent(type: string): Promise<ContentItem[]> {
    try {
      const endpoint = type === 'reel' ? '/api/reels' : 
                      type === 'video' ? '/api/videos' : 
                      `/api/${type}s`;
      
      const response = await fetch(`${API_URL}${endpoint}?limit=1000`);
      
      if (!response.ok) {
        throw new Error(`MongoDB API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result || [];
    } catch (error) {
      console.error(`[AUTO_SYNC]: Failed to fetch MongoDB content:`, error);
      return [];
    }
  }

  /**
   * Save content to MongoDB
   */
  private async saveToMongoDB(type: string, content: Partial<ContentItem>): Promise<void> {
    const endpoint = `/upload/${type}`;
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...content,
        userId: 'auto_sync_system' // Special user ID for auto-synced content
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save to MongoDB: ${response.status}`);
    }
  }

  /**
   * Cleanup broken/missing content
   */
  private async cleanupBrokenContent(stats: SyncResult): Promise<void> {
    console.log('[AUTO_SYNC]: Checking for broken content...');

    const contentTypes = ['reel', 'video', 'photo', 'shayari', 'story'];

    for (const type of contentTypes) {
      try {
        const content = await this.fetchMongoDBContent(type);
        
        for (const item of content) {
          const isValid = await this.validateContentURL(item);
          
          if (!isValid) {
            await this.removeFromMongoDB(type, item.id);
            stats.cleaned++;
            console.log(`[AUTO_SYNC]: Cleaned broken ${type}: ${item.id}`);
          }
        }
      } catch (error) {
        stats.errors.push(`Cleanup ${type}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Validate if content URL is still accessible
   */
  private async validateContentURL(item: ContentItem): Promise<boolean> {
    try {
      // Check thumbnail first (lighter)
      if (item.thumbnail_url) {
        const thumbResponse = await fetch(item.thumbnail_url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!thumbResponse.ok) {
          return false;
        }
      }

      // Check main content URL
      const response = await fetch(item.url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      return response.ok;
    } catch (error) {
      console.log(`[AUTO_SYNC]: URL validation failed for ${item.id}:`, error);
      return false;
    }
  }

  /**
   * Remove content from MongoDB
   */
  private async removeFromMongoDB(type: string, id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/${type}s/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete from MongoDB: ${response.status}`);
      }
    } catch (error) {
      console.error(`[AUTO_SYNC]: Failed to remove ${type} ${id}:`, error);
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncResult {
    return {
      ...this.syncStats,
      success: this.isRunning && this.syncStats.success
    };
  }

  /**
   * Force immediate sync
   */
  async forceSync(): Promise<SyncResult> {
    console.log('[AUTO_SYNC]: Force sync triggered...');
    await this.performSync();
    return this.getStatus();
  }
}

// Export singleton instance
export const autoSyncService = AutoSyncService.getInstance();
