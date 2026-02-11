// Sliding Window Manager for 3 Reels Buffer
// Optimized for performance with minimal memory usage

interface ReelItem {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  player?: any; // Video player instance
  isLoaded: boolean;
  isLoading: boolean;
  lastAccessed: number;
}

interface WindowConfig {
  windowSize: number; // 3 reels only
  preloadAhead: number; // Preload next 1
  unloadBehind: number; // Unload last 1
  memoryThreshold: number; // MB
}

class SlidingWindowManager {
  private static instance: SlidingWindowManager;
  private window: Map<string, ReelItem> = new Map();
  private currentIndex: number = 0;
  private config: WindowConfig = {
    windowSize: 3,
    preloadAhead: 1,
    unloadBehind: 1,
    memoryThreshold: 50 // 50MB
  };
  
  private memoryUsage: number = 0;
  private cleanupQueue: string[] = [];
  private isCleanupRunning: boolean = false;

  static getInstance(): SlidingWindowManager {
    if (!SlidingWindowManager.instance) {
      SlidingWindowManager.instance = new SlidingWindowManager();
    }
    return SlidingWindowManager.instance;
  }

  // Initialize sliding window with custom window size
  initialize(reels: any[], startIndex: number = 0, windowSize: number = 3) {
    this.currentIndex = startIndex;
    this.window.clear();
    this.memoryUsage = 0;
    
    // Override config with custom window size
    this.config.windowSize = windowSize;
    this.config.preloadAhead = 1;
    this.config.unloadBehind = 1;

    // Load initial window
    const endIndex = Math.min(startIndex + this.config.windowSize, reels.length);
    for (let i = startIndex; i < endIndex; i++) {
      this.addToWindow(reels[i], i);
    }

    console.log(`🪟 Sliding window initialized: ${this.window.size} reels loaded`);
  }

  // Add reel to window
  private addToWindow(reel: any, index: number) {
    const reelItem: ReelItem = {
      id: reel.id,
      videoUrl: reel.video_url,
      thumbnailUrl: reel.thumbnail_url,
      isLoaded: false,
      isLoading: false,
      lastAccessed: Date.now()
    };

    this.window.set(reel.id, reelItem);
  }

  // Get reel from window
  getReel(reelId: string): ReelItem | null {
    const reel = this.window.get(reelId);
    if (reel) {
      reel.lastAccessed = Date.now();
      return reel;
    }
    return null;
  }

  // Move window forward
  async moveWindow(newIndex: number, allReels: any[]): Promise<void> {
    if (newIndex === this.currentIndex) return;

    const oldIndex = this.currentIndex;
    this.currentIndex = newIndex;

    // Calculate new window bounds
    const windowStart = Math.max(0, newIndex - 10); // Keep 10 behind
    const windowEnd = Math.min(allReels.length, newIndex + this.config.windowSize - 10);

    console.log(`🪟 Moving window from ${oldIndex} to ${newIndex}`);

    // Add new reels to window
    for (let i = windowStart; i < windowEnd; i++) {
      if (!this.window.has(allReels[i].id)) {
        this.addToWindow(allReels[i], i);
      }
    }

    // Queue old reels for cleanup
    this.queueCleanup(allReels, windowStart, windowEnd);

    // Run cleanup in background
    this.runBackgroundCleanup();

    console.log(`🪟 Window updated: ${this.window.size} reels in memory`);
  }

  // Queue reels for cleanup
  private queueCleanup(allReels: any[], windowStart: number, windowEnd: number) {
    // Find reels outside the new window
    const windowIds = new Set();
    for (let i = windowStart; i < windowEnd; i++) {
      windowIds.add(allReels[i].id);
    }

    // Queue reels not in window for cleanup
    for (const [reelId, reel] of this.window.entries()) {
      if (!windowIds.has(reelId)) {
        this.cleanupQueue.push(reelId);
      }
    }
  }

