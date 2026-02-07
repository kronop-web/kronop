const axios = require('axios');
const Content = require('../models/Content');
const RealtimeService = require('./realtimeService');
const { BUNNY_CONFIG } = require('../constants/Config');

class AutoSyncService {
  constructor() {
    this.lastSyncTimes = {};
    this.isRunning = false;
    this.syncInterval = null;
    this.errorWarnings = {}; // Track error warnings to prevent spam
  }

  // Initialize last sync times for all libraries
  initializeSyncTimes() {
    Object.keys(BUNNY_CONFIG).forEach(type => {
      this.lastSyncTimes[type] = new Date();
    });
    console.log('🕐 Auto-sync service initialized with sync times');
  }

  // Get videos from BunnyCDN Stream API
  async getBunnyStreamVideos(libraryId, apiKey, type) {
    try {
      const url = `https://video.bunnycdn.com/library/${libraryId}/videos`;
      const response = await axios.get(url, {
        headers: {
          'AccessKey': apiKey,
          'accept': 'application/json'
        }
      });
      
      // Handle both array and { items: [] } formats
      let items = [];
      if (Array.isArray(response.data)) {
        items = response.data;
      } else if (response.data && Array.isArray(response.data.items)) {
        items = response.data.items;
      } else {
        console.warn(`⚠️ Unexpected response format for ${type}:`, typeof response.data);
        return [];
      }
      
      // Reset error warning on successful sync
      if (this.errorWarnings[type]) {
        console.log(`✅ ${type} library sync recovered`);
        this.errorWarnings[type] = false;
      }
      
      return items;
    } catch (error) {
      // Enhanced error handling for 401 (API Key) errors
      if (error.response && error.response.status === 401) {
        // Only show warning once per error type
        if (!this.errorWarnings[type]) {
          console.warn(`⚠️ 401 Unauthorized for ${type} library ${libraryId}. API Key may be invalid.`);
          console.log(`🔧 To fix: Update API key for ${type} library in BUNNY_CONFIG`);
          this.errorWarnings[type] = true;
        }
        // Don't return empty array for 401, return null to indicate auth failure
        return null;
      } else if (error.response && error.response.status === 404) {
        // Only show warning once per error type
        if (!this.errorWarnings[type]) {
          console.warn(`⚠️ 404 Not Found for ${type} library ${libraryId}. Library may not exist.`);
          this.errorWarnings[type] = true;
        }
        return null;
      } else {
        console.error(`❌ Error fetching ${type} from BunnyCDN:`, error.message);
        return [];
      }
    }
  }

  // Get photos from BunnyCDN Storage API with Shayari injection
  async getBunnyPhotosWithShayari() {
    try {
      const config = BUNNY_CONFIG.photos;
      const url = `https://${config.host}/${config.storageZoneName}/`;
      const response = await axios.get(url, {
        headers: {
          'AccessKey': config.apiKey
        }
      });
      
      const photos = response.data || [];
      
      // Inject shayari after every 4 photos
      const photosWithShayari = [];
      for (let i = 0; i < photos.length; i++) {
        photosWithShayari.push(photos[i]);
        
        // Add shayari after every 4 photos (but not at the end)
        if ((i + 1) % 4 === 0 && i < photos.length - 1) {
          const shayariData = await this.getRandomShayari();
          if (shayariData) {
            photosWithShayari.push({
              ...shayariData,
              isShayariCard: true,
              ObjectName: `shayari_${Date.now()}`,
              Guid: `shayari_${Date.now()}`
            });
          }
        }
      }
      
      return photosWithShayari;
    } catch (error) {
      console.error('❌ Error fetching photos with shayari from BunnyCDN:', error.message);
      return [];
    }
  }

