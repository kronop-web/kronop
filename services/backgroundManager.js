/**
 * Background Activity Manager
 * Controls background processes and optimizes for speed
 */

class BackgroundManager {
  static instance = null;
  backgroundProcesses = new Map();
  essentialProcesses = ['upload', 'notification', 'currentScreen'];
  
  constructor() {
    if (BackgroundManager.instance) {
      return BackgroundManager.instance;
    }
    BackgroundManager.instance = this;
  }
  
  /**
   * Register a background process
   * @param {string} id - Unique process identifier
   * @param {Function} process - The background process function
   * @param {Object} options - Process options
   */
  registerProcess(id, process, options = {}) {
    this.backgroundProcesses.set(id, {
      process,
      options: { ...options }, // Ensure options is always an object
      isPaused: false,
      intervalId: null,
      priority: options.priority || 'normal'
    });
    
    console.log(`📋 Background process registered: ${id} (priority: ${options.priority || 'normal'})`);
  }
  
  /**
   * Start a background process
   * @param {string} id - Process identifier
   */
  startProcess(id) {
    const bgProcess = this.backgroundProcesses.get(id);
    if (!bgProcess) {
      console.warn(`⚠️ Process not found: ${id}`);
      return;
    }
    
    if (bgProcess.isPaused) {
      console.log(`▶️ Resuming background process: ${id}`);
      bgProcess.isPaused = false;
    }
    
    // Start interval if needed
    if (bgProcess.options.interval && !bgProcess.intervalId) {
      bgProcess.intervalId = setInterval(() => {
        if (!bgProcess.isPaused) {
          bgProcess.process();
        }
      }, bgProcess.options.interval);
      
      console.log(`⏰ Started interval for process: ${id}`);
    }
    
    // Execute immediately if not interval-based
    if (!bgProcess.options.interval) {
      bgProcess.process();
      console.log(`🚀 Started one-time process: ${id}`);
    }
  }
  
  /**
   * Pause a background process
   * @param {string} id - Process identifier
   */
  pauseProcess(id) {
    const bgProcess = this.backgroundProcesses.get(id);
    if (!bgProcess) {
      console.warn(`⚠️ Process not found: ${id}`);
      return;
    }
    
    if (!bgProcess.isPaused) {
      bgProcess.isPaused = true;
      console.log(`⏸️ Paused background process: ${id}`);
    }
  }
  
  /**
   * Stop a background process
   * @param {string} id - Process identifier
   */
  stopProcess(id) {
    const bgProcess = this.backgroundProcesses.get(id);
    if (!bgProcess) {
      console.warn(`⚠️ Process not found: ${id}`);
      return;
    }
    
    // Clear interval if exists
    if (bgProcess.intervalId) {
      clearInterval(bgProcess.intervalId);
      bgProcess.intervalId = null;
    }
    
    bgProcess.isPaused = true;
    console.log(`⏹️ Stopped background process: ${id}`);
  }
  
  /**
   * Kill all non-essential processes for focus mode
   */
  killAllNonEssential() {
    const killedProcesses = [];
    
    for (const [processId, bgProcess] of this.backgroundProcesses) {
      if (!this.essentialProcesses.includes(processId) && !bgProcess.isPaused) {
        this.stopProcess(processId);
        killedProcesses.push(processId);
      }
    }
    
    console.log(`💀 Killed non-essential processes: ${killedProcesses.join(', ')}`);
    return killedProcesses;
  }
  
  /**
   * Set high priority for essential processes
   */
  setEssentialHighPriority() {
    for (const processName of this.essentialProcesses) {
      const process = this.backgroundProcesses.get(processName);
      if (process && process.options) {
        process.options = { ...process.options, priority: 'high' };
        console.log(`🚀 Set high priority for: ${processName}`);
      }
    }
    
    console.log('✅ Essential processes set to high priority');
  }
  
  /**
   * Optimize for speed - kill non-essential and boost essential
   */
  optimizeForSpeed() {
    console.log('⚡ Optimizing background processes for speed...');
    
    // Kill non-essential processes
    const killedProcesses = this.killAllNonEssential();
    
    // Set essential processes to high priority
    this.setEssentialHighPriority();
    
    // Clear caches for memory
    this.clearAllCaches();
    
    return {
      killedProcesses,
      essentialProcesses: this.essentialProcesses.length,
      optimizationLevel: 'ultra-fast'
    };
  }
  
  /**
   * Clear all caches
   */
  clearAllCaches() {
    try {
      // Clear component caches
      if (typeof global !== 'undefined' && global.componentCache) {
        global.componentCache.clear();
        console.log('🗑️ Cleared component cache');
      }
      
      // Clear image caches
      if (typeof global !== 'undefined' && global.imageCache) {
        global.imageCache.clear();
        console.log('🗑️ Cleared image cache');
      }
      
      // Force garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
        console.log('🗜️ Forced garbage collection');
      }
      
      console.log('✅ All caches cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing caches:', error);
    }
  }
  
  /**
   * Get process status
   */
  getProcessStatus() {
    const processes = {};
    
    for (const [id, bgProcess] of this.backgroundProcesses) {
      processes[id] = {
        isPaused: bgProcess.isPaused,
        priority: bgProcess.options.priority || 'normal',
        hasInterval: !!bgProcess.intervalId,
        isEssential: this.essentialProcesses.includes(id)
      };
    }
    
    return {
      totalProcesses: this.backgroundProcesses.size,
      essentialProcesses: this.essentialProcesses.length,
      activeProcesses: Array.from(this.backgroundProcesses.keys()).filter(id => !this.backgroundProcesses.get(id).isPaused),
      processes
    };
  }
  
  // Singleton instance
  static getInstance() {
    if (!BackgroundManager.instance) {
      BackgroundManager.instance = new BackgroundManager();
    }
    return BackgroundManager.instance;
  }
}

export default BackgroundManager;
