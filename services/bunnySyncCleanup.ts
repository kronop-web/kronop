// ==================== BUNNY SYNC & CLEANUP ====================
// Syncs BunnyCDN storage with app database
// Hides deleted videos (404s) and maintains data consistency
// ZERO ERROR EXPERIENCE - No broken videos for users

interface SyncResult {
  videoId: string;
  existsOnBunny: boolean;
  status: 'active' | 'deleted' | 'error';
  lastChecked: number;
}

interface CleanupStats {
  totalChecked: number;
  deletedFound: number;
  databaseUpdated: number;
  errors: number;
  duration: number;
}

class BunnySyncCleanup {
  private syncCache = new Map<string, SyncResult>();
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly BATCH_SIZE = 10; // Check 10 videos at once
  private readonly REQUEST_TIMEOUT = 3000; // 3 seconds timeout

  /**
   * Check if video exists on BunnyCDN using HEAD request
   */
  async checkVideoExists(videoUrl: string): Promise<boolean> {
    try {
      // Use HEAD request to check existence without downloading
      const response = await fetch(videoUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'KronopApp-Sync/1.0',
          'Accept': '*/*',
          'Connection': 'keep-alive'
        }
        // NO TIMEOUT - Simple request to avoid crashes
      });

      // 200-299 means video exists, 404 means deleted
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.warn(`❌ Error checking video ${videoUrl}:`, error);
      return false; // Assume deleted on error
    }
  }

  /**
   * Check multiple videos in parallel for maximum speed
   */
  async checkMultipleVideos(videos: { id: string; url: string }[]): Promise<SyncResult[]> {
    console.log(`🔍 BunnySync: Checking ${videos.length} videos...`);
    
    const startTime = Date.now();
    const results: SyncResult[] = [];

    // Process in batches to avoid overwhelming BunnyCDN
    for (let i = 0; i < videos.length; i += this.BATCH_SIZE) {
      const batch = videos.slice(i, i + this.BATCH_SIZE);
      
      const batchPromises = batch.map(async (video) => {
        // Check cache first
        const cached = this.syncCache.get(video.id);
        if (cached && (Date.now() - cached.lastChecked) < this.CACHE_EXPIRY) {
          return cached;
        }

        // Check BunnyCDN
        const existsOnBunny = await this.checkVideoExists(video.url);
        
        const result: SyncResult = {
          videoId: video.id,
          existsOnBunny,
          status: existsOnBunny ? 'active' : 'deleted',
          lastChecked: Date.now()
        };

        // Update cache
        this.syncCache.set(video.id, result);
        
        return result;
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Batch ${i + this.BATCH_SIZE} item ${index} failed:`, result.reason);
          results.push({
            videoId: batch[index].id,
            existsOnBunny: false,
            status: 'error',
            lastChecked: Date.now()
          });
        }
      });

      // Small delay between batches to be respectful to BunnyCDN
      if (i + this.BATCH_SIZE < videos.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ BunnySync: Checked ${videos.length} videos in ${duration}ms`);
    
    return results;
  }

  /**
   * Sync reels with BunnyCDN and hide deleted ones
   */
  async syncReels(reels: any[]): Promise<{
    cleanedReels: any[];
    stats: CleanupStats;
  }> {
    const startTime = Date.now();
    
    // Extract video URLs for checking
    const videosToCheck = reels
      .map(reel => ({
        id: reel.id,
        url: this.extractVideoUrl(reel.video_url)
      }))
      .filter((v): v is { id: string; url: string } => v.url !== null); // Type guard

    console.log(`🧹 BunnySync: Starting sync for ${videosToCheck.length} reels...`);

    // Check all videos
    const syncResults = await this.checkMultipleVideos(videosToCheck);
    
    // Find deleted videos
    const deletedVideoIds = new Set(
      syncResults
        .filter(result => result.status === 'deleted')
        .map(result => result.videoId)
    );

    // Filter out deleted reels
    const cleanedReels = reels.filter(reel => !deletedVideoIds.has(reel.id));
    
    // Update database for deleted videos
    let databaseUpdated = 0;
    if (deletedVideoIds.size > 0) {
      databaseUpdated = await this.markVideosAsDeleted(Array.from(deletedVideoIds));
    }

    const stats: CleanupStats = {
      totalChecked: videosToCheck.length,
      deletedFound: deletedVideoIds.size,
      databaseUpdated,
      errors: syncResults.filter(r => r.status === 'error').length,
      duration: Date.now() - startTime
    };

    console.log(`🎯 BunnySync: Cleanup complete!`, {
      ...stats,
      originalCount: reels.length,
      remainingCount: cleanedReels.length
    });

    return { cleanedReels, stats };
  }

  /**
   * Sync videos with BunnyCDN and hide deleted ones
   */
  async syncVideos(videos: any[]): Promise<{
    cleanedVideos: any[];
    stats: CleanupStats;
  }> {
    const startTime = Date.now();
    
    // Extract video URLs for checking
    const videosToCheck = videos
      .map(video => ({
        id: video.id,
        url: this.extractVideoUrl(video.video_url)
      }))
      .filter((v): v is { id: string; url: string } => v.url !== null); // Type guard

    console.log(`🧹 BunnySync: Starting sync for ${videosToCheck.length} videos...`);

    // Check all videos
    const syncResults = await this.checkMultipleVideos(videosToCheck);
    
    // Find deleted videos
    const deletedVideoIds = new Set(
      syncResults
        .filter(result => result.status === 'deleted')
        .map(result => result.videoId)
    );

    // Filter out deleted videos
    const cleanedVideos = videos.filter(video => !deletedVideoIds.has(video.id));
    
    // Update database for deleted videos
    let databaseUpdated = 0;
    if (deletedVideoIds.size > 0) {
      databaseUpdated = await this.markVideosAsDeleted(Array.from(deletedVideoIds));
    }

    const stats: CleanupStats = {
      totalChecked: videosToCheck.length,
      deletedFound: deletedVideoIds.size,
      databaseUpdated,
      errors: syncResults.filter(r => r.status === 'error').length,
      duration: Date.now() - startTime
    };

    console.log(`🎯 BunnySync: Video cleanup complete!`, {
      ...stats,
      originalCount: videos.length,
      remainingCount: cleanedVideos.length
    });

    return { cleanedVideos, stats };
  }

  /**
   * Mark videos as deleted in database
   */
  private async markVideosAsDeleted(videoIds: string[]): Promise<number> {
    try {
      console.log(`🗑️ BunnySync: Marking ${videoIds.length} videos as deleted in database...`);
      
      // FIX: Use correct API endpoint for your backend
      const response = await fetch('/api/content/mark-deleted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          videoIds,
          contentType: 'reel' // Specify content type
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ BunnySync: Database updated for ${result.updatedCount} videos`);
        return result.updatedCount;
      } else if (response.status === 404) {
        // API endpoint not found - skip database update for now
        console.warn(`⚠️ BunnySync: API endpoint not found (404), skipping database update`);
        return 0;
      } else {
        console.error(`❌ BunnySync: Failed to update database: ${response.status}`);
        return 0;
      }
    } catch (error) {
      console.error(`❌ BunnySync: Database update error:`, error);
      // Continue without database update - don't break the sync
      return 0;
    }
  }

  /**
   * Extract clean video URL from various formats
   */
  private extractVideoUrl(videoUrl: string): string | null {
    if (!videoUrl) return null;

    // Handle BunnyCDN URLs
    if (videoUrl.includes('.m3u8')) {
      return videoUrl.split('?')[0]; // Remove query params
    }
    
    if (videoUrl.includes('b-cdn.net') || videoUrl.includes('video.bunnycdn.com')) {
      const videoId = videoUrl.split('/').pop()?.split('?')[0];
      if (videoId) {
        const host = videoUrl.includes('b-cdn.net') ? 
          videoUrl.split('/')[2] : 'video.bunnycdn.com';
        return `https://${host}/${videoId}/playlist.m3u8`;
      }
    }

    return videoUrl.split('?')[0]; // Return clean URL
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    cacheSize: number;
    cachedVideos: string[];
  } {
    return {
      cacheSize: this.syncCache.size,
      cachedVideos: Array.from(this.syncCache.keys())
    };
  }

  /**
   * Clear sync cache
   */
  clearCache(): void {
    this.syncCache.clear();
    console.log('🧹 BunnySync: Cache cleared');
  }

  /**
   * Background sync task - runs periodically
   */
  async backgroundSync(reels: any[], videos: any[]): Promise<void> {
    try {
      console.log('🔄 BunnySync: Starting background sync...');
      
      // Sync reels
      const { stats: reelStats } = await this.syncReels(reels);
      
      // Sync videos  
      const { stats: videoStats } = await this.syncVideos(videos);
      
      console.log('✅ BunnySync: Background sync complete!', {
        reels: reelStats,
        videos: videoStats
      });
      
    } catch (error) {
      console.error('❌ BunnySync: Background sync failed:', error);
    }
  }
}

// Singleton instance
export const bunnySyncCleanup = new BunnySyncCleanup();
export default bunnySyncCleanup;
