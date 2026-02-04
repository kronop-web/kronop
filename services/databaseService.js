const { mongoose, connectToDatabase } = require('../config/db');
const Content = require('../models/Content');
const User = require('../models/User');

class DatabaseService {
  static async connect() {
    await connectToDatabase();
  }

  // --- User Methods ---
  static async findUserByPhone(phone) {
    await this.connect();
    return await User.findOne({ phone });
  }

  static async findUserByEmail(email) {
    await this.connect();
    return await User.findOne({ email });
  }

  static async createUser(userData) {
    await this.connect();
    // Generate dummy phone if not provided to satisfy unique index if necessary, 
    // though we made it sparse/optional in schema.
    // If phone is missing, we just don't include it.
    
    // Safety check: if schema still requires phone strictly (due to old index),
    // we might need to handle it. But assuming schema update works:
    const user = new User(userData);
    return await user.save();
  }

  static async updateUser(userId, updateData) {
    await this.connect();
    return await User.findByIdAndUpdate(userId, updateData, { new: true });
  }

  static async findUserBySupabaseId(supabaseId) {
    await this.connect();
    return await User.findOne({ supabase_id: supabaseId });
  }

  static async getUserById(userId) {
    await this.connect();
    return await User.findById(userId);
  }

  // --- Content Methods ---
  static async createContent(contentData) {
    await this.connect();
    try {
      // Fix date validation - handle Invalid Date properly
      if (contentData.created_at) {
        const testDate = new Date(contentData.created_at);
        if (isNaN(testDate.getTime())) {
          console.warn(`⚠️ Invalid created_at in DatabaseService: ${contentData.created_at}, using current time`);
          contentData.created_at = new Date();
        }
      } else {
        contentData.created_at = new Date();
      }
      
      // Also validate createdAt if provided
      if (contentData.createdAt) {
        const testDate = new Date(contentData.createdAt);
        if (isNaN(testDate.getTime())) {
          console.warn(`⚠️ Invalid createdAt in DatabaseService: ${contentData.createdAt}, using current time`);
          contentData.createdAt = new Date();
        }
      }
      
      const content = new Content(contentData);
      return await content.save();
    } catch (error) {
      throw new Error(`Failed to create content: ${error.message}`);
    }
  }

  static async getContentByType(type, page = 1, limit = 5, skip = 0) {
    await this.connect();
    try {
      const actualSkip = skip || (page - 1) * limit;
      return await Content.find({ type })
        .sort({ created_at: -1 })
        .skip(actualSkip)
        .limit(limit)
        .populate('user_id', 'username avatar')
        .lean();
    } catch (error) {
      throw new Error(`Failed to get content by type: ${error.message}`);
    }
  }

  static async getContentCount(type) {
    await this.connect();
    try {
      return await Content.countDocuments({ type });
    } catch (error) {
      throw new Error(`Failed to get content count: ${error.message}`);
    }
  }

  static async getUserContent(userId, type = null) {
    await this.connect();
    try {
      const query = { user_id: userId };
      if (type) {
        query.type = type;
      }
      return await Content.find(query)
        .sort({ created_at: -1 })
        .populate('user_id', 'username avatar')
        .lean();
    } catch (error) {
      throw new Error(`Failed to get user content: ${error.message}`);
    }
  }

  static async updateContent(contentId, updateData) {
    await this.connect();
    try {
      return await Content.findByIdAndUpdate(
        contentId,
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Failed to update content: ${error.message}`);
    }
  }

  static async deleteContent(contentId) {
    await this.connect();
    try {
      return await Content.findByIdAndUpdate(
        contentId,
        { is_active: false },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to delete content: ${error.message}`);
    }
  }

  static async findContentByBunnyId(bunnyId) {
    await this.connect();
    try {
      return await Content.findOne({ bunny_id: bunnyId });
    } catch (error) {
      throw new Error(`Failed to find content by bunny ID: ${error.message}`);
    }
  }

  static async syncFromBunnyCDN(bunnyData, type) {
    await this.connect();
    try {
      const syncPromises = bunnyData.map(async (item) => {
        const existingContent = await Content.findOne({ bunny_id: item.guid });
        
        if (!existingContent) {
          return await this.createContent({
            title: item.title || '',
            type: type,
            bunny_id: item.guid,
            url: item.url || '',
            thumbnail: item.thumbnailUrl || '',
            description: item.description || '',
            tags: item.tags || [],
            created_at: new Date(item.dateUploaded)
          });
        }
        return existingContent;
      });

      return await Promise.all(syncPromises);
    } catch (error) {
      throw new Error(`Failed to sync from BunnyCDN: ${error.message}`);
    }
  }

  static async getExpiredStories() {
    await this.connect();
    try {
      return await Content.find({
        type: 'Story',
        expires_at: { $lte: new Date() }
      });
    } catch (error) {
      throw new Error(`Failed to get expired stories: ${error.message}`);
    }
  }

  static async deactivateExpiredStories() {
    await this.connect();
    try {
      return await Content.updateMany(
        {
          type: 'Story',
          expires_at: { $lte: new Date() }
        },
        { is_active: false }
      );
    } catch (error) {
      throw new Error(`Failed to deactivate expired stories: ${error.message}`);
    }
  }

  static async getActiveLiveStreams() {
    await this.connect();
    try {
      return await Content.find({
        type: 'Live'
      }).sort({ created_at: -1 });
    } catch (error) {
      throw new Error(`Failed to get active live streams: ${error.message}`);
    }
  }

  static async incrementViews(contentId) {
    await this.connect();
    try {
      return await Content.findByIdAndUpdate(
        contentId,
        { $inc: { views: 1 } },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to increment views: ${error.message}`);
    }
  }

  static async incrementLikes(contentId) {
    await this.connect();
    try {
      return await Content.findByIdAndUpdate(
        contentId,
        { $inc: { likes: 1 } },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to increment likes: ${error.message}`);
    }
  }

  // --- Saved Content Methods ---
  static async getSavedContent(userId, page = 1, limit = 20) {
    await this.connect();
    try {
      const skip = (page - 1) * limit;
      
      // Find user's saved content
      const user = await User.findById(userId).populate({
        path: 'savedContent',
        options: { 
          sort: { savedAt: -1 },
          skip: skip,
          limit: limit 
        }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.savedContent || [];
    } catch (error) {
      throw new Error(`Failed to get saved content: ${error.message}`);
    }
  }

  static async saveContent(userId, contentId, contentType) {
    await this.connect();
    try {
      // Find the content
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error('Content not found');
      }
      
      // Update user's saved content array
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          $addToSet: { savedContent: contentId },
          $set: { 'savedContent.$.savedAt': new Date() }
        },
        { new: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return { success: true, contentId, savedAt: new Date() };
    } catch (error) {
      throw new Error(`Failed to save content: ${error.message}`);
    }
  }

  static async unsaveContent(userId, contentId) {
    await this.connect();
    try {
      // Remove content from user's saved array
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { savedContent: contentId } },
        { new: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return { success: true, contentId, removedAt: new Date() };
    } catch (error) {
      throw new Error(`Failed to remove saved content: ${error.message}`);
    }
  }
}

module.exports = DatabaseService;
