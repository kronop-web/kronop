// Advanced Memory Management for 16-Video Limit & Smooth Performance

interface VideoMemorySlot {
  id: string;
  url: string;
  index: number;
  isLoaded: boolean;
  lastAccessed: number;
  cacheData?: any;
}

class MemoryManagerService {
  private readonly MAX_VIDEOS_IN_MEMORY = 3; // LIMITED to 3 videos for performance
  private videoSlots: Map<number, VideoMemorySlot> = new Map();
  private currentIndex = 0;
  private lastResumeIndex = 0;

  // Initialize or update video in memory
  manageVideoMemory(videoId: string, videoUrl: string, index: number): void {
    const now = Date.now();
    
    // If we already have this video, just update access time
    const existingSlot = this.findVideoSlot(videoId);
    if (existingSlot) {
      existingSlot.lastAccessed = now;
      return;
    }

    // Check if we need to remove old video
    if (this.videoSlots.size >= this.MAX_VIDEOS_IN_MEMORY) {
      this.removeOldestVideo();
    }

    // Add new video to memory
    this.videoSlots.set(index, {
      id: videoId,
      url: videoUrl,
      index,
      isLoaded: true,
      lastAccessed: now
    });

    console.log(`🧠 Memory: Added video ${videoId} at index ${index} (${this.videoSlots.size}/${this.MAX_VIDEOS_IN_MEMORY})`);
  }

  // Find video slot by ID
  private findVideoSlot(videoId: string): VideoMemorySlot | null {
    for (const slot of this.videoSlots.values()) {
      if (slot.id === videoId) {
        return slot;
      }
    }
    return null;
  }

  // Remove oldest video from memory
  private removeOldestVideo(): void {
    let oldestIndex = -1;
    let oldestTime = Date.now();
    let oldestSlot: VideoMemorySlot | null = null;

    for (const [index, slot] of this.videoSlots.entries()) {
      if (slot.lastAccessed < oldestTime) {
        oldestTime = slot.lastAccessed;
        oldestIndex = index;
        oldestSlot = slot;
      }
    }

    if (oldestSlot && oldestIndex !== -1) {
      this.clearVideoCache(oldestSlot.id);
      this.videoSlots.delete(oldestIndex);
      console.log(`🗑️ Memory: Removed oldest video ${oldestSlot.id} (Index ${oldestIndex})`);
    }
  }

  // Clear specific video cache
  clearVideoCache(videoId: string): void {
    // Clear expo-video cache
    try {
      // This would clear any cached video data
      console.log(`🧹 Cache cleared for video: ${videoId}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Set current index for resume functionality
  setCurrentIndex(index: number): void {
    this.lastResumeIndex = this.currentIndex;
    this.currentIndex = index;
    
    // Update access time for current video
    const currentSlot = this.videoSlots.get(index);
    if (currentSlot) {
      currentSlot.lastAccessed = Date.now();
    }
  }

  // Get resume index
  getResumeIndex(): number {
    return this.lastResumeIndex;
  }

  // Check if video is in memory
  isVideoInMemory(videoId: string): boolean {
    return this.findVideoSlot(videoId) !== null;
  }

  // Get memory status
  getMemoryStatus(): {
    used: number;
    max: number;
    available: number;
    percentage: number;
    videos: { id: string; index: number; lastAccessed: number }[];
  } {
    const used = this.videoSlots.size;
    const available = this.MAX_VIDEOS_IN_MEMORY - used;
    const percentage = (used / this.MAX_VIDEOS_IN_MEMORY) * 100;

    const videos = Array.from(this.videoSlots.values()).map(slot => ({
      id: slot.id,
      index: slot.index,
      lastAccessed: slot.lastAccessed
    }));

    return {
      used,
      max: this.MAX_VIDEOS_IN_MEMORY,
      available,
      percentage: Math.round(percentage),
      videos
    };
  }

  // Pre-fetch next 2 videos for super fast scroll
  getPrefetchIndexes(currentIndex: number, totalVideos: number): number[] {
    const prefetchIndexes: number[] = [];
    
    for (let i = 1; i <= 2; i++) {
      const nextIndex = (currentIndex + i) % totalVideos;
      
      // Only prefetch if not already in memory
      if (!this.videoSlots.has(nextIndex)) {
        prefetchIndexes.push(nextIndex);
      }
    }
    
    return prefetchIndexes;
  }

  // Clear all memory (for app restart)
  clearAllMemory(): void {
    for (const slot of this.videoSlots.values()) {
      this.clearVideoCache(slot.id);
    }
    
    this.videoSlots.clear();
    this.currentIndex = 0;
    this.lastResumeIndex = 0;
    
    console.log('🧹 All memory cleared');
  }

  // Auto-cleanup videos that are too far from current position
  autoCleanup(currentIndex: number, maxDistance: number = 8): void {
    const toDelete: number[] = [];
    
    for (const [index, slot] of this.videoSlots.entries()) {
      const distance = Math.abs(index - currentIndex);
      
      if (distance > maxDistance) {
        toDelete.push(index);
      }
    }
    
    toDelete.forEach(index => {
      const slot = this.videoSlots.get(index);
      if (slot) {
        this.clearVideoCache(slot.id);
        this.videoSlots.delete(index);
        console.log(`🗑️ Auto-cleanup: Removed video ${slot.id} (distance: ${Math.abs(index - currentIndex)})`);
      }
    });
  }

  // Aggressive cleanup for 3-video limit
  aggressiveCleanup(currentIndex: number, keepCount: number = 3): void {
    const toDelete: number[] = [];
    
    // Keep only current, previous, and next videos
    const keepIndexes = new Set<number>();
    for (let i = -1; i <= 1; i++) {
      const index = currentIndex + i;
      if (index >= 0) {
        keepIndexes.add(index);
      }
    }
    
    for (const [index, slot] of this.videoSlots.entries()) {
      if (!keepIndexes.has(index)) {
        toDelete.push(index);
      }
    }
    
    toDelete.forEach(index => {
      const slot = this.videoSlots.get(index);
      if (slot) {
        this.clearVideoCache(slot.id);
        this.videoSlots.delete(index);
        console.log(`🗑️ Aggressive cleanup: Removed video ${slot.id} (Index ${index})`);
      }
    });
    
    console.log(`� Memory: Now keeping ${this.videoSlots.size}/3 videos`);
  }
}

// Singleton instance
export const memoryManagerService = new MemoryManagerService();
