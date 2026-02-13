// ==================== ULTRA FAST PRELOADER ====================
// Pre-fetches next 3 reels with 5 chunks each for instant swipe
// Instagram-like zero waiting experience

interface PreloadedChunk {
  videoId: string;
  chunkIndex: number;
  url: string;
  data: Blob | null;
  isLoaded: boolean;
  timestamp: number;
}

interface PreloadedReel {
  videoId: string;
  url: string;
  chunks: Map<number, PreloadedChunk>;
  isFullyPreloaded: boolean;
  lastAccessed: number;
}

class UltraFastPreloader {
  private preloadedReels = new Map<string, PreloadedReel>();
  private readonly MAX_PRELOAD_REELS = 3; // Next 3 reels
  private readonly CHUNKS_PER_REEL = 5; // First 5 chunks only
  private readonly CHUNK_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB cache

  /**
   * Preload next reels with first 5 chunks each
   */
  async preloadNextReels(currentIndex: number, allReels: any[]): Promise<void> {
    const nextReels = allReels.slice(currentIndex + 1, currentIndex + 1 + this.MAX_PRELOAD_REELS);
    
    console.log(`🚀 UltraFastPreloader: Preloading ${nextReels.length} reels with ${this.CHUNKS_PER_REEL} chunks each`);
    
    // Preload in parallel for maximum speed
    const preloadPromises = nextReels.map((reel, index) => 
      this.preloadReelChunks(reel, index)
    );
    
    await Promise.allSettled(preloadPromises);
    this.cleanupOldCache();
  }

  /**
   * Preload first 5 chunks of a reel
   */
  private async preloadReelChunks(reel: any, priority: number): Promise<void> {
    const videoId = reel.id;
    const videoUrl = reel.video_url;
    
    // Skip if already preloaded
    if (this.preloadedReels.has(videoId)) {
      return;
    }

    console.log(`⚡ Preloading reel ${videoId} (priority ${priority})`);
    
    const preloadedReel: PreloadedReel = {
      videoId,
      url: videoUrl,
      chunks: new Map(),
      isFullyPreloaded: false,
      lastAccessed: Date.now()
    };

    // Extract HLS playlist URL
    const playlistUrl = this.extractPlaylistUrl(videoUrl);
    if (!playlistUrl) return;

    try {
      // Get HLS playlist to find chunk URLs
      const chunkUrls = await this.getChunkUrls(playlistUrl, this.CHUNKS_PER_REEL);
      
      // Preload first 5 chunks in parallel
      const chunkPromises = chunkUrls.map(async (chunkUrl, index) => {
        const chunk: PreloadedChunk = {
          videoId,
          chunkIndex: index,
          url: chunkUrl,
          data: null,
          isLoaded: false,
          timestamp: Date.now()
        };

        try {
          // Fetch chunk data with low priority
          const response = await fetch(chunkUrl, {
            headers: {
              'User-Agent': 'KronopApp-UltraFast',
              'Range': 'bytes=0-1048576' // Only first 1MB for instant start
            }
          });
          
          if (response.ok) {
            chunk.data = await response.blob();
            chunk.isLoaded = true;
            console.log(`✅ Chunk ${index} preloaded for ${videoId}`);
          }
        } catch (error) {
          console.warn(`❌ Failed to preload chunk ${index} for ${videoId}:`, error);
        }

        preloadedReel.chunks.set(index, chunk);
        return chunk;
      });

      await Promise.allSettled(chunkPromises);
      
      preloadedReel.isFullyPreloaded = true;
      this.preloadedReels.set(videoId, preloadedReel);
      
      console.log(`🎯 Reel ${videoId} preloaded with ${preloadedReel.chunks.size} chunks`);
      
    } catch (error) {
      console.error(`❌ Failed to preload reel ${videoId}:`, error);
    }
  }

