// Auto-Sync Integration Script
// Integrates Auto-Sync Scheduler with main Kronop app

const { getScheduler } = require('./services/autoSyncScheduler');

class AutoSyncIntegration {
  constructor() {
    this.scheduler = getScheduler();
    this.isInitialized = false;
  }

  /**
   * Initialize auto-sync in background
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Auto-Sync Integration...');
      
      // Start the scheduler in background
      this.scheduler.start();
      
      // Set up periodic status reporting
      this.setupStatusReporting();
      
      this.isInitialized = true;
      
      console.log('✅ Auto-Sync Integration initialized successfully!');
      console.log('🔄 Background sync will run every minute');
      console.log('📊 Stats available via getScheduler().getStats()');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Auto-Sync Integration:', error);
      return false;
    }
  }

  /**
   * Set up periodic status reporting
   */
  setupStatusReporting() {
    // Report status every 10 minutes
    setInterval(() => {
      const stats = this.scheduler.getStats();
      console.log('📊 Auto-Sync Status Report:');
      console.log(`- Total Syncs: ${stats.totalSyncs}`);
      console.log(`- Success Rate: ${((stats.successfulSyncs / stats.totalSyncs) * 100).toFixed(1)}%`);
      console.log(`- Items Processed: ${stats.itemsProcessed}`);
      console.log(`- Duplicates Skipped: ${stats.duplicatesSkipped}`);
      console.log(`- Average Sync Time: ${stats.averageSyncTime.toFixed(0)}ms`);
      console.log(`- Last Sync: ${stats.lastSyncTime ? new Date(stats.lastSyncTime).toLocaleString() : 'Never'}`);
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Get current status
   */
  getStatus() {
    return this.scheduler.getStats();
  }

  /**
   * Force immediate sync
   */
  async forceSync() {
    return await this.scheduler.forceSync();
  }

  /**
   * Stop auto-sync
   */
  stop() {
    if (this.isInitialized) {
      this.scheduler.stop();
      this.isInitialized = false;
      console.log('🛑 Auto-Sync Integration stopped');
    }
  }
}

// Create singleton instance
const autoSyncIntegration = new AutoSyncIntegration();

// Export for use in main app
module.exports = autoSyncIntegration;

// Auto-initialize if required
if (process.env.AUTO_SYNC_ENABLED === 'true') {
  autoSyncIntegration.initialize().catch(console.error);
}
