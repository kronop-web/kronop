/**
 * Screen Memory Manager
 * Manages memory for individual screens
 * Each screen gets its own memory pool
 */

class ScreenMemoryManager {
  static instance = null;
  screenMemory = new Map();
  
  constructor() {
    if (ScreenMemoryManager.instance) {
      return ScreenMemoryManager.instance;
    }
    ScreenMemoryManager.instance = this;
  }
  
  /**
   * Allocate memory for a specific screen
   * @param {string} screenId - Screen identifier
   * @param {number} size - Memory size in MB
   */
  allocateMemory(screenId, size = 50) {
    if (!this.screenMemory.has(screenId)) {
      this.screenMemory.set(screenId, {
        allocatedSize: size,
        usedSize: 0,
        cache: new Map(),
        lastCleanup: Date.now()
      });
      
      console.log(`💾 Allocated ${size}MB for screen: ${screenId}`);
    }
    
    return this.screenMemory.get(screenId);
  }
  
  /**
   * Get memory for a screen
   * @param {string} screenId - Screen identifier
   */
  getScreenMemory(screenId) {
    return this.screenMemory.get(screenId);
  }
  
  /**
   * Cache data in screen memory
   * @param {string} screenId - Screen identifier
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} size - Size of data in bytes
   */
  cacheData(screenId, key, data, size = 0) {
    const memory = this.getScreenMemory(screenId);
    if (!memory) {
      this.allocateMemory(screenId);
    }
    
    // Check if we have enough memory
    if (memory.usedSize + size > memory.allocatedSize) {
      console.warn(`⚠️ Memory limit exceeded for screen: ${screenId}`);
      this.cleanupScreen(screenId);
    }
    
    memory.cache.set(key, {
      data,
      size,
      timestamp: Date.now(),
      accessCount: 0
    });
    
    memory.usedSize += size;
    console.log(`💾 Cached ${key} in ${screenId} (${size} bytes)`);
  }
  
  /**
   * Get cached data
   * @param {string} screenId - Screen identifier
   * @param {string} key - Cache key
   */
  getCachedData(screenId, key) {
    const memory = this.screenMemory.get(screenId);
    if (!memory || !memory.cache.has(key)) {
      return null;
    }
    
    const cached = memory.cache.get(key);
    cached.accessCount++;
    return cached.data;
  }
  
  /**
   * Clear cache for a screen
   * @param {string} screenId - Screen identifier
   */
  clearScreenCache(screenId) {
    const memory = this.screenMemory.get(screenId);
    if (memory) {
      memory.cache.clear();
      memory.usedSize = 0;
      console.log(`🧹 Cleared cache for screen: ${screenId}`);
    }
  }
  
  /**
   * Cleanup old cache entries
   * @param {string} screenId - Screen identifier
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupScreen(screenId, maxAge = 5 * 60 * 1000) { // 5 minutes default
    const memory = this.screenMemory.get(screenId);
    if (!memory) return;
    
    const now = Date.now();
    let freedSize = 0;
    
    memory.cache.forEach((cached, key) => {
      if (now - cached.timestamp > maxAge) {
        memory.cache.delete(key);
        freedSize += cached.size;
      }
    });
    
    memory.usedSize -= freedSize;
    memory.lastCleanup = now;
    
    if (freedSize > 0) {
      console.log(`🧹 Cleaned ${freedSize} bytes from ${screenId}`);
    }
  }
  
  /**
   * Get memory usage statistics
   * @param {string} screenId - Screen identifier
   */
  getMemoryStats(screenId) {
    const memory = this.screenMemory.get(screenId);
    if (!memory) return null;
    
    return {
      allocated: memory.allocatedSize,
      used: memory.usedSize,
      available: memory.allocatedSize - memory.usedSize,
      cacheSize: memory.cache.size,
      lastCleanup: memory.lastCleanup
    };
  }
  
  /**
   * Cleanup all screens
   */
  cleanupAll() {
    console.log('🧹 Cleaning up all screen memory');
    this.screenMemory.clear();
  }
  
  // Singleton instance
  static getInstance() {
    if (!ScreenMemoryManager.instance) {
      ScreenMemoryManager.instance = new ScreenMemoryManager();
    }
    return ScreenMemoryManager.instance;
  }
}

export default ScreenMemoryManager;
