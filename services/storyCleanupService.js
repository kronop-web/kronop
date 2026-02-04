const Story = require('../models/Story');

class StoryCleanupService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    this.storyExpiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  start() {
    if (this.isRunning) {
      console.log('Story Cleanup Service is already running');
      return;
    }

    console.log('🗑️ Story Cleanup Service started - will clean stories older than 24 hours every hour');
    this.isRunning = true;

    // Run cleanup immediately on start
    this.cleanupExpiredStories();

    // Schedule cleanup to run every hour
    this.intervalId = setInterval(() => {
      this.cleanupExpiredStories();
    }, this.cleanupInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Story Cleanup Service stopped');
  }

  async cleanupExpiredStories() {
    try {
      console.log('🔍 Checking for expired stories...');
      
      const expiryDate = new Date(Date.now() - this.storyExpiryTime);
      
      const result = await Story.deleteMany({
        created_at: { $lt: expiryDate }
      });

      if (result.deletedCount > 0) {
        console.log(`🗑️ Deleted ${result.deletedCount} expired stories`);
      } else {
        console.log('✅ No expired stories found');
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired stories:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      cleanupInterval: this.cleanupInterval,
      storyExpiryTime: this.storyExpiryTime,
      nextCleanup: this.isRunning ? new Date(Date.now() + this.cleanupInterval) : null
    };
  }
}

module.exports = new StoryCleanupService();
