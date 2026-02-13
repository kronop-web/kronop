// Video Chunking and Streaming Optimization Service
// Reduces memory usage and data consumption for 100M+ users

interface VideoChunk {
  url: string;
  start: number;
  end: number;
  index: number;
  loaded: boolean;
  blob?: Blob;
}

interface ChunkConfig {
  chunkSize: number; // 0.5MB chunks for ultra-fast loading
  chunkDuration: number; // 0.066 seconds per chunk (15 chunks per second)
  preloadChunks: number; // Preload next 10 chunks
  maxMemoryChunks: number; // Max chunks in memory
  qualityLevels: string[]; // Available quality levels
  instantPlayThreshold: number; // First chunk instant play
  fixedQuality: string; // FIXED HD QUALITY - No switching
}

class VideoChunkingService {
  private static instance: VideoChunkingService;
  private config: ChunkConfig = {
    chunkSize: 0.5 * 1024 * 1024, // 0.5MB for ultra-fast loading
    chunkDuration: 0.066, // 0.066 seconds per chunk (15 chunks per second)
    preloadChunks: 10, // Preload next 10 chunks
    maxMemoryChunks: 25, // More chunks for ultra-smooth playback
    qualityLevels: ['1080p'], // FIXED HD QUALITY ONLY
    instantPlayThreshold: 1, // First chunk instant play
    fixedQuality: '1080p' // LOCKED TO HD - No switching
  };
  
  private activeStreams: Map<string, {
    chunks: Map<number, VideoChunk>;
    currentChunk: number;
    totalChunks: number;
    videoUrl: string;
    quality: string;
  }> = new Map();

  private memoryUsage: number = 0;
  private networkSpeed: number = 0; // bps

  static getInstance(): VideoChunkingService {
    if (!VideoChunkingService.instance) {
      VideoChunkingService.instance = new VideoChunkingService();
    }
    return VideoChunkingService.instance;
  }

  // Initialize video streaming
  async initializeStream(videoId: string, videoUrl: string, quality: string = '1080p'): Promise<void> {
    try {
      console.log(`🎬 Initializing ULTRA-FAST stream for ${videoId} at FIXED HD (1080p)`);

      // Get video metadata
      const metadata = await this.getVideoMetadata(videoUrl);
      // ULTRA-FAST MATH: 15 chunks per second (0.066s each)
      const totalChunks = Math.ceil(metadata.duration / this.config.chunkDuration); // 30s * 15 = 450 chunks

      const stream = {
        chunks: new Map<number, VideoChunk>(),
        currentChunk: 0,
        totalChunks,
        videoUrl,
        quality: this.config.fixedQuality // FORCE HD QUALITY
      };

      // Create chunk URLs
      for (let i = 0; i < totalChunks; i++) {
        const chunk: VideoChunk = {
          url: this.createChunkUrl(videoUrl, i, this.config.fixedQuality),
          start: i * this.config.chunkDuration,
          end: Math.min((i + 1) * this.config.chunkDuration, metadata.duration),
          index: i,
          loaded: false
        };
        stream.chunks.set(i, chunk);
      }

      this.activeStreams.set(videoId, stream);

      // Preload first few chunks
      await this.preloadInitialChunks(videoId);

      console.log(`✅ Stream initialized: ${totalChunks} chunks for ${videoId}`);

    } catch (error) {
      console.error(`❌ Error initializing stream for ${videoId}:`, error);
      throw error;
    }
  }

  // Get video metadata
  private async getVideoMetadata(videoUrl: string): Promise<{ duration: number; size: number }> {
    // In a real implementation, you'd use ffprobe or similar
    // For now, return mock data for 30 second reel
    return {
      duration: 30, // 30 seconds for reels
      size: 10 * 1024 * 1024 // 10MB
    };
  }

  // Create chunk URL with range parameters
  private createChunkUrl(videoUrl: string, chunkIndex: number, quality: string): string {
    const separator = videoUrl.includes('?') ? '&' : '?';
    
    // ULTRA-FAST: 0.066 second chunks (15 chunks per second)
    const startTime = chunkIndex * this.config.chunkDuration;
    const endTime = (chunkIndex + 1) * this.config.chunkDuration;
    
    // Add chunk parameters for CDN with ultra-fast loading
    return `${videoUrl}${separator}chunk=${chunkIndex}&quality=${this.config.fixedQuality}&start=${startTime}&end=${endTime}&instant=${chunkIndex === 0}&hd=locked`;
  }