  // Get random shayari from database
  async getRandomShayari() {
    try {
      const shayari = await Content.aggregate([
        { $match: { type: 'ShayariPhoto', is_active: true } },
        { $sample: { size: 1 } }
      ]);
      
      if (shayari.length > 0) {
        return shayari[0];
      }
      
      // Fallback shayari if none in database
      return {
        title: 'Romantic Shayari',
        shayari_text: 'दिल की बात जुबां पर आना आसान नहीं है,\nहर किसी को अपनी मोहब्बत का इज़हार करना आसान नहीं है।',
        shayari_author: 'Anonymous',
        type: 'ShayariPhoto'
      };
    } catch (error) {
      console.error('❌ Error fetching random shayari:', error.message);
      return null;
    }
  }

  // Check if content already exists in MongoDB
  async contentExists(guid, type) {
    try {
      // Fix type conversion for checking
      const typeMap = {
        'reels': 'Reel',
        'video': 'Video', 
        'live': 'Live',
        'story': 'Story',
        'photos': 'Photo'
      };
      
      const contentType = typeMap[type] || 'Video';
      const existing = await Content.findOne({ 
        bunny_id: guid, 
        type: contentType
      });
      return !!existing;
    } catch (error) {
      console.error(`❌ Error checking content existence:`, error.message);
      return false;
    }
  }

  // Save new content to MongoDB
  async saveContentToDB(videoData, type) {
    try {
      // Fix type conversion: reels -> Reel, video -> Video, etc.
      const typeMap = {
        'reels': 'Reel',
        'video': 'Video', 
        'live': 'Live',
        'story': 'Story'
      };
      const contentType = typeMap[type] || 'Video';
      
      const newContent = new Content({
        title: videoData.title || `${contentType} - ${new Date().toLocaleString()}`,
        description: videoData.description || '',
        type: contentType,
        bunny_id: videoData.guid,
        url: `https://${BUNNY_CONFIG[type].host}/${videoData.guid}/playlist.m3u8`,
        thumbnail: `https://${BUNNY_CONFIG[type].host}/${videoData.guid}/thumbnail.jpg`,
        duration: videoData.length || 0,
        tags: videoData.tags || [],
        category: videoData.category || 'general',
        views: 0,
        likes: 0,
        is_active: true,
        user_id: null, // System content - use dummy user
        created_at: videoData.dateUploaded ? new Date(videoData.dateUploaded * 1000) : new Date()
      });

      await newContent.save();
      console.log(`✅ New ${contentType} saved: ${videoData.guid}`);
      return newContent;
    } catch (error) {
      console.error(`❌ Error saving ${type} to DB:`, error.message);
      return null;
    }
  }

  // Save photo to MongoDB
  async savePhotoToDB(photoData) {
    try {
      // Fix date validation for photos
      let createdAt;
      if (photoData.LastChanged) {
        createdAt = new Date(photoData.LastChanged);
        if (isNaN(createdAt.getTime())) {
          createdAt = new Date();
        }
      } else {
        createdAt = new Date();
      }
      
      const newContent = new Content({
        title: photoData.ObjectName || `Photo - ${new Date().toLocaleString()}`,
        description: '',
        type: 'Photo',
        bunny_id: photoData.Guid || photoData.ObjectName,
        url: `https://${BUNNY_CONFIG.photos.host}/${BUNNY_CONFIG.photos.storageZoneName}/${photoData.ObjectName}`,
        thumbnail: `https://${BUNNY_CONFIG.photos.host}/${BUNNY_CONFIG.photos.storageZoneName}/${photoData.ObjectName}`,
        tags: [],
        category: 'general',
        views: 0,
        likes: 0,
        is_active: true,
        user_id: null, // System content
        created_at: new Date(photoData.LastChanged || Date.now())
      });

      await newContent.save();
      console.log(`✅ New Photo saved: ${photoData.ObjectName}`);
      return newContent;
    } catch (error) {
      console.error(`❌ Error saving photo to DB:`, error.message);
      return null;
    }
  }

