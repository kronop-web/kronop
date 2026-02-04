// Unique View Tracking Service for Reels
// Optimized for 2M+ users with MongoDB performance

const User = require('../models/User');
const Content = require('../models/Content');
const redis = require('./redisCacheService');

class UniqueViewService {
  constructor() {
    this.CACHE_TTL = 300; // 5 minutes
    this.VIEW_THRESHOLD = 0.8; // 80% of video duration to count as viewed
  }

  // Track when user views a reel
  async trackReelView(userId, reelId, viewDuration = 0, totalDuration = 0) {
    try {
      const cacheKey = `user_views:${userId}`;
      
      // Check if already viewed recently (cache optimization)
      const cachedViews = await redis.get(cacheKey) || [];
      if (cachedViews.includes(reelId)) {
        return { alreadyViewed: true, success: true };
      }

      // Calculate if view is complete
      const isCompleted = totalDuration > 0 && (viewDuration / totalDuration) >= this.VIEW_THRESHOLD;

      // Update user's seen_reels array
      const updateData = {
        $addToSet: {
          seen_reels: {
            reel_id: reelId,
            viewed_at: new Date(),
            view_duration: Math.round(viewDuration),
            completed: isCompleted
          }
        }
      };

      // Only add to cache if completed view
      if (isCompleted) {
        cachedViews.push(reelId);
        await redis.set(cacheKey, cachedViews, this.CACHE_TTL);
      }

      await User.findByIdAndUpdate(userId, updateData, { 
        upsert: false,
        new: true 
      });

      // Update reel's view count
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
      console.error('❌ Error tracking reel view:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's seen reels IDs for filtering
  async getUserSeenReels(userId) {
    try {
      const cacheKey = `user_seen:${userId}`;
      
      // Try cache first
      let seenReels = await redis.get(cacheKey);
      
      if (!seenReels) {
        // Fetch from database
        const user = await User.findById(userId)
          .select('seen_reels.reel_id seen_reels.viewed_at')
          .lean()
          .exec();

        seenReels = user?.seen_reels?.map(sr => sr.reel_id.toString()) || [];
        
        // Cache for 5 minutes
        await redis.set(cacheKey, seenReels, this.CACHE_TTL);
      }

      return seenReels;

    } catch (error) {
      console.error('❌ Error getting user seen reels:', error);
      return [];
    }
  }

  // Filter reels to exclude already seen ones
  async filterUnseenReels(userId, reelIds) {
    try {
      if (!userId || !reelIds?.length) {
        return reelIds;
      }

      const seenReels = await this.getUserSeenReels(userId);
      
      // Filter out seen reels using $nin logic
      const unseenReels = reelIds.filter(reelId => 
        !seenReels.includes(reelId.toString())
      );

      console.log(`👤 User ${userId}: Filtered ${reelIds.length - unseenReels.length} seen reels`);
      
      return unseenReels;

    } catch (error) {
      console.error('❌ Error filtering unseen reels:', error);
      return reelIds; // Return original list on error
    }
  }

  // Get reels with MongoDB $nin query (most performant)
  async getUnseenReelsQuery(userId, additionalFilters = {}) {
    try {
      const seenReels = await this.getUserSeenReels(userId);
      
      // Build MongoDB query with $nin operator
      const query = {
        status: 'public',
        type: 'reel',
        ...additionalFilters
      };

      // Add $nin filter only if user has seen reels
      if (seenReels.length > 0) {
        query._id = { $nin: seenReels };
      }

      return query;

    } catch (error) {
      console.error('❌ Error building unseen reels query:', error);
      return { status: 'public', type: 'reel', ...additionalFilters };
    }
  }

  // Clean old view records (performance optimization)
  async cleanupOldViews(userId, daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await User.findByIdAndUpdate(userId, {
        $pull: {
          seen_reels: {
            viewed_at: { $lt: cutoffDate }
          }
        }
      });

      // Clear cache
      await redis.del(`user_seen:${userId}`);
      await redis.del(`user_views:${userId}`);

      console.log(`🧹 Cleaned old views for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error cleaning old views:', error);
      return { success: false, error: error.message };
    }
  }

  // Get view statistics for analytics
  async getViewStats(userId) {
    try {
      const user = await User.findById(userId)
        .select('seen_reels')
        .lean()
        .exec();

      const seenReels = user?.seen_reels || [];
      
      const stats = {
        totalViews: seenReels.length,
        completedViews: seenReels.filter(sr => sr.completed).length,
        averageViewDuration: seenReels.length > 0 
          ? Math.round(seenReels.reduce((sum, sr) => sum + sr.view_duration, 0) / seenReels.length)
          : 0,
        lastViewDate: seenReels.length > 0
          ? new Date(Math.max(...seenReels.map(sr => new Date(sr.viewed_at).getTime())))
          : null
      };

      return stats;

    } catch (error) {
      console.error('❌ Error getting view stats:', error);
      return null;
    }
  }

  // Reset user's seen reels (for testing or user preference)
  async resetUserViews(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: { seen_reels: [] }
      });

      // Clear all related caches
      await redis.del(`user_seen:${userId}`);
      await redis.del(`user_views:${userId}`);

      console.log(`🔄 Reset views for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error resetting user views:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new UniqueViewService();
