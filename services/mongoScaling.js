// MongoDB Scaling Configuration for 50,000 Users
const mongoose = require('mongoose');

class MongoDBScaling {
  // Optimized connection settings for high traffic
  static getOptimizedConfig() {
    return {
      maxPoolSize: 100,        // Connection pool size
      minPoolSize: 10,         // Minimum connections
      maxIdleTimeMS: 30000,    // Close idle connections
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,     // Disable buffering
      bufferCommands: false,
      readPreference: 'secondaryPreferred', // Read from secondary
      writeConcern: { w: 'majority', j: true },
      readConcern: { level: 'majority' },
      retryWrites: true,
      retryReads: true
    };
  }

  // Performance indexes for 50K users
  static async createPerformanceIndexes() {
    try {
      // Safe model registration with error handling
      const Content = mongoose.model('Content');
      const User = mongoose.model('User');
      
      // Only try to create Comment indexes if model is registered
      let Comment = null;
      try {
        Comment = mongoose.model('Comment');
      } catch (error) {
        console.log('⚠️ Comment model not registered, skipping Comment indexes');
      }

      // Helper function to safely create indexes
      const safeCreateIndex = async (collection, indexSpec, options = {}) => {
        try {
          // Check if index already exists
          const existingIndexes = await collection.indexes();
          const indexExists = existingIndexes.some(index => {
            const key = JSON.stringify(index.key);
            const newKey = JSON.stringify(indexSpec);
            return key === newKey;
          });
          
          if (indexExists) {
            console.log(`ℹ️ Index already exists, skipping: ${JSON.stringify(indexSpec)}`);
            return;
          }
          
          await collection.createIndex(indexSpec, options);
          console.log(`✅ Created index: ${JSON.stringify(indexSpec)}`);
        } catch (error) {
          if (error.code === 85) { // Index already exists error code
            console.log(`ℹ️ Index already exists: ${JSON.stringify(indexSpec)}`);
          } else {
            console.error(`❌ Error creating index ${JSON.stringify(indexSpec)}:`, error.message);
          }
        }
      };

      // Content indexes - most critical
      await Promise.all([
        safeCreateIndex(Content.collection, { type: 1, is_active: 1, created_at: -1 }),
        safeCreateIndex(Content.collection, { user_id: 1, created_at: -1 }),
        safeCreateIndex(Content.collection, { category: 1, type: 1, is_active: 1 }),
        safeCreateIndex(Content.collection, { tags: 1, is_active: 1 }),
        safeCreateIndex(Content.collection, { views: -1, likes: -1, created_at: -1 }),
        safeCreateIndex(Content.collection, { 'location.coordinates': '2dsphere' })
      ]);

      // User authentication indexes - with special handling for unique index
      await Promise.all([
        safeCreateIndex(User.collection, { phone: 1 }, { unique: true }),
        safeCreateIndex(User.collection, { firebaseUid: 1 }, { sparse: true }),
        safeCreateIndex(User.collection, { last_active: -1 }),
        safeCreateIndex(User.collection, { created_at: -1 })
      ]);

      // Real-time comment indexes - only if Comment model exists
      if (Comment) {
        await Promise.all([
          safeCreateIndex(Comment.collection, { content_id: 1, created_at: -1 }),
          safeCreateIndex(Comment.collection, { user_id: 1, created_at: -1 }),
          safeCreateIndex(Comment.collection, { parent_id: 1 })
        ]);
      }

      console.log('✅ MongoDB indexes optimization completed for 50K users');
    } catch (error) {
      console.error('❌ Error creating performance indexes:', error.message);
      // Don't throw error, just log it to prevent server crash
    }
  }

  // Database monitoring
  static async getMetrics() {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();
    
    return {
      connections: mongoose.connection.readyState,
      collections: collections.length,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      avgObjSize: `${(stats.avgObjSize / 1024).toFixed(2)} KB`,
      totalObjects: stats.objects
    };
  }
}

module.exports = MongoDBScaling;