  // Sync specific library
  async syncLibrary(type) {
    try {
      console.log(`🔄 Syncing ${type} library...`);
      let newItemsCount = 0;
      let processedItems = 0;
      let skippedItems = 0;

      if (type === 'photos') {
        const photos = await this.getBunnyPhotosWithShayari();
        
        for (const photo of photos) {
          // Skip shayari cards for database storage (they're virtual)
          if (photo.isShayariCard) {
            console.log(`📝 Shayari card found in feed: ${photo.shayari_text.substring(0, 30)}...`);
            continue;
          }
          
          const photoKey = photo.Guid || photo.ObjectName;
          if (photoKey) {
            processedItems++;
            if (!(await this.contentExists(photoKey, 'photos'))) {
              const saved = await this.savePhotoToDB(photo);
              if (saved) newItemsCount++;
            } else {
              skippedItems++;
            }
          }
        }
      } else {
        const config = BUNNY_CONFIG[type];
        const response = await this.getBunnyStreamVideos(config.libraryId, config.apiKey, type);
        
        // Handle auth failures (null response) - skip this library but don't crash
        if (response === null) {
          console.log(`⚠️ Skipping ${type} sync due to authentication error`);
          this.lastSyncTimes[type] = new Date();
          return 0;
        }
        
        const videos = response.items || response || []; // Handle both response formats
        
        for (const video of videos) {
          if (video.guid) {
            processedItems++;
            if (!(await this.contentExists(video.guid, type))) {
              const saved = await this.saveContentToDB(video, type);
              if (saved) newItemsCount++;
            } else {
              skippedItems++;
            }
          }
        }
      }

      this.lastSyncTimes[type] = new Date();
      console.log(`✅ ${type} sync completed. Processed: ${processedItems}, New: ${newItemsCount}, Existing: ${skippedItems}`);
      return newItemsCount;
    } catch (error) {
      console.error(`❌ Error syncing ${type}:`, error.message);
      // Still update last sync time to prevent immediate retry
      this.lastSyncTimes[type] = new Date();
      return 0;
    }
  }

  // Main sync function - runs all libraries
  async performFullSync() {
    if (this.isRunning) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting full BunnyCDN auto-sync...');
    
    const startTime = Date.now();
    let totalNewItems = 0;
    const libraryNewItems = {};

    try {
      const libraries = ['reels', 'video', 'live', 'story', 'photos'];
      
      for (const library of libraries) {
        const newItems = await this.syncLibrary(library);
        totalNewItems += newItems;
        if (newItems > 0) {
          libraryNewItems[library] = newItems;
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      console.log(`🎉 Full sync completed in ${duration}s. Total new items: ${totalNewItems}`);
      
      // Only emit real-time update if there are actually NEW items (not just processed)
      if (totalNewItems > 0) {
        console.log(`📢 Broadcasting update: ${totalNewItems} new items available`, libraryNewItems);
        this.emitRealtimeUpdate(totalNewItems, libraryNewItems);
      } else {
        console.log('📊 No new items found, skipping broadcast');
      }
    } catch (error) {
      console.error('❌ Full sync error:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  // Emit real-time update to connected clients
  emitRealtimeUpdate(newItemsCount, libraryNewItems = {}) {
    if (newItemsCount > 0) {
      RealtimeService.notifySyncUpdate('completed', newItemsCount, libraryNewItems);
      console.log(`📢 Broadcasting update: ${newItemsCount} new items available`, libraryNewItems);
    }
  }

  // Start the auto-sync service
  start() {
    if (this.syncInterval) {
      console.log('⚠️ Auto-sync already running');
      return;
    }

    this.initializeSyncTimes();
    
    // Run initial sync
    this.performFullSync();
    
    // Set up recurring sync every 60 seconds
    this.syncInterval = setInterval(() => {
      this.performFullSync();
    }, 60000); // 60 seconds

    console.log('✅ Auto-sync service started - syncing every 60 seconds');
  }

  // Stop the auto-sync service
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Auto-sync service stopped');
    }
  }

  // Get sync status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTimes: this.lastSyncTimes,
      nextSyncIn: this.syncInterval ? '60 seconds' : 'Not running'
    };
  }
}

module.exports = new AutoSyncService();
