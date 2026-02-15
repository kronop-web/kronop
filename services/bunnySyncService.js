const axios = require('axios');
const DatabaseService = require('./databaseService');
const { BUNNY_CONFIG, LIBRARY_ID_MAP } = require('./config/bunnyConfig');

class BunnySyncService {
  static async verifyVideoExists(videoGuid, type) {
    try {
      const config = BUNNY_CONFIG[type.toLowerCase()];
      if (!config || !config.libraryId) {
        return false;
      }

      const response = await axios.get(
        `https://video.bunnycdn.com/library/${config.libraryId}/videos/${videoGuid}`,
        {
          headers: {
            'AccessKey': config.apiKey,
            'accept': 'application/json'
          }
        }
      );

      return response.status === 200 && response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`❌ Video ${videoGuid} not found in BunnyCDN`);
        return false;
      }
      console.error(`Error verifying video ${videoGuid}:`, error.message);
      return false;
    }
  }

  static async verifyVideoUrlExists(videoUrl) {
    try {
      const response = await axios.head(videoUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      return response.status === 200;
    } catch (error) {
      console.log(`❌ Video URL not accessible: ${videoUrl}`);
      return false;
    }
  }

  static async cleanupMissingVideos(type) {
    try {
      console.log(`🔍 Starting cleanup for ${type} videos...`);
      
      // Get all videos from MongoDB - FIXED: Use new getAllContent function
      const mongoVideos = await DatabaseService.getAllContent();
      let deletedCount = 0;
      let verifiedCount = 0;

      for (const video of mongoVideos) {
        let existsInBunny = false;
        
        // Try to verify by GUID first
        if (video.videoId || video.guid) {
          const videoGuid = video.videoId || video.guid;
          existsInBunny = await this.verifyVideoExists(videoGuid, type);
        }
        
        // If GUID verification fails, try URL verification
        if (!existsInBunny && video.url) {
          existsInBunny = await this.verifyVideoUrlExists(video.url);
        }

        if (!existsInBunny) {
          // Delete from MongoDB if not found in BunnyCDN
          await DatabaseService.deleteContent(video._id, type);
          console.log(`🗑️ Deleted missing ${type} video: ${video.title || video._id}`);
          deletedCount++;
        } else {
          verifiedCount++;
        }
      }

      console.log(`✅ Cleanup complete for ${type}:`);
      console.log(`   - Verified: ${verifiedCount} videos`);
      console.log(`   - Deleted: ${deletedCount} missing videos`);
      
      return {
        type,
        total: mongoVideos.length,
        verified: verifiedCount,
        deleted: deletedCount
      };
    } catch (error) {
      console.error(`❌ Cleanup failed for ${type}:`, error.message);
      throw error;
    }
  }

  static async cleanupAllMissingVideos() {
    try {
      console.log('🚀 Starting comprehensive cleanup of missing videos...');
      
      const results = {
        reels: await this.cleanupMissingVideos('Reel'),
        video: await this.cleanupMissingVideos('Video'),
        live: await this.cleanupMissingVideos('Live'),
        story: await this.cleanupMissingVideos('Story')
      };

      const totalDeleted = Object.values(results).reduce((sum, result) => sum + result.deleted, 0);
      const totalVerified = Object.values(results).reduce((sum, result) => sum + result.verified, 0);

      console.log('🎉 Comprehensive cleanup completed:');
      console.log(`   - Total verified videos: ${totalVerified}`);
      console.log(`   - Total deleted missing videos: ${totalDeleted}`);
      
      return results;
    } catch (error) {
      console.error('❌ Comprehensive cleanup failed:', error.message);
      throw error;
    }
  }

  static async syncAndCleanup() {
    try {
      console.log('🔄 Starting Sync & Cleanup process...');
      
      // Step 1: Sync from BunnyCDN
      console.log('Step 1: Syncing from BunnyCDN...');
      const syncResults = await this.syncAllContent();
      
      // Step 2: Cleanup missing videos
      console.log('Step 2: Cleaning up missing videos...');
      const cleanupResults = await this.cleanupAllMissingVideos();
      
      console.log('✅ Sync & Cleanup completed successfully');
      
      return {
        sync: syncResults,
        cleanup: cleanupResults,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Sync & Cleanup failed:', error.message);
      throw error;
    }
  }
  static async fetchVideosFromBunny(type) {
    try {
      const config = BUNNY_CONFIG[type.toLowerCase()];
      if (!config || !config.libraryId) {
        throw new Error(`Invalid type: ${type}`);
      }

      const response = await axios.get(
        `https://video.bunnycdn.com/library/${config.libraryId}/videos`,
        {
          headers: {
            'AccessKey': config.apiKey,
            'accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch ${type} from BunnyCDN: ${error.message}`);
    }
  }

  static async fetchPhotosFromBunny() {
    try {
      const config = BUNNY_CONFIG.photos;
      const response = await axios.get(
        `https://${config.host}/${config.storageZoneName}/`,
        {
          headers: {
            'AccessKey': config.apiKey,
            'accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch photos from BunnyCDN: ${error.message}`);
    }
  }

  static async syncAllContent() {
    try {
      const results = {
        reels: await this.syncContentType('Reel'),
        video: await this.syncContentType('Video'),
        live: await this.syncContentType('Live'),
        story: await this.syncContentType('Story'),
        photos: await this.syncPhotos()
      };

      return results;
    } catch (error) {
      throw new Error(`Failed to sync all content: ${error.message}`);
    }
  }

  static async syncContentType(type) {
    try {
      const bunnyData = await this.fetchVideosFromBunny(type);
      const syncedData = await DatabaseService.syncFromBunnyCDN(bunnyData, type);
      
      console.log(`Synced ${syncedData.length} ${type} items`);
      return syncedData;
    } catch (error) {
      console.error(`Failed to sync ${type}:`, error.message);
      return [];
    }
  }

  static async syncPhotos() {
    try {
      const bunnyData = await this.fetchPhotosFromBunny();
      const photoData = bunnyData.map(item => ({
        guid: item.Guid,
        title: item.ObjectName,
        url: `https://${BUNNY_CONFIG.photos.host}/${BUNNY_CONFIG.photos.storageZoneName}/${item.ObjectName}`,
        thumbnailUrl: null,
        dateUploaded: item.LastChanged,
        description: '',
        tags: []
      }));

      const syncedData = await DatabaseService.syncFromBunnyCDN(photoData, 'Photo');
      console.log(`Synced ${syncedData.length} photos`);
      return syncedData;
    } catch (error) {
      console.error('Failed to sync photos:', error.message);
      return [];
    }
  }

  static async scheduleSync() {
    setInterval(async () => {
      try {
        console.log('🔄 Starting scheduled sync & cleanup...');
        await this.syncAndCleanup();
        await DatabaseService.deactivateExpiredStories();
        console.log('✅ Scheduled sync & cleanup completed');
      } catch (error) {
        console.error('❌ Scheduled sync & cleanup failed:', error.message);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  static async scheduleCleanupOnly() {
    setInterval(async () => {
      try {
        console.log('🧹 Starting scheduled cleanup...');
        await this.cleanupAllMissingVideos();
        console.log('✅ Scheduled cleanup completed');
      } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error.message);
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  static async validateVideoBeforeShow(video) {
    try {
      // Quick URL validation before showing in app
      if (!video.url) {
        return false;
      }

      const exists = await this.verifyVideoUrlExists(video.url);
      if (!exists) {
        console.log(`🚫 Video not accessible, removing from display: ${video.title || video._id}`);
        // Optionally delete from MongoDB immediately
        await DatabaseService.deleteContent(video._id, video.type);
      }
      
      return exists;
    } catch (error) {
      console.error('Error validating video before show:', error.message);
      return false;
    }
  }
}

module.exports = BunnySyncService;
