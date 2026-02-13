// Auto-Sync Scheduler Service
// Runs every 1 minute to sync BunnyCDN data with MongoDB
// Background task with no user interruption

const cron = require('node-cron');
const BunnySyncService = require('../services/bunnySyncService');
const BunnyContentService = require('../services/bunnyContentService');

class AutoSyncScheduler {
  constructor() {
    this.isRunning = false;
    this.lastSyncTime = null;
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncDuration: 0,
      averageSyncTime: 0,
      itemsProcessed: 0,
      duplicatesSkipped: 0
    };
    this.syncHistory = [];
    this.maxHistorySize = 100; // Keep last 100 sync records
  }

  /**
   * Start the auto-sync scheduler
   * Runs every minute: '* * * * *'
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Auto-Sync Scheduler already running');
      return;
    }

    console.log('🚀 Starting Auto-Sync Scheduler (Every 1 Minute)...');
    
    // Schedule task to run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.performSync();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('✅ Auto-Sync Scheduler started successfully!');
    console.log('📅 Schedule: Every minute at 0 seconds');
    console.log('🔄 Background sync will run without user interruption');
  }

  /**
   * Stop the auto-sync scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Auto-Sync Scheduler not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isRunning = false;
    console.log('🛑 Auto-Sync Scheduler stopped');
  }

  /**
   * Perform the actual sync operation
   */
  async performSync() {
    const startTime = Date.now();
    let syncResult = null;

    try {
      console.log(`🔄 Starting Auto-Sync at ${new Date().toISOString()}`);
      
      // Step 1: Check for new content from BunnyCDN
      console.log('🔍 Checking BunnyCDN for new content...');
      const newContent = await this.checkForNewContent();
      
      if (newContent.hasNewData) {
        console.log('📦 New content found, syncing to MongoDB...');
        
        // Step 2: Sync new content to MongoDB (no duplicates)
        syncResult = await this.syncNewContent(newContent.data);
        
        // Step 3: Clean up deleted content
        console.log('🗑️ Cleaning up deleted content...');
        const cleanupResult = await this.cleanupDeletedContent();
        
        // Update stats
        this.updateStats(true, startTime, syncResult);
        
        console.log(`✅ Sync completed in ${Date.now() - startTime}ms`);
        console.log(`📊 Added: ${syncResult.itemsAdded}, Updated: ${syncResult.itemsUpdated}, Duplicates skipped: ${syncResult.duplicatesSkipped}`);
        console.log(`🗑️ Cleaned: ${cleanupResult.deletedCount} deleted items`);
        
      } else {
        console.log('ℹ️ No new content found, skipping sync');
        this.updateStats(false, startTime, { itemsAdded: 0, itemsUpdated: 0, duplicatesSkipped: 0 });
      }

    } catch (error) {
      console.error('❌ Auto-Sync failed:', error);
      this.updateStats(false, startTime, null, error);
    }

    // Record sync in history
    this.recordSyncHistory(syncResult, startTime);
  }

  /**
   * Check for new content from BunnyCDN
   */
  async checkForNewContent() {
    try {
      // Get all content from BunnyCDN
      const bunnyContent = await BunnyContentService.getAllContent();
      
      // Get current content from MongoDB for comparison
      const currentContent = await this.getCurrentMongoContent();
      
      // Find new items (items in BunnyCDN but not in MongoDB)
      const newItems = this.findNewItems(bunnyContent, currentContent);
      
      return {
        hasNewData: newItems.length > 0,
        data: newItems,
        totalBunnyItems: Object.values(bunnyContent).flat().length,
        totalMongoItems: currentContent.length
      };
      
    } catch (error) {
      console.error('❌ Error checking for new content:', error);
      throw error;
    }
  }

  /**
   * Find new items by comparing BunnyCDN and MongoDB content
   */
  findNewItems(bunnyContent, mongoContent) {
    const newItems = [];
    const mongoIds = new Set(mongoContent.map(item => item.id || item._id));
    
    // Check each content type
    ['reels', 'videos', 'photos', 'stories', 'live'].forEach(type => {
      if (bunnyContent[type] && Array.isArray(bunnyContent[type])) {
        bunnyContent[type].forEach(item => {
          const itemId = item.id || item.guid || item.videoId;
          if (itemId && !mongoIds.has(itemId)) {
            newItems.push({
              ...item,
              contentType: type,
              discoveredAt: new Date().toISOString()
            });
          }
        });
      }
    });
    
    return newItems;
  }

  /**
   * Get current content from MongoDB
   */
  async getCurrentMongoContent() {
    try {
      // This would use your existing database service
      // For now, return empty array (will be implemented with actual DB call)
      return [];
    } catch (error) {
      console.error('❌ Error getting current MongoDB content:', error);
      return [];
    }
  }

  /**
   * Sync new content to MongoDB (no duplicates)
   */
  async syncNewContent(newItems) {
    let itemsAdded = 0;
    let itemsUpdated = 0;
    let duplicatesSkipped = 0;
    
    try {
      for (const item of newItems) {
        try {
          // Check if item already exists (duplicate check)
          const exists = await this.checkItemExists(item.id || item.guid);
          
          if (exists) {
            duplicatesSkipped++;
            console.log(`⚠️ Skipping duplicate: ${item.id || item.guid}`);
            continue;
          }
          
          // Save new item to MongoDB
          await this.saveItemToMongo(item);
          itemsAdded++;
          console.log(`✅ Added new ${item.contentType}: ${item.id || item.guid}`);
          
        } catch (itemError) {
          console.error(`❌ Error syncing item ${item.id}:`, itemError);
        }
      }
      
      return {
        itemsAdded,
        itemsUpdated,
        duplicatesSkipped,
        totalProcessed: newItems.length
      };
      
    } catch (error) {
      console.error('❌ Error syncing new content:', error);
      throw error;
    }
  }

  /**
   * Check if item already exists in MongoDB
   */
  async checkItemExists(itemId) {
    // This would check MongoDB for existing item
    // For now, return false (will be implemented with actual DB call)
    return false;
  }

  /**
   * Save item to MongoDB
   */
  async saveItemToMongo(item) {
    // This would save item to MongoDB
    // For now, just log (will be implemented with actual DB call)
    console.log(`💾 Saving to MongoDB: ${item.contentType} - ${item.title || 'Untitled'}`);
  }

  /**
   * Clean up deleted content from MongoDB
   */
  async cleanupDeletedContent() {
    try {
      console.log('🗑️ Running cleanup for deleted content...');
      
      // Use existing BunnySync cleanup
      const cleanupResult = await BunnySyncService.cleanupAllMissingVideos();
      
      const totalDeleted = Object.values(cleanupResult).reduce((sum, result) => sum + (result.deleted || 0), 0);
      
      return {
        deletedCount: totalDeleted,
        details: cleanupResult
      };
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return { deletedCount: 0, error: error.message };
    }
  }

  /**
   * Update sync statistics
   */
  updateStats(success, startTime, result, error = null) {
    const duration = Date.now() - startTime;
    
    this.syncStats.totalSyncs++;
    
    if (success) {
      this.syncStats.successfulSyncs++;
      this.syncStats.lastSyncDuration = duration;
      
      // Update average sync time
      const totalDuration = this.syncStats.averageSyncTime * (this.syncStats.successfulSyncs - 1) + duration;
      this.syncStats.averageSyncTime = totalDuration / this.syncStats.successfulSyncs;
      
      if (result) {
        this.syncStats.itemsProcessed += result.itemsAdded + result.itemsUpdated;
        this.syncStats.duplicatesSkipped += result.duplicatesSkipped;
      }
    } else {
      this.syncStats.failedSyncs++;
    }
    
    this.lastSyncTime = new Date();
  }

  /**
   * Record sync in history
   */
  recordSyncHistory(result, startTime) {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      success: !!result,
      itemsAdded: result?.itemsAdded || 0,
      itemsUpdated: result?.itemsUpdated || 0,
      duplicatesSkipped: result?.duplicatesSkipped || 0,
      error: result ? null : 'Sync failed'
    };
    
    this.syncHistory.unshift(historyEntry);
    
    // Keep history size limited
    if (this.syncHistory.length > this.maxHistorySize) {
      this.syncHistory = this.syncHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get current sync statistics
   */
  getStats() {
    return {
      ...this.syncStats,
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      recentHistory: this.syncHistory.slice(0, 10) // Last 10 syncs
    };
  }

  /**
   * Force sync immediately (for manual trigger)
   */
  async forceSync() {
    console.log('⚡ Forcing immediate sync...');
    await this.performSync();
  }
}

// Singleton instance
let schedulerInstance = null;

function getScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new AutoSyncScheduler();
  }
  return schedulerInstance;
}

// Export for use
module.exports = { AutoSyncScheduler, getScheduler };

// Auto-start if running directly
if (require.main === module) {
  const scheduler = getScheduler();
  
  scheduler.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Auto-Sync Scheduler...');
    scheduler.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Auto-Sync Scheduler...');
    scheduler.stop();
    process.exit(0);
  });
  
  console.log('🚀 Auto-Sync Scheduler is running in background...');
  console.log('Press Ctrl+C to stop');
}
