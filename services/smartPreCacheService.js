const AsyncStorage = require('@react-native-async-storage/async-storage');
const FileSystem = require('expo-file-system');

class SmartPreCacheService {
  constructor() {
    this.cacheDirectory = `${FileSystem.cacheDirectory}video_cache/`;
    this.maxCacheSize = 200 * 1024 * 1024; // 200MB
    this.preFetchQueue = [];
    this.isPreFetching = false;
    this.currentPlayingIndex = -1;
    this.cacheInfo = new Map(); // videoUrl -> { localPath, size, lastAccessed }
    this.performanceMetrics = {
      totalCacheHits: 0,
      totalCacheMisses: 0,
      averageLoadTime: 0,
      preFetchSuccess: 0,
      preFetchFailed: 0
    };
  }

  // Initialize cache directory
  async initializeCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
      }
      await this.loadCacheInfo();
      await this.cleanupOldCache();
      console.log('🚀 Smart Pre-cache Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize cache:', error);
      return false;
    }
  }

  // Load cache info from storage
  async loadCacheInfo() {
    try {
      const stored = await AsyncStorage.getItem('video_cache_info');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cacheInfo = new Map(Object.entries(parsed));
        console.log(`📦 Loaded ${this.cacheInfo.size} cached videos`);
      }
    } catch (error) {
      console.error('❌ Failed to load cache info:', error);
    }
  }

  // Save cache info to storage
  async saveCacheInfo() {
    try {
      const obj = Object.fromEntries(this.cacheInfo);
      await AsyncStorage.setItem('video_cache_info', JSON.stringify(obj));
    } catch (error) {
      console.error('❌ Failed to save cache info:', error);
    }
  }

  // Generate cache key from video URL
  getCacheKey(videoUrl) {
    // Create a safe filename from URL
    return videoUrl
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 100) + '.mp4';
  }

  // Check if video is cached
  async isVideoCached(videoUrl) {
    const cacheKey = this.getCacheKey(videoUrl);
    const cacheEntry = this.cacheInfo.get(videoUrl);
    
    if (!cacheEntry) return false;
    
    // Verify file still exists
    const localPath = `${this.cacheDirectory}${cacheKey}`;
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    return fileInfo.exists;
  }

  // Get cached video path with partial download support
  async getCachedVideoPath(videoUrl) {
    const cacheInfo = this.cacheInfo.get(videoUrl);
    
    if (cacheInfo) {
      // Check if file exists (even partial downloads)
      try {
        const fileInfo = await FileSystem.getInfoAsync(cacheInfo.uri);
        if (fileInfo.exists) {
          // Update last accessed time
          cacheInfo.lastAccessed = Date.now();
          this.cacheInfo.set(videoUrl, cacheInfo);
          
          console.log(`🎯 Using ${cacheInfo.isPartial ? 'partial' : 'full'} cached video`);
          this.performanceMetrics.cacheHits++;
          return cacheInfo.uri;
        } else {
          // File doesn't exist, remove from cache
          this.cacheInfo.delete(videoUrl);
        }
      } catch (error) {
        console.log('⚠️ Cache file check failed:', error.message);
        this.cacheInfo.delete(videoUrl);
      }
    }
    
    this.performanceMetrics.cacheMisses++;
    return null;
  }

  // Cache a video file
  async cacheVideo(videoUrl, priority = 'normal') {
    try {
      // Skip HLS streams - they cannot be cached locally
      if (videoUrl.includes('.m3u8')) {
        console.log('🎭 HLS stream detected, skipping cache:', videoUrl.substring(0, 50) + '...');
        return null; // Let original HLS stream play directly
      }
      
      const isCached = await this.isVideoCached(videoUrl);
      if (isCached) {
        console.log('✅ Video already cached:', videoUrl.substring(0, 50) + '...');
        return await this.getCachedVideoPath(videoUrl);
      }

      const cacheKey = this.getCacheKey(videoUrl);
      const localPath = `${this.cacheDirectory}${cacheKey}`;
      
      const startTime = Date.now();
      console.log(`📥 ${priority} priority caching:`, videoUrl.substring(0, 50) + '...');

      // Download with resumable support
      const downloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        localPath,
        {},
        (downloadProgressInfo) => {
          if (priority === 'high') {
            const progress = downloadProgressInfo.totalBytesWritten / downloadProgressInfo.totalBytesExpectedToWrite;
            console.log(`📊 High priority download: ${Math.round(progress * 100)}%`);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      const downloadTime = Date.now() - startTime;

      if (result && result.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        
        // Update cache info
        this.cacheInfo.set(videoUrl, {
          localPath,
          size: fileInfo.size,
          lastAccessed: Date.now(),
          downloadTime
        });

        await this.saveCacheInfo();
        await this.checkCacheSize();
        
        if (priority === 'high') {
          this.performanceMetrics.preFetchSuccess++;
        }
        
        console.log(`✅ Cached in ${downloadTime}ms:`, videoUrl.substring(0, 50) + '...');
        return localPath;
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('❌ Cache failed:', error.message);
      if (priority === 'high') {
        this.performanceMetrics.preFetchFailed++;
      }
      return null;
    }
  }

  // Aggressive Parallel Pre-loading - 5 videos at once
  async preFetchNextVideos(videoList, currentIndex) {
    if (this.isPreFetching) {
      console.log('⏳ Pre-fetch already in progress...');
      return;
    }

    this.isPreFetching = true;
    this.currentPlayingIndex = currentIndex;

    try {
      // Pre-fetch next 5 videos AGGRESSIVELY in parallel
      const nextIndices = [
        currentIndex + 1,
        currentIndex + 2,
        currentIndex + 3,
        currentIndex + 4,
        currentIndex + 5
      ].filter(index => index < videoList.length && index >= 0);

      console.log(`🚀 AGGRESSIVE Pre-fetching ${nextIndices.length} videos from index ${currentIndex}`);

      // Create 5 parallel connections for maximum speed
      const parallelConnections = 5;
      const chunks = this.chunkArray(nextIndices, Math.ceil(nextIndices.length / parallelConnections));
      
      const preFetchPromises = chunks.map(async (chunk, chunkIndex) => {
        console.log(`🔥 Connection ${chunkIndex + 1}: Loading ${chunk.length} videos`);
        
        const videoPromises = chunk.map(async (index) => {
          const video = videoList[index];
          if (video && video.videoUrl) {
            // ALL videos get high priority for aggressive loading
            
            // Check if HLS stream and pre-load manifest aggressively
            if (video.videoUrl.includes('.m3u8')) {
              await this.preLoadHLSManifest(video.videoUrl);
            }
            
            // Start streaming download immediately
            return this.streamVideoData(video.videoUrl, 'high');
          }
          return null;
        });
        
        return Promise.allSettled(videoPromises);
      });

      // Execute all parallel connections simultaneously
      const results = await Promise.allSettled(preFetchPromises);
      console.log('🔥 AGGRESSIVE Pre-fetch batch completed:', results);
    } catch (error) {
      console.error('❌ AGGRESSIVE Pre-fetch failed:', error);
    } finally {
      this.isPreFetching = false;
    }
  }

  // Stream video data in chunks for instant playback
  async streamVideoData(videoUrl, priority = 'high') {
    try {
      // Skip HLS streams - they cannot be cached locally
      if (videoUrl.includes('.m3u8')) {
        console.log('🎭 HLS stream detected, skipping cache:', videoUrl.substring(0, 50) + '...');
        return null; // Let original HLS stream play directly
      }
      
      console.log('🌊 Streaming video data:', videoUrl.substring(0, 50) + '...');
      
      // Create a streaming download with just 1% data needed
      const cacheKey = this.getCacheKey(videoUrl);
      const fileName = `${cacheKey}.mp4`;
      const fileUri = `${FileSystem.cacheDirectory}video_cache/${fileName}`;
      
      // Ensure cache directory exists
      await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}video_cache`, { intermediates: true });
      
      // Start streaming download - we only need first chunk
      const downloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        fileUri,
        {
          headers: {
            'User-Agent': 'KronopApp',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Range': 'bytes=0-1048576' // Only first 1MB for instant start
          }
        },
        (downloadProgress) => {
          // Log progress but don't wait for completion
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
            
            // If we have just 1% data, consider it ready for playback
            if (progress >= 1 && !this.cacheInfo.has(videoUrl)) {
              console.log(`⚡ Video ready for playback (${progress.toFixed(1)}%): ${videoUrl.substring(0, 30)}...`);
              
              // Mark as cached even with just 1% data
              this.cacheInfo.set(videoUrl, {
                uri: fileUri,
                size: downloadProgress.totalBytesWritten,
                lastAccessed: Date.now(),
                isPartial: true, // Mark as partial download
                downloadProgress: progress
              });
              
              // Continue downloading in background
              this.continueBackgroundDownload(videoUrl, fileUri);
            }
          }
        }
      );

      // Start the download but don't wait for completion
      downloadResumable.downloadAsync();
      
      return fileUri;
    } catch (error) {
      console.error('❌ Stream failed:', error.message);
      return null;
    }
  }

  // Continue downloading in background after initial 1%
  async continueBackgroundDownload(videoUrl, fileUri) {
    try {
      console.log('🔄 Continuing background download...');
      
      // Download the rest of the video
      const fullDownloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        fileUri,
        {
          headers: {
            'User-Agent': 'KronopApp',
            'Accept': '*/*',
            'Connection': 'keep-alive'
          }
        }
      );

      await fullDownloadResumable.downloadAsync();
      
      // Mark as fully downloaded
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      this.cacheInfo.set(videoUrl, {
        uri: fileUri,
        size: fileInfo.size || 0,
        lastAccessed: Date.now(),
        isPartial: false,
        downloadProgress: 100
      });
      
      console.log('✅ Background download completed');
    } catch (error) {
      console.log('⚠️ Background download failed:', error.message);
    }
  }

  // Helper function to chunk array for parallel processing
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Pre-load HLS manifest for faster startup
  async preLoadHLSManifest(hlsUrl) {
    try {
      console.log('🎬 Pre-loading HLS manifest:', hlsUrl.substring(0, 50) + '...');
      
      // Fetch the manifest to start connection
      const response = await fetch(hlsUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'KronopApp'
        }
      });
      
      if (response.ok) {
        console.log('✅ HLS manifest pre-loaded');
      }
    } catch (error) {
      console.log('⚠️ HLS manifest pre-load failed:', error.message);
    }
  }

  // Check and clean cache if needed
  async checkCacheSize() {
    try {
      let totalSize = 0;
      const entries = Array.from(this.cacheInfo.entries());
      
      for (const [url, info] of entries) {
        totalSize += info.size || 0;
      }

      if (totalSize > this.maxCacheSize) {
        console.log(`🧹 Cache cleanup: ${Math.round(totalSize / 1024 / 1024)}MB > ${Math.round(this.maxCacheSize / 1024 / 1024)}MB`);
        await this.cleanupOldCache();
      }
    } catch (error) {
      console.error('❌ Cache size check failed:', error);
    }
  }

  // Clean old cache entries (LRU)
  async cleanupOldCache() {
    try {
      const entries = Array.from(this.cacheInfo.entries());
      
      // Sort by last accessed (oldest first)
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      let totalSize = 0;
      entries.forEach(([url, info]) => {
        totalSize += info.size || 0;
      });

      // Remove oldest entries until we're at 70% of max size
      const targetSize = this.maxCacheSize * 0.7;
      let removedCount = 0;

      for (const [url, info] of entries) {
        if (totalSize <= targetSize) break;
        
        try {
          await FileSystem.deleteAsync(info.localPath);
          this.cacheInfo.delete(url);
          totalSize -= info.size || 0;
          removedCount++;
        } catch (error) {
          console.error('❌ Failed to delete cache file:', error);
        }
      }

      if (removedCount > 0) {
        await this.saveCacheInfo();
        console.log(`🧹 Cleaned ${removedCount} old cache entries`);
      }
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const total = this.performanceMetrics.totalCacheHits + this.performanceMetrics.totalCacheMisses;
    const cacheHitRate = total > 0 ? (this.performanceMetrics.totalCacheHits / total * 100).toFixed(1) : 0;
    
    return {
      ...this.performanceMetrics,
      cacheHitRate: `${cacheHitRate}%`,
      cachedVideos: this.cacheInfo.size,
      cacheSizeMB: Math.round(Array.from(this.cacheInfo.values()).reduce((sum, info) => sum + (info.size || 0), 0) / 1024 / 1024)
    };
  }

  // Clear all cache
  async clearCache() {
    try {
      const entries = Array.from(this.cacheInfo.entries());
      
      for (const [url, info] of entries) {
        try {
          await FileSystem.deleteAsync(info.localPath);
        } catch (error) {
          console.error('❌ Failed to delete cache file:', error);
        }
      }
      
      this.cacheInfo.clear();
      await this.saveCacheInfo();
      console.log('🧹 Cache cleared completely');
    } catch (error) {
      console.error('❌ Cache clear failed:', error);
    }
  }
}

module.exports = new SmartPreCacheService();