  // Run background cleanup
  private async runBackgroundCleanup(): Promise<void> {
    if (this.isCleanupRunning || this.cleanupQueue.length === 0) return;

    this.isCleanupRunning = true;

    // Process cleanup queue in batches
    const batchSize = 5;
    while (this.cleanupQueue.length > 0) {
      const batch = this.cleanupQueue.splice(0, batchSize);
      
      await Promise.all(
        batch.map(reelId => this.cleanupReel(reelId))
      );

      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isCleanupRunning = false;
    console.log(`🧹 Background cleanup completed`);
  }

  // Cleanup individual reel
  private async cleanupReel(reelId: string): Promise<void> {
    const reel = this.window.get(reelId);
    if (!reel) return;

    try {
      // Destroy video player if exists
      if (reel.player) {
        if (typeof reel.player.unload === 'function') {
          await reel.player.unload();
        } else if (typeof reel.player.release === 'function') {
          await reel.player.release();
        }
        reel.player = null;
      }

      // Remove from window
      this.window.delete(reelId);
      
      console.log(`🗑️ Cleaned up reel: ${reelId}`);
    } catch (error) {
      console.error(`❌ Error cleaning up reel ${reelId}:`, error);
    }
  }

  // Attach video player to reel
  attachPlayer(reelId: string, player: any): void {
    const reel = this.window.get(reelId);
    if (reel) {
      // Cleanup old player if exists
      if (reel.player) {
        this.cleanupReel(reelId);
      }
      
      reel.player = player;
      reel.isLoaded = true;
      reel.isLoading = false;
    }
  }


  // Get window statistics
  getStats(): any {
    return {
      windowSize: this.window.size,
      currentIndex: this.currentIndex,
      memoryUsage: this.memoryUsage,
      cleanupQueue: this.cleanupQueue.length,
      isCleanupRunning: this.isCleanupRunning,
      loadedReels: Array.from(this.window.values()).filter(r => r.isLoaded).length,
      reelsWithPlayers: Array.from(this.window.values()).filter(r => r.player).length
    };
  }

  // Preload next reels
  async preloadNext(reels: any[], currentIndex: number): Promise<void> {
    const preloadCount = this.config.preloadAhead;
    const startIndex = currentIndex + 1;
    const endIndex = Math.min(startIndex + preloadCount, reels.length);

    for (let i = startIndex; i < endIndex; i++) {
      const reel = reels[i];
      const reelItem = this.window.get(reel.id);
      
      if (reelItem && !reelItem.isLoaded && !reelItem.isLoading) {
        reelItem.isLoading = true;
        
        // Preload thumbnail
        try {
          await this.preloadThumbnail(reelItem.thumbnailUrl);
          reelItem.isLoading = false;
        } catch (error) {
          console.error(`❌ Error preloading reel ${reel.id}:`, error);
          reelItem.isLoading = false;
        }
      }
    }
  }

  // Preload thumbnail
  private async preloadThumbnail(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use expo-image prefetch for thumbnails
      try {
        // Dynamic import to avoid bundling issues
        import('expo-image').then(({ Image }) => {
          if (Image && typeof Image.prefetch === 'function') {
            Image.prefetch(url)
              .then(() => resolve())
              .catch(reject);
          } else {
            // Fallback - just resolve
            setTimeout(resolve, 100);
          }
        }).catch(() => {
          // Fallback if import fails
          setTimeout(resolve, 100);
        });
      } catch (error) {
        setTimeout(resolve, 100);
      }
    });
  }

  // Clear all (for logout/memory cleanup)
  async clearAll(): Promise<void> {
    console.log('🧹 Clearing sliding window...');
    
    // Cleanup all reels
    const cleanupPromises = Array.from(this.window.keys()).map(reelId => 
      this.cleanupReel(reelId)
    );
    
    await Promise.all(cleanupPromises);
    
    // Clear state
    this.window.clear();
    this.cleanupQueue = [];
    this.currentIndex = 0;
    this.memoryUsage = 0;
    this.isCleanupRunning = false;
    
    console.log('✅ Sliding window cleared');
  }

  // Get memory usage in MB
  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  // Force cleanup to free memory
  forceCleanup(): void {
    console.log('🧹 Force cleanup triggered...');
    
    // Keep only current video
    const toDelete: string[] = [];
    for (const [reelId, reel] of this.window.entries()) {
      const distance = Math.abs(reel.lastAccessed - Date.now());
      
      // Remove videos not accessed in last 30 seconds
      if (distance > 30000) {
        toDelete.push(reelId);
      }
    }
    
    toDelete.forEach(reelId => {
      this.cleanupReel(reelId);
    });
    
    console.log(`🧹 Force cleanup: removed ${toDelete.length} reels`);
  }

  // Update configuration
  updateConfig(newConfig: Partial<WindowConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Sliding window config updated:', this.config);
  }
}

export const slidingWindowManager = SlidingWindowManager.getInstance();
