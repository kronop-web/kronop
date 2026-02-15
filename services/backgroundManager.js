/**
 * Background Activity Manager
 * Controls background processes and pauses them during focus mode
 */

class BackgroundManager {
  static instance = null;
  backgroundProcesses = new Map();
  
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
      options,
      isPaused: false,
      intervalId: null
    });
    
    console.log(`📋 Background process registered: ${id}`);
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
      bgProcess.intervalId = setInterval(bgProcess.process, bgProcess.options.interval);
      console.log(`⏰ Started interval for: ${id} (${bgProcess.options.interval}ms)`);
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
      console.log(`⏸️ Pausing background process: ${id}`);
      bgProcess.isPaused = true;
      
      // Clear interval
      if (bgProcess.intervalId) {
        clearInterval(bgProcess.intervalId);
        bgProcess.intervalId = null;
      }
    }
  }
  
  /**
   * Pause all background processes (for focus mode)
   */
  pauseAllProcesses() {
    console.log('⏸️ Pausing all background processes for focus mode');
    this.backgroundProcesses.forEach((bgProcess, id) => {
      this.pauseProcess(id);
    });
  }
  
  /**
   * Resume all background processes
   */
  resumeAllProcesses() {
    console.log('▶️ Resuming all background processes');
    this.backgroundProcesses.forEach((bgProcess, id) => {
      this.startProcess(id);
    });
  }
  
  /**
   * Stop and remove a background process
   * @param {string} id - Process identifier
   */
  stopProcess(id) {
    const bgProcess = this.backgroundProcesses.get(id);
    if (!bgProcess) {
      return;
    }
    
    // Clear interval
    if (bgProcess.intervalId) {
      clearInterval(bgProcess.intervalId);
    }
    
    // Remove from registry
    this.backgroundProcesses.delete(id);
    console.log(`🛑 Stopped background process: ${id}`);
  }
  
  /**
   * Get status of all background processes
   */
  getProcessStatus() {
    const status = {};
    this.backgroundProcesses.forEach((bgProcess, id) => {
      status[id] = {
        isPaused: bgProcess.isPaused,
        hasInterval: !!bgProcess.intervalId,
        options: bgProcess.options
      };
    });
    return status;
  }
  
  /**
   * Cleanup all processes
   */
  cleanup() {
    console.log('🧹 Cleaning up all background processes');
    this.backgroundProcesses.forEach((bgProcess, id) => {
      this.stopProcess(id);
    });
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
