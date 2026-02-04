// Optimized View Service for 100M+ Users
// Server-side filtering with Last 50 Reels strategy

const mongoose = require('mongoose');
const User = require('../models/User');
const Content = require('../models/Content');
const redis = require('./redisCacheService');

class OptimizedViewService {
  constructor() {
    this.SEEN_REELS_LIMIT = 50; // Only store last 50 seen reels
    this.CACHE_TTL = 300; // 5 minutes
    this.BATCH_SIZE = 1000; // Process in batches
  }

  // Track reel view with optimized storage
  async trackReelView(userId, reelId, viewDuration = 0, totalDuration = 0) {
    try {
      const cacheKey = `user_views:${userId}`;
      const seenListKey = `user_seen_list:${userId}`;
      
      // Check cache first
      const cachedViews = await redis.get(cacheKey) || [];
      if (cachedViews.includes(reelId)) {
        return { alreadyViewed: true, success: true };
      }

      const isCompleted = totalDuration > 0 && (viewDuration / totalDuration) >= 0.8;

      // Use MongoDB aggregation for atomic update
      const updateResult = await User.findByIdAndUpdate(
        userId,
        [
          {
            $set: {
              seen_reels: {
                $cond: {
                  if: { $in: [reelId, '$seen_reels.reel_id'] },
                  then: '$seen_reels', // Already exists, don't add
                  else: {
                    $concatArrays: [
                      {
                        $slice: [
                          {
                            $concatArrays: [
                              '$seen_reels',
                              [{
                                reel_id: mongoose.Types.ObjectId(reelId),
                                viewed_at: new Date(),
                                view_duration: Math.round(viewDuration),
                                completed: isCompleted
                              }]
                            ]
                          },
                          -this.SEEN_REELS_LIMIT // Keep only last 50
                        ]
                      },
                      []
                    ]
                  }
                }
              }
            }
          }
        ],
        { 
          new: true,
          upsert: false 
        }
      );

      // Update seen list cache (for quick filtering)
      const updatedSeenList = await this.getUserSeenList(userId);
      await redis.set(seenListKey, updatedSeenList, this.CACHE_TTL);

      // Add to recent views cache
      if (!cachedViews.includes(reelId)) {
        cachedViews.push(reelId);
        await redis.set(cacheKey, cachedViews.slice(-50), this.CACHE_TTL); // Keep last 50 in cache
      }

      // Update reel stats
      await Content.findByIdAndUpdate(reelId, {
        $inc: { 
          views_count: 1,
          unique_views: isCompleted ? 1 : 0
        },
        $set: { updated_at: new Date() }
      });

      return { 
        success: true, 
        alreadyViewed: false,
        completed: isCompleted,
        viewDuration: Math.round(viewDuration)
      };

    } catch (error) {
      console.error('❌ Error tracking optimized reel view:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's seen reels list (optimized)
  async getUserSeenList(userId) {
    try {
      const cacheKey = `user_seen_list:${userId}`;
      
      // Try cache first
      let seenList = await redis.get(cacheKey);
      
      if (!seenList) {
        // Use aggregation for better performance
        const user = await User.aggregate([
          { $match: { _id: mongoose.Types.ObjectId(userId) } },
          { $project: { seen_reels: 1 } },
          { $unwind: '$seen_reels' },
          { $sort: { 'seen_reels.viewed_at': -1 } },
          { $limit: this.SEEN_REELS_LIMIT },
          { $group: { 
            _id: null, 
            reelIds: { $push: '$seen_reels.reel_id' }
          }}
        ]);

        seenList = user.length > 0 ? user[0].reelIds.map(id => id.toString()) : [];
        
        // Cache for 5 minutes
        await redis.set(cacheKey, seenList, this.CACHE_TTL);
      }

      return seenList;

    } catch (error) {
      console.error('❌ Error getting user seen list:', error);
      return [];
    }
  }

  // Build optimized query with server-side filtering
  async getUnseenReelsQuery(userId, additionalFilters = {}) {
    try {
      const seenList = await this.getUserSeenList(userId);
      
      // Build base query
      const query = {
        status: 'public',
        type: 'reel',
        ...additionalFilters
      };

      // Add $nin filter only if user has seen reels
      if (seenList.length > 0) {
        query._id = { 
          $nin: seenList.map(id => mongoose.Types.ObjectId(id))
        };
      }

      return query;

    } catch (error) {
      console.error('❌ Error building unseen reels query:', error);
      return { status: 'public', type: 'reel', ...additionalFilters };
    }
  }

  // Batch process view tracking for high traffic
  async batchTrackViews(viewData) {
    try {
      const { userId, views } = viewData;
      
      if (!Array.isArray(views) || views.length === 0) {
        return { success: false, error: 'Views array is required' };
      }

      // Group by user for batch processing
      const userUpdates = new Map();
      
      for (const view of views) {
        if (!userUpdates.has(userId)) {
          userUpdates.set(userId, []);
        }
        userUpdates.get(userId).push(view);
      }

      // Process each user's views
      const results = [];
      for (const [uid, userViews] of userUpdates.entries()) {
        const userResult = await this.processBatchViews(uid, userViews);
        results.push(userResult);
      }

      return { success: true, data: results };

    } catch (error) {
      console.error('❌ Error in batch view tracking:', error);
      return { success: false, error: error.message };
    }
  }

  // Process batch views for a single user
  async processBatchViews(userId, views) {
    try {
      // Get current seen list
      const currentSeen = await this.getUserSeenList(userId);
      const newViews = views.filter(view => !currentSeen.includes(view.reelId));

      if (newViews.length === 0) {
        return { userId, processed: 0, message: 'No new views to process' };
      }

      // Prepare new seen reels
      const newSeenReels = newViews.map(view => ({
        reel_id: mongoose.Types.ObjectId(view.reelId),
        viewed_at: new Date(view.timestamp || Date.now()),
        view_duration: Math.round(view.viewDuration || 0),
        completed: view.completed || false
      }));

      // Update user with combined seen reels
      await User.findByIdAndUpdate(
        userId,
        [{
          $set: {
            seen_reels: {
              $concatArrays: [
                {
                  $slice: [
                    {
                      $concatArrays: [
                        { $ifNull: ['$seen_reels', []] },
                        newSeenReels
                      ]
                    },
                    -this.SEEN_REELS_LIMIT
                  ]
                },
                []
              ]
            }
          }
        }]
      );

      // Update content stats in batch
      const reelIds = newViews.map(v => v.reelId);
      await Content.updateMany(
        { _id: { $in: reelIds } },
        { 
          $inc: { views_count: 1 },
          $set: { updated_at: new Date() }
        }
      );

      // Clear cache
      await redis.del(`user_seen_list:${userId}`);
      await redis.del(`user_views:${userId}`);

      return { 
        userId, 
        processed: newViews.length,
        message: `Processed ${newViews.length} new views`
      };

    } catch (error) {
      console.error(`❌ Error processing batch views for user ${userId}:`, error);
      return { userId, processed: 0, error: error.message };
    }
  }

  // Cleanup old seen reels (maintenance)
  async cleanupOldSeenReels(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Process in batches to avoid blocking
      let processed = 0;
      let hasMore = true;

      while (hasMore) {
        const users = await User.find({
          'seen_reels.viewed_at': { $lt: cutoffDate }
        })
        .limit(this.BATCH_SIZE)
        .select('_id')
        .lean();

        if (users.length === 0) {
          hasMore = false;
          break;
        }

        // Update batch
        await User.updateMany(
          { _id: { $in: users.map(u => u._id) } },
          {
            $pull: {
              seen_reels: {
                viewed_at: { $lt: cutoffDate }
              }
            }
          }
        );

        processed += users.length;
        console.log(`🧹 Cleaned old seen reels for ${processed} users...`);

        // Clear caches for processed users
        const cacheKeys = users.map(u => `user_seen_list:${u._id}`);
        await redis.delMultiple(cacheKeys);
      }

      return { success: true, processed };

    } catch (error) {
      console.error('❌ Error cleaning up old seen reels:', error);
      return { success: false, error: error.message };
    }
  }

  // Get analytics for seen reels
  async getSeenReelsAnalytics(userId) {
    try {
      const analytics = await User.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(userId) } },
        { $project: { seen_reels: 1 } },
        { $unwind: '$seen_reels' },
        {
          $group: {
            _id: null,
            totalViews: { $sum: 1 },
            completedViews: {
              $sum: { $cond: ['$seen_reels.completed', 1, 0] }
            },
            totalWatchTime: { $sum: '$seen_reels.view_duration' },
            averageWatchTime: { $avg: '$seen_reels.view_duration' },
            lastViewDate: { $max: '$seen_reels.viewed_at' },
            firstViewDate: { $min: '$seen_reels.viewed_at' }
          }
        }
      ]);

      return analytics.length > 0 ? analytics[0] : null;

    } catch (error) {
      console.error('❌ Error getting seen reels analytics:', error);
      return null;
    }
  }

  // Reset user's seen reels (with limit)
  async resetUserViews(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: { seen_reels: [] }
      });

      // Clear all related caches
      await redis.del(`user_seen_list:${userId}`);
      await redis.del(`user_views:${userId}`);

      console.log(`🔄 Reset views for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error resetting user views:', error);
      return { success: false, error: error.message };
    }
  }

  // Get system statistics
  async getSystemStats() {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            usersWithViews: {
              $sum: { $cond: [{ $gt: [{ $size: '$seen_reels' }, 0] }, 1, 0] }
            },
            totalSeenReels: { $sum: { $size: '$seen_reels' } },
            averageSeenPerUser: { $avg: { $size: '$seen_reels' } }
          }
        }
      ]);

      return stats.length > 0 ? stats[0] : null;

    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      return null;
    }
  }
}

module.exports = new OptimizedViewService();
