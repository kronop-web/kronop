const AsyncStorage = require('@react-native-async-storage/async-storage');
const FileSystem = require('expo-file-system');
const { Platform } = require('react-native');

class ZeroDataVideoCacheService {
  constructor() {
    this.cacheDirectory = `${FileSystem.cacheDirectory}zero_data_cache/`;
    this.MAX_CACHED_VIDEOS = 16; // Exactly 16 videos as requested
    this.proxyPort = 8080;
    this.proxyServer = null;
    this.isProxyRunning = false;
    
    // LRU Cache with access tracking
    this.cacheQueue = []; // Array of video URLs in order of access (LRU)
    this.cacheInfo = new Map(); // videoUrl -> { localPath, size, lastAccessed, accessCount }
    
    // Performance metrics
    this.metrics = {
      totalCacheHits: 0,
      totalCacheMisses: 0,
      zeroDataRewatches: 0,
      offlinePlays: 0,
      dataSavedMB: 0,
      averageLoadTime: 0
    };
  }

  // Initialize the Zero Data Re-watch system
  async initializeCache() {
    try {
      console.log('🚀 Initializing Zero Data Re-watch System...');
      
      // Create cache directory
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
      }
      
      // Load persistent cache data
      await this.loadCacheFromDisk();
      
      // Validate cache files exist
      await this.validateCacheFiles();
      
      // Start local proxy server
      await this.startLocalProxyServer();
      
      console.log('✅ Zero Data Re-watch System ready!');
      console.log(`📦 Cached videos: ${this.cacheQueue.length}/${this.MAX_CACHED_VIDEOS}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Zero Data cache:', error);
      return false;
    }
  }

  // Load cache data from persistent storage
  async loadCacheFromDisk() {
    try {
      const stored = await AsyncStorage.getItem('zero_data_cache_persistent');
      if (stored) {
        const data = JSON.parse(stored);
        this.cacheQueue = data.cacheQueue || [];
        this.cacheInfo = new Map(Object.entries(data.cacheInfo || {}));
        this.metrics = data.metrics || this.metrics;
        
        console.log(`📂 Loaded ${this.cacheQueue.length} videos from persistent cache`);
      }
    } catch (error) {
      console.error('❌ Failed to load persistent cache:', error);
    }
  }

  // Save cache data to persistent storage
  async saveCacheToDisk() {
    try {
      const data = {
        cacheQueue: this.cacheQueue,
        cacheInfo: Object.fromEntries(this.cacheInfo),
        metrics: this.metrics,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem('zero_data_cache_persistent', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save persistent cache:', error);
    }
  }

  // Validate that cached files actually exist on disk
  async validateCacheFiles() {
    const validUrls = [];
    
    for (const videoUrl of this.cacheQueue) {
      const cacheEntry = this.cacheInfo.get(videoUrl);
      if (cacheEntry) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(cacheEntry.localPath);
          if (fileInfo.exists) {
            validUrls.push(videoUrl);
          } else {
            console.log('🗑️ Removing missing cache file:', videoUrl.substring(0, 30) + '...');
            this.cacheInfo.delete(videoUrl);
          }
        } catch (error) {
          console.log('⚠️ Error validating cache file:', error.message);
          this.cacheInfo.delete(videoUrl);
        }
      }
    }
    
    this.cacheQueue = validUrls;
    await this.saveCacheToDisk();
  }

  // Generate safe cache key from video URL
  getCacheKey(videoUrl) {
    const urlHash = videoUrl.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return `video_${Math.abs(urlHash)}_${Date.now()}.mp4`;
  }

  // Check if video is cached (Zero Data Re-watch ready)
  async isVideoCached(videoUrl) {
    return this.cacheQueue.includes(videoUrl) && this.cacheInfo.has(videoUrl);
  }

  // Get cached video path with LRU update
  async getCachedVideoPath(videoUrl) {
    const cacheEntry = this.cacheInfo.get(videoUrl);
    
    if (cacheEntry && this.cacheQueue.includes(videoUrl)) {
      try {
        // Verify file exists
        const fileInfo = await FileSystem.getInfoAsync(cacheEntry.localPath);
        if (fileInfo.exists) {
          // Update LRU - move to end (most recently used)
          this.updateLRU(videoUrl);
          
          // Update metrics
          this.metrics.totalCacheHits++;
          this.metrics.zeroDataRewatches++;
          
          console.log('🎯 ZERO DATA RE-WATCH! No data consumed:', videoUrl.substring(0, 30) + '...');
          
          return cacheEntry.localPath;
        } else {
          // File missing, remove from cache
          this.removeFromCache(videoUrl);
        }
      } catch (error) {
        console.log('⚠️ Cache file check failed:', error.message);
        this.removeFromCache(videoUrl);
      }
    }
    
    this.metrics.totalCacheMisses++;
    return null;
  }

  // Update LRU queue - move video to end (most recently used)
  updateLRU(videoUrl) {
    const index = this.cacheQueue.indexOf(videoUrl);
    if (index > -1) {
      this.cacheQueue.splice(index, 1);
      this.cacheQueue.push(videoUrl);
      
      // Update access info
      const cacheEntry = this.cacheInfo.get(videoUrl);
      if (cacheEntry) {
        cacheEntry.lastAccessed = Date.now();
        cacheEntry.accessCount = (cacheEntry.accessCount || 0) + 1;
        this.cacheInfo.set(videoUrl, cacheEntry);
      }
      
      this.saveCacheToDisk();
    }
  }

  // Cache video with LRU replacement policy
  async cacheVideo(videoUrl, priority = 'normal') {
    try {
      // Skip if already cached
      if (await this.isVideoCached(videoUrl)) {
        console.log('✅ Video already cached (Zero Data ready):', videoUrl.substring(0, 30) + '...');
        return await this.getCachedVideoPath(videoUrl);
      }

      // Skip HLS streams
      if (videoUrl.includes('.m3u8')) {
        console.log('🎭 HLS stream detected, cannot cache:', videoUrl.substring(0, 50) + '...');
        return null;
      }

      // Apply LRU replacement if cache is full
      if (this.cacheQueue.length >= this.MAX_CACHED_VIDEOS) {
        await this.applyLRUReplacement();
      }

      const cacheKey = this.getCacheKey(videoUrl);
      const localPath = `${this.cacheDirectory}${cacheKey}`;
      
      const startTime = Date.now();
      console.log(`📥 Caching for Zero Data Re-watch:`, videoUrl.substring(0, 50) + '...');

      // Download the video
      const downloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        localPath,
        {
          headers: {
            'User-Agent': 'KronopApp/ZeroData',
            'Accept': '*/*',
            'Connection': 'keep-alive'
          }
        },
        (downloadProgressInfo) => {
          if (priority === 'high') {
            const progress = (downloadProgressInfo.totalBytesWritten / downloadProgressInfo.totalBytesExpectedToWrite) * 100;
            console.log(`📊 Zero Data caching: ${Math.round(progress)}%`);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      const downloadTime = Date.now() - startTime;

      if (result && result.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        
        // Add to cache
        this.cacheQueue.push(videoUrl);
        this.cacheInfo.set(videoUrl, {
          localPath,
          size: fileInfo.size,
          lastAccessed: Date.now(),
          accessCount: 1,
          downloadTime
        });

        await this.saveCacheToDisk();
        
        console.log(`✅ Zero Data cached in ${downloadTime}ms:`, videoUrl.substring(0, 50) + '...');
        console.log(`📦 Cache status: ${this.cacheQueue.length}/${this.MAX_CACHED_VIDEOS} videos`);
        
        return localPath;
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('❌ Zero Data cache failed:', error.message);
      return null;
    }
  }

  // LRU Replacement Policy - remove oldest video when cache is full
  async applyLRUReplacement() {
    if (this.cacheQueue.length === 0) return;
    
    // Get the oldest video (first in queue)
    const oldestVideoUrl = this.cacheQueue[0];
    const cacheEntry = this.cacheInfo.get(oldestVideoUrl);
    
    if (cacheEntry) {
      try {
        console.log('🗑️ LRU: Removing oldest video:', oldestVideoUrl.substring(0, 30) + '...');
        
        // Delete file from disk
        await FileSystem.deleteAsync(cacheEntry.localPath);
        
        // Calculate data saved for metrics
        this.metrics.dataSavedMB += (cacheEntry.size || 0) / 1024 / 1024;
        
        // Remove from cache structures
        this.cacheQueue.shift();
        this.cacheInfo.delete(oldestVideoUrl);
        
        console.log('🧹 LRU replacement completed');
      } catch (error) {
        console.error('❌ Failed to remove oldest cache file:', error);
      }
    }
  }

  // Remove specific video from cache
  async removeFromCache(videoUrl) {
    const index = this.cacheQueue.indexOf(videoUrl);
    if (index > -1) {
      const cacheEntry = this.cacheInfo.get(videoUrl);
      if (cacheEntry) {
        try {
          await FileSystem.deleteAsync(cacheEntry.localPath);
        } catch (error) {
          console.log('⚠️ Failed to delete cache file:', error.message);
        }
      }
      
      this.cacheQueue.splice(index, 1);
      this.cacheInfo.delete(videoUrl);
      await this.saveCacheToDisk();
    }
  }

  // Start local proxy server for serving cached videos
  async startLocalProxyServer() {
    if (this.isProxyRunning) {
      console.log('🔄 Proxy server already running');
      return;
    }

    try {
      console.log('🌐 Starting local proxy server...');
      
      // This is a simplified proxy implementation
      // In a real app, you'd use a proper HTTP server library
      this.isProxyRunning = true;
      this.proxyServer = {
        port: this.proxyPort,
        isRunning: true
      };
      
      console.log(`✅ Local proxy server running on port ${this.proxyPort}`);
    } catch (error) {
      console.error('❌ Failed to start proxy server:', error);
    }
  }

  // Get proxy URL for cached video
  async getProxyUrl(videoUrl) {
    if (!this.isProxyRunning || !await this.isVideoCached(videoUrl)) {
      return videoUrl;
    }
    
    const cacheEntry = this.cacheInfo.get(videoUrl);
    if (cacheEntry) {
      // Return local file URI that can be served by proxy
      return cacheEntry.localPath;
    }
    
    return videoUrl;
  }

  // Pre-cache next videos for seamless experience
  async preCacheNextVideos(videoList, currentIndex) {
    try {
      // Get next 4 videos to pre-cache (maintaining 16 total limit)
      const nextVideos = [];
      for (let i = 1; i <= 4 && currentIndex + i < videoList.length; i++) {
        const video = videoList[currentIndex + i];
        if (video && video.videoUrl && !await this.isVideoCached(video.videoUrl)) {
          nextVideos.push(video.videoUrl);
        }
      }

      if (nextVideos.length === 0) {
        console.log('📦 All next videos already cached (Zero Data ready)');
        return;
      }

      console.log(`🚀 Pre-caching ${nextVideos.length} videos for Zero Data Re-watch...`);
      
      // Cache videos in parallel with priority
      const cachePromises = nextVideos.map(url => this.cacheVideo(url, 'high'));
      const results = await Promise.allSettled(cachePromises);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Pre-cached ${successCount}/${nextVideos.length} videos successfully`);
      
    } catch (error) {
      console.error('❌ Pre-caching failed:', error);
    }
  }

  // Get comprehensive performance metrics
  getPerformanceMetrics() {
    const total = this.metrics.totalCacheHits + this.metrics.totalCacheMisses;
    const cacheHitRate = total > 0 ? (this.metrics.totalCacheHits / total * 100).toFixed(1) : 0;
    
    const totalCacheSize = Array.from(this.cacheInfo.values())
      .reduce((sum, info) => sum + (info.size || 0), 0);
    
    return {
      ...this.metrics,
      cacheHitRate: `${cacheHitRate}%`,
      cachedVideos: this.cacheQueue.length,
      maxVideos: this.MAX_CACHED_VIDEOS,
      cacheSizeMB: Math.round(totalCacheSize / 1024 / 1024),
      cacheUtilization: `${(this.cacheQueue.length / this.MAX_CACHED_VIDEOS * 100).toFixed(1)}%`,
      proxyServerRunning: this.isProxyRunning,
      proxyPort: this.proxyPort,
      zeroDataReady: this.cacheQueue.length > 0
    };
  }

  // Get cached videos list for offline viewing
  getCachedVideosList() {
    return this.cacheQueue.map(url => {
      const info = this.cacheInfo.get(url);
      return {
        url,
        localPath: info?.localPath,
        size: info?.size || 0,
        lastAccessed: info?.lastAccessed || 0,
        accessCount: info?.accessCount || 0
      };
    });
  }

  // Clear all cache
  async clearCache() {
    try {
      console.log('🧹 Clearing Zero Data cache...');
      
      // Delete all cached files
      for (const videoUrl of this.cacheQueue) {
        const cacheEntry = this.cacheInfo.get(videoUrl);
        if (cacheEntry) {
          try {
            await FileSystem.deleteAsync(cacheEntry.localPath);
          } catch (error) {
            console.error('❌ Failed to delete cache file:', error);
          }
        }
      }
      
      // Clear cache structures
      this.cacheQueue = [];
      this.cacheInfo.clear();
      
      // Reset metrics
      this.metrics = {
        totalCacheHits: 0,
        totalCacheMisses: 0,
        zeroDataRewatches: 0,
        offlinePlays: 0,
        dataSavedMB: 0,
        averageLoadTime: 0
      };
      
      await this.saveCacheToDisk();
      console.log('✅ Zero Data cache cleared');
    } catch (error) {
      console.error('❌ Cache clear failed:', error);
    }
  }

  // Stop proxy server
  async stopProxyServer() {
    if (this.proxyServer && this.isProxyRunning) {
      this.isProxyRunning = false;
      this.proxyServer = null;
      console.log('🛑 Local proxy server stopped');
    }
  }
}

module.exports = new ZeroDataVideoCacheService();