  // Preload initial chunks
  private async preloadInitialChunks(videoId: string): Promise<void> {
    const stream = this.activeStreams.get(videoId);
    if (!stream) return;

    const preloadCount = Math.min(this.config.preloadChunks, stream.totalChunks);
    
    // INSTANT PLAY: Load first chunk immediately
    const firstChunk = stream.chunks.get(0);
    if (firstChunk && !firstChunk.loaded) {
      console.log(`⚡ INSTANT PLAY: Loading first chunk for ${videoId}`);
      await this.loadChunk(videoId, 0);
    }
    
    // Preload remaining chunks in parallel
    const preloadPromises = [];
    for (let i = 1; i < preloadCount; i++) {
      preloadPromises.push(this.loadChunk(videoId, i));
    }
    
    await Promise.allSettled(preloadPromises);
    console.log(`📦 Loaded ${preloadCount} chunks for ${videoId}`);
  }

  // Load individual chunk
  private async loadChunk(videoId: string, chunkIndex: number): Promise<void> {
    const stream = this.activeStreams.get(videoId);
    if (!stream) return;

    const chunk = stream.chunks.get(chunkIndex);
    if (!chunk || chunk.loaded) return;

    try {
      // Check memory usage before loading
      if (this.memoryUsage > this.config.maxMemoryChunks * this.config.chunkSize) {
        await this.cleanupOldChunks(videoId);
      }

      // Fetch chunk data
      const response = await fetch(chunk.url, {
        headers: {
          'Range': `bytes=${chunk.start * 1000}-${chunk.end * 1000}` // Approximate
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        chunk.blob = blob;
        chunk.loaded = true;
        
        this.memoryUsage += blob.size;
        
        console.log(`📦 Loaded chunk ${chunkIndex} for ${videoId} (${blob.size} bytes)`);
      }

    } catch (error) {
      console.error(`❌ Error loading chunk ${chunkIndex} for ${videoId}:`, error);
    }
  }

  // Get chunk for playback
  async getChunk(videoId: string, chunkIndex: number): Promise<VideoChunk | null> {
    const stream = this.activeStreams.get(videoId);
    if (!stream) return null;

    let chunk = stream.chunks.get(chunkIndex);
    
    if (!chunk) return null;

    // Load chunk if not loaded
    if (!chunk.loaded) {
      await this.loadChunk(videoId, chunkIndex);
      chunk = stream.chunks.get(chunkIndex);
    }

    // Preload next chunks
    if (chunk && chunk.loaded) {
      this.preloadNextChunks(videoId, chunkIndex);
    }

    return chunk || null;
  }

  // Preload next chunks
  private async preloadNextChunks(videoId: string, currentChunkIndex: number): Promise<void> {
    const stream = this.activeStreams.get(videoId);
    if (!stream) return;

    for (let i = 1; i <= this.config.preloadChunks; i++) {
      const nextChunkIndex = currentChunkIndex + i;
      
      if (nextChunkIndex < stream.totalChunks) {
        const nextChunk = stream.chunks.get(nextChunkIndex);
        if (nextChunk && !nextChunk.loaded) {
          // Load in background without blocking
          this.loadChunk(videoId, nextChunkIndex).catch(console.error);
        }
      }
    }
  }

  // Cleanup old chunks to free memory
  private async cleanupOldChunks(videoId: string): Promise<void> {
    const stream = this.activeStreams.get(videoId);
    if (!stream) return;

    // Find chunks far from current position
    const chunksToCleanup: VideoChunk[] = [];
    
    for (const [index, chunk] of stream.chunks.entries()) {
      const distance = Math.abs(index - stream.currentChunk);
      
      if (distance > 5 && chunk.loaded && chunk.blob) {
        chunksToCleanup.push(chunk);
      }
    }

    // Cleanup chunks
    for (const chunk of chunksToCleanup) {
      if (chunk.blob) {
        this.memoryUsage -= chunk.blob.size;
        chunk.blob = undefined;
        chunk.loaded = false;
        
        console.log(`🗑️ Cleaned up chunk ${chunk.index} for ${videoId}`);
      }
    }
  }

  // Update current chunk position
  updateCurrentChunk(videoId: string, chunkIndex: number): void {
    const stream = this.activeStreams.get(videoId);
    if (stream) {
      stream.currentChunk = chunkIndex;
      
      // Trigger cleanup for distant chunks
      if (chunkIndex % 5 === 0) { // Every 5 chunks
        this.cleanupOldChunks(videoId).catch(console.error);
      }
    }
  }

  // FIXED QUALITY - No adaptation based on network speed
  async adaptQuality(videoId: string, networkSpeed: number): Promise<string> {
    this.networkSpeed = networkSpeed;
    
    const stream = this.activeStreams.get(videoId);
    if (!stream) return this.config.fixedQuality;

    // QUALITY LOCKED TO HD - No switching based on network
    console.log(`🔒 Quality LOCKED to ${this.config.fixedQuality} - Network speed: ${networkSpeed} bps`);
    
    // Only reinitialize if somehow quality changed (should never happen)
    if (stream.quality !== this.config.fixedQuality) {
      console.log(`� Fixing quality from ${stream.quality} to ${this.config.fixedQuality}`);
      await this.reinitializeStream(videoId, this.config.fixedQuality);
    }

    return this.config.fixedQuality;
  }

  // Reinitialize stream with new quality
  private async reinitializeStream(videoId: string, newQuality: string): Promise<void> {
    const stream = this.activeStreams.get(videoId);
    if (!stream) return;

    const oldQuality = stream.quality;
    stream.quality = newQuality;

    // Update chunk URLs with new quality
    for (const [index, chunk] of stream.chunks.entries()) {
      chunk.url = this.createChunkUrl(stream.videoUrl, index, newQuality);
      chunk.loaded = false;
      chunk.blob = undefined;
    }

    // Reset memory usage
    this.memoryUsage = 0;

    // Preload chunks around current position
    await this.loadChunk(videoId, stream.currentChunk);
    await this.preloadNextChunks(videoId, stream.currentChunk);

    console.log(`✅ Reinitialized stream for ${videoId} with ${newQuality}`);
  }

  // Get streaming statistics
  getStreamStats(videoId: string): any {
    const stream = this.activeStreams.get(videoId);
    if (!stream) return null;

    const loadedChunks = Array.from(stream.chunks.values()).filter(c => c.loaded);
    
    return {
      totalChunks: stream.totalChunks,
      loadedChunks: loadedChunks.length,
      currentChunk: stream.currentChunk,
      quality: stream.quality,
      memoryUsage: this.memoryUsage,
      networkSpeed: this.networkSpeed,
      progress: (loadedChunks.length / stream.totalChunks) * 100
    };
  }

  // Cleanup stream
  async cleanupStream(videoId: string): Promise<void> {
    const stream = this.activeStreams.get(videoId);
    if (!stream) return;

    // Clear all chunk data
    for (const chunk of stream.chunks.values()) {
      if (chunk.blob) {
        this.memoryUsage -= chunk.blob.size;
      }
    }

    // Remove stream
    this.activeStreams.delete(videoId);
    
    console.log(`🧹 Cleaned up stream for ${videoId}`);
  }


  // Update configuration
  updateConfig(newConfig: Partial<ChunkConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Chunking config updated:', this.config);
  }

  // Estimate bandwidth usage
  estimateBandwidth(videoId: string, duration: number): number {
    const stream = this.activeStreams.get(videoId);
    if (!stream) return 0;

    const qualityBitrates = {
      '360p': 500 * 1024,    // 500 kbps
      '480p': 1000 * 1024,   // 1 Mbps
      '720p': 2500 * 1024,   // 2.5 Mbps
      '1080p': 5000 * 1024   // 5 Mbps
    };

    const bitrate = qualityBitrates[stream.quality as keyof typeof qualityBitrates] || 1000 * 1024;
    return (bitrate * duration) / 8; // Convert to bytes
  }

  // Get memory usage in MB
  getMemoryUsage(): number {
    return this.memoryUsage / (1024 * 1024); // Convert bytes to MB
  }

  // Cleanup all streams
  cleanupAllStreams(): void {
    console.log('🧹 Cleaning up all video streams...');
    
    for (const videoId of this.activeStreams.keys()) {
      this.cleanupStream(videoId);
    }
    
    this.memoryUsage = 0;
    console.log('✅ All video streams cleaned up');
  }
}

export const videoChunkingService = VideoChunkingService.getInstance();