  /**
   * Get preloaded chunk data instantly
   */
  getPreloadedChunk(videoId: string, chunkIndex: number): Blob | null {
    const reel = this.preloadedReels.get(videoId);
    if (!reel) return null;

    const chunk = reel.chunks.get(chunkIndex);
    if (!chunk || !chunk.isLoaded) return null;

    // Update last accessed time
    reel.lastAccessed = Date.now();
    
    console.log(`⚡ Serving preloaded chunk ${chunkIndex} for ${videoId} from cache`);
    return chunk.data;
  }

  /**
   * Check if reel is preloaded
   */
  isReelPreloaded(videoId: string): boolean {
    const reel = this.preloadedReels.get(videoId);
    return reel?.isFullyPreloaded || false;
  }

  /**
   * Extract playlist URL from video URL
   */
  private extractPlaylistUrl(videoUrl: string): string | null {
    // Convert BunnyCDN URL to playlist URL
    if (videoUrl.includes('.m3u8')) {
      return videoUrl;
    }
    
    // Handle BunnyCDN stream URLs
    if (videoUrl.includes('b-cdn.net') || videoUrl.includes('video.bunnycdn.com')) {
      const videoId = videoUrl.split('/').pop()?.split('?')[0];
      if (videoId) {
        const host = videoUrl.includes('b-cdn.net') ? 
          videoUrl.split('/')[2] : 'video.bunnycdn.com';
        return `https://${host}/${videoId}/playlist.m3u8`;
      }
    }
    
    return null;
  }

  /**
   * Get chunk URLs from HLS playlist
   */
  private async getChunkUrls(playlistUrl: string, maxChunks: number): Promise<string[]> {
    try {
      const response = await fetch(playlistUrl, {
        headers: {
          'User-Agent': 'KronopApp-UltraFast'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.status}`);
      }

      const playlist = await response.text();
      const chunkUrls: string[] = [];
      
      // Extract .ts chunk URLs from playlist
      const lines = playlist.split('\n');
      const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf('/') + 1);
      
      for (const line of lines) {
        if (line.trim().endsWith('.ts') && chunkUrls.length < maxChunks) {
          const chunkUrl = line.startsWith('http') ? line : baseUrl + line.trim();
          chunkUrls.push(chunkUrl);
        }
      }
      
      return chunkUrls;
    } catch (error) {
      console.error('❌ Failed to get chunk URLs:', error);
      return [];
    }
  }

  /**
   * Clean up old cache entries
   */
  private cleanupOldCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [videoId, reel] of this.preloadedReels.entries()) {
      // Delete old entries
      if (now - reel.lastAccessed > this.CHUNK_EXPIRY) {
        toDelete.push(videoId);
      }
    }
    
    // Delete old reels
    toDelete.forEach(videoId => {
      this.preloadedReels.delete(videoId);
      console.log(`🗑️ Cleaned up old reel: ${videoId}`);
    });
    
    // If still too much cache, delete oldest
    if (this.preloadedReels.size > this.MAX_PRELOAD_REELS) {
      const sortedReels = Array.from(this.preloadedReels.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const toDeleteMore = sortedReels.slice(0, sortedReels.length - this.MAX_PRELOAD_REELS);
      toDeleteMore.forEach(([videoId]) => {
        this.preloadedReels.delete(videoId);
        console.log(`🗑️ Cleaned up excess reel: ${videoId}`);
      });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalReels: number;
    totalChunks: number;
    cacheSize: string;
  } {
    let totalChunks = 0;
    let totalSize = 0;
    
    for (const reel of this.preloadedReels.values()) {
      totalChunks += reel.chunks.size;
      for (const chunk of reel.chunks.values()) {
        if (chunk.data) {
          totalSize += chunk.data.size;
        }
      }
    }
    
    return {
      totalReels: this.preloadedReels.size,
      totalChunks,
      cacheSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`
    };
  }
}

// Singleton instance
export const ultraFastPreloader = new UltraFastPreloader();
export default ultraFastPreloader;
