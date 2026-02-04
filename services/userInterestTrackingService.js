const UserInterests = require('../models/UserInterests');
const Content = require('../models/Content');

class UserInterestTrackingService {
  
  // Track user interaction with content
  static async trackUserInteraction(userId, contentId, interactionType, watchTime = 0) {
    try {
      console.log(`🎯 Tracking interaction: ${interactionType} for user ${userId} on content ${contentId}`);
      
      // Get content details
      const content = await Content.findById(contentId);
      if (!content) {
        console.warn('Content not found for interest tracking:', contentId);
        return null;
      }

      // Determine interaction weight based on type and watch time
      let finalInteractionType = interactionType;
      
      // If user watched significant portion of content, count as stronger interaction
      if (watchTime > 30 && interactionType === 'view') { // 30+ seconds
        finalInteractionType = 'long_view';
      }

      // Update user interests
      const updatedInterests = await UserInterests.updateUserInterests(
        userId,
        content.type,
        content.tags || [],
        content.category || '',
        finalInteractionType
      );

      console.log(`✅ Updated interests for user ${userId}:`, {
        interaction: finalInteractionType,
        category: content.category,
        tags: content.tags,
        totalInteractions: updatedInterests.totalInteractions
      });

      return updatedInterests;

    } catch (error) {
      console.error('❌ Error tracking user interaction:', error);
      throw error;
    }
  }

  // Track multiple interactions at once (batch processing)
  static async trackBatchInteractions(interactions) {
    try {
      console.log(`🔄 Processing batch of ${interactions.length} interactions`);
      
      const results = [];
      
      for (const interaction of interactions) {
        const result = await this.trackUserInteraction(
          interaction.userId,
          interaction.contentId,
          interaction.interactionType,
          interaction.watchTime || 0
        );
        results.push(result);
      }

      console.log(`✅ Batch processing completed for ${results.length} interactions`);
      return results;

    } catch (error) {
      console.error('❌ Error in batch interaction tracking:', error);
      throw error;
    }
  }

  // Get user's interest profile
  static async getUserInterestProfile(userId) {
    try {
      const userInterests = await UserInterests.findOne({ userId })
        .populate('userId', 'username email');

      if (!userInterests) {
        return {
          isNewUser: true,
          interests: [],
          totalInteractions: 0,
          topCategories: []
        };
      }

      const topCategories = await UserInterests.getWeightedCategories(userId);
      const topInterests = await UserInterests.getTopInterests(userId, 10);

      return {
        isNewUser: false,
        interests: userInterests.interests,
        totalInteractions: userInterests.totalInteractions,
        topCategories: topCategories.slice(0, 5), // Top 5 categories
        topInterests: topInterests.slice(0, 10), // Top 10 interests
        lastUpdated: userInterests.updatedAt
      };

    } catch (error) {
      console.error('❌ Error getting user interest profile:', error);
      throw error;
    }
  }

  // Calculate content relevance score for a user
  static async calculateContentRelevance(userId, content) {
    try {
      const userInterests = await UserInterests.findOne({ userId });
      
      if (!userInterests || !userInterests.interests.length) {
        return {
          score: 0,
          isNewUser: true,
          matchedInterests: []
        };
      }

      let relevanceScore = 0;
      const matchedInterests = [];

      // Check category match
      if (content.category) {
        const categoryInterest = userInterests.interests.find(i => i.category === content.category);
        if (categoryInterest) {
          relevanceScore += categoryInterest.weight * 2; // Double weight for category match
          matchedInterests.push({
            type: 'category',
            value: content.category,
            weight: categoryInterest.weight
          });
        }
      }

      // Check tag matches
      if (content.tags && content.tags.length > 0) {
        content.tags.forEach(tag => {
          const tagInterest = userInterests.interests.find(i => i.category === tag);
          if (tagInterest) {
            relevanceScore += tagInterest.weight;
            matchedInterests.push({
              type: 'tag',
              value: tag,
              weight: tagInterest.weight
            });
          }
        });
      }

      // Normalize score (0-100)
      const maxPossibleScore = userInterests.interests.reduce((max, interest) => Math.max(max, interest.weight), 0) * 3;
      const normalizedScore = maxPossibleScore > 0 ? Math.min(100, (relevanceScore / maxPossibleScore) * 100) : 0;

      return {
        score: normalizedScore,
        isNewUser: false,
        matchedInterests,
        totalWeight: relevanceScore
      };

    } catch (error) {
      console.error('❌ Error calculating content relevance:', error);
      return {
        score: 0,
        isNewUser: true,
        matchedInterests: []
      };
    }
  }

  // Get trending content for new users (fallback)
  static async getTrendingContent(contentType, limit = 20) {
    try {
      console.log(`🔥 Getting trending ${contentType} content for new users`);
      
      const trendingContent = await Content.find({
        type: contentType,
        is_active: true
      })
      .sort({ views: -1, likes: -1, created_at: -1 }) // Most viewed, liked, and recent
      .limit(limit)
      .select('title url thumbnail tags category views likes created_at');

      console.log(`✅ Found ${trendingContent.length} trending ${contentType} items`);
      return trendingContent;

    } catch (error) {
      console.error('❌ Error getting trending content:', error);
      // Fallback to recent content if trending fails
      return await Content.find({ type: contentType, is_active: true })
        .sort({ created_at: -1 })
        .limit(limit)
        .select('title url thumbnail tags category views likes created_at');
    }
  }

  // Decay old interests over time (optional maintenance)
  static async decayOldInterests() {
    try {
      console.log('⏰ Decaying old interests...');
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await UserInterests.updateMany(
        { 'interests.lastUpdated': { $lt: thirtyDaysAgo } },
        { 
          $mul: { 'interests.$[elem].weight': 0.9 } // Reduce weight by 10%
        },
        { 
          arrayFilters: [{ 'elem.lastUpdated': { $lt: thirtyDaysAgo } }],
          multi: true
        }
      );

      console.log(`✅ Decayed interests for ${result.modifiedCount} users`);
      return result;

    } catch (error) {
      console.error('❌ Error decaying old interests:', error);
      throw error;
    }
  }
}

module.exports = UserInterestTrackingService;
