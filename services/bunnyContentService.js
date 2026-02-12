const axios = require('axios');
const mongoose = require('mongoose');
const DatabaseService = require('./databaseService');
const { config } = require('./config/koyebConfig');
const bunnyConfig = require('../config/bunnyConfig');
require('dotenv').config();

// LIBRARY_ID_MAP - FIXED: Add proper mapping
const LIBRARY_ID_MAP = {
  '593793': 'Reel',
  '593795': 'Video', 
  '594452': 'Live'
};

let redisClient = null;
const REDIS_TTL_SECONDS = parseInt(process.env.REDIS_TTL_SECONDS || '30', 10);

// IP logic removed

// Use centralized configuration
const BUNNY_API_KEY = bunnyConfig.getMasterApiKey();
const BUNNY_ACCESS_KEY = process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY || process.env.BUNNY_ACCESS_KEY || '';
const BUNNY_ACCESS_KEY_REELS = process.env.EXPO_PUBLIC_BUNNY_REELS_ACCESS_KEY || process.env.BUNNY_REELS_ACCESS_KEY || '';
const BUNNY_ACCESS_KEY_VIDEO = process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ACCESS_KEY_VIDEO || process.env.BUNNY_LIBRARY_ACCESS_KEY_VIDEO || '';
const BUNNY_ACCESS_KEY_LIVE = process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ACCESS_KEY_LIVE || process.env.BUNNY_LIBRARY_ACCESS_KEY_LIVE || '';
const BUNNY_PHOTO_STORAGE_KEY = process.env.EXPO_PUBLIC_BUNNY_PHOTO_STORAGE_KEY || process.env.BUNNY_PHOTO_STORAGE_KEY || '';
const BUNNY_SHAYARI_STORAGE_KEY = process.env.EXPO_PUBLIC_BUNNY_SHAYARI_STORAGE_KEY || process.env.BUNNY_SHAYARI_STORAGE_KEY || '';
const BUNNY_ACCESS_KEY_STORY = process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_STORY || process.env.BUNNY_ACCESS_KEY_STORY || BUNNY_API_KEY;

try {
  const redis = require('redis');
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisClient = redis.createClient({ url: redisUrl });
    redisClient.on('error', (err) => {
      console.error('Redis client error:', err.message);
    });
    redisClient.connect().catch((err) => {
      console.error('Redis connection failed:', err.message);
      redisClient = null;
    });
  } else {
    console.warn('REDIS_URL not set, skipping Redis caching');
  }
} catch (_e) {
  console.warn('Redis module not available, skipping Redis caching');
}

const makeCacheKey = (prefix, type, page, limit, fields) => {
  const fieldPart = Array.isArray(fields) && fields.length ? fields.sort().join(',') : 'all';
  return `${prefix}:${type}:${page}:${limit}:${fieldPart}`;
};

class BunnyContentService {
  constructor() {
    // Load Bunny CDN configuration from environment variables
    this.BUNNY_CONFIG = {
      reels: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || process.env.BUNNY_LIBRARY_ID_REELS || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || process.env.BUNNY_HOST_REELS || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_REELS || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      video: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || process.env.BUNNY_LIBRARY_ID_VIDEO || '', 
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || process.env.BUNNY_HOST_VIDEO || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_VIDEO || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      live: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || process.env.BUNNY_LIBRARY_ID_LIVE || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || process.env.BUNNY_HOST_LIVE || '', 
        apiKey: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ACCESS_KEY_LIVE || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      story: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_STORY || process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_STORY || process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      photos: {
        storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO || process.env.BUNNY_STORAGE_ZONE || '',
        host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO || process.env.BUNNY_HOST_PHOTOS || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_PHOTO_STORAGE_KEY || process.env.BUNNY_PHOTO_STORAGE_KEY || ''
      }
    };
  }

  // Static configuration for static methods
  static get BUNNY_CONFIG() {
    return {
      reels: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || process.env.BUNNY_LIBRARY_ID_REELS || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || process.env.BUNNY_HOST_REELS || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_REELS || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      video: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || process.env.BUNNY_LIBRARY_ID_VIDEO || '', 
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || process.env.BUNNY_HOST_VIDEO || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_VIDEO || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      live: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || process.env.BUNNY_LIBRARY_ID_LIVE || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || process.env.BUNNY_HOST_LIVE || '', 
        apiKey: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ACCESS_KEY_LIVE || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      story: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_STORY || process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_STORY || process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      photos: {
        storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO || process.env.BUNNY_STORAGE_ZONE || '',
        host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO || process.env.BUNNY_HOST_PHOTOS || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_PHOTO_STORAGE_KEY || process.env.BUNNY_PHOTO_STORAGE_KEY || ''
      }
    };
  }

  // ==================== AUTO CATEGORIZATION ====================

  static identifyCategory(title, libraryId) {
    const titleLower = (title || '').toLowerCase();
    
    console.log(`🔍 Identifying category for: "${title}" (Library: ${libraryId})`);
    
    // Library ID based identification - USING CENTRALIZED CONFIG
    if (LIBRARY_ID_MAP[libraryId]) {
      const category = LIBRARY_ID_MAP[libraryId];
      console.log(`✅ Library-based category: ${category}`);
      return category;
    }
    
    // For photos, check if it's from photos storage
    if (libraryId === 'photos' || titleLower.includes('photo') || titleLower.includes('jpg') || titleLower.includes('png') || titleLower.includes('image')) {
      console.log('✅ Photo detected by title/extension');
      return 'Photo'; // Return EXACT enum value
    }
    
    // Title based identification - FALLBACK ONLY
    if (titleLower.includes('reel') || titleLower.includes('short') || titleLower.includes('instagram')) {
      console.log('✅ Reel detected by title');
      return 'Reel';
    } else if (titleLower.includes('live') || titleLower.includes('stream') || titleLower.includes('realtime')) {
      console.log('✅ Live detected by title');
      return 'Live';
    } else if (titleLower.includes('story') || titleLower.includes('24h') || titleLower.includes('temporary')) {
      console.log('✅ Story detected by title');
      return 'Story';
    } else {
      console.log('⚠️ Defaulting to Video');
      return 'Video';
    }
  }
  
  // ==================== BUNNYCDN FETCH ====================
  
  static async fetchVideosFromBunny(libraryId, apiKey) {
    try {
      if (!libraryId || String(libraryId).includes('...')) {
        throw new Error('Invalid Bunny Video libraryId');
      }
      if (!apiKey || String(apiKey).trim().length === 0) {
        throw new Error('Missing Bunny Video AccessKey');
      }
      console.log(`🔍 Fetching from BunnyCDN: Library ${libraryId}, API Key: ${apiKey ? apiKey.substring(0, 20) + '...' : 'MISSING'}`);
      console.log(`🔗 Full API URL: https://video.bunnycdn.com/library/${libraryId}/videos`);
      
      // LIBRARY-BASED KEY LOGIC: Use the specific API key passed to this function
      console.log(`🔑 Using Specific API Key: ${apiKey ? apiKey.substring(0, 20) + '...' : 'MISSING'}`);
      
      // HEADER UPDATE: Only AccessKey header (no Authorization)
      const headers = {
        'AccessKey': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      console.log(`📡 API Headers: AccessKey=${apiKey ? apiKey.substring(0, 20) + '...' : 'MISSING'}`);
      
      const url = `https://video.bunnycdn.com/library/${libraryId}/videos`;
      
      let response = null;
      let lastError = null;
      
      try {
        console.log(`🔄 Trying endpoint: ${url}`);
        response = await axios.get(url, {
          headers: headers,
          timeout: 10000
        });
        console.log(`✅ Success with endpoint: ${url}`);
      } catch (err) {
        console.log(`❌ Failed endpoint ${url}: ${err.message}`);
        lastError = err;
      }
      
      if (!response) {
        throw lastError || new Error('All endpoints failed');
      }
      
      console.log(`✅ BunnyCDN Response Status: ${response.status}, Data Type: ${Array.isArray(response.data) ? 'Array' : typeof response.data}`);
      console.log(`📊 Response Data Sample:`, JSON.stringify(response.data).substring(0, 200));

      // Support both array and { items: [] } formats
      let items = [];
      
      if (Array.isArray(response.data)) {
        items = response.data;
      } else if (response.data && Array.isArray(response.data.items)) {
        items = response.data.items;
      } else {
        console.log('Response data:', response.data);
        throw new Error('Invalid response format from BunnyCDN API - expected array or { items: [] }');
      }
      
      if (!Array.isArray(items)) {
        console.log('Response data:', response.data);
        throw new Error('Invalid response format from BunnyCDN API');
      }

      const host = BunnyContentService.resolveHostForLibrary(libraryId);
      return items.map(video => {
        const guid = video.guid || video.Guid || video.id;
        const title = video.title || video.Name || '';
        const thumbFile = video.thumbnailFileName || 'thumbnail.jpg';
        const thumbnailUrl = host && guid ? `https://${host}/${guid}/${thumbFile}` : '';
        return {
          guid,
          title,
          libraryId: libraryId,
          dateUploaded: video.dateUploaded || video.createdAt || video.dateUploadedAt,
          description: video.description || '',
          tags: video.tags || [],
          duration: video.length || video.duration,
          storageSize: video.storageSize,
          capturedAt: video.capturedAt,
          thumbnailUrl,
          playbackUrl: this.generatePlaybackUrl(guid, libraryId)
        };
      });
    } catch (error) {
      throw new Error(`Failed to fetch videos from BunnyCDN: ${error.message}`);
    }
  }
  
  static async fetchStoriesFromStorage() {
    try {
      const config = this.BUNNY_CONFIG.story;
      // Use video API for stories, not storage
      const response = await axios.get(
        `https://video.bunnycdn.com/library/${config.libraryId}/videos`,
        {
          headers: {
            'AccessKey': config.apiKey,
            'accept': 'application/json'
          }
        }
      );

      // Handle response format
      let items = [];
      if (Array.isArray(response.data)) {
        items = response.data;
      } else if (response.data && Array.isArray(response.data.items)) {
        items = response.data.items;
      } else {
        throw new Error('Invalid response format from BunnyCDN API');
      }

      return items.map(story => ({
        guid: story.guid || story.Guid,
        title: story.title || story.Name || 'Untitled Story',
        libraryId: config.libraryId,
        dateUploaded: story.dateUploaded || story.createdAt,
        description: story.description || '',
        tags: story.tags || [],
        storageSize: story.storageSize || 0,
        thumbnailUrl: `https://${config.host}/${story.guid}/thumbnail.jpg`,
        playbackUrl: `https://${config.host}/${story.guid}/playlist.m3u8`
      }));
    } catch (error) {
      throw new Error(`Failed to fetch stories from BunnyCDN: ${error.message}`);
    }
  }

  static async fetchPhotosFromBunny() {
    try {
      // FIXED: Use centralized config instead of old BUNNY_CONFIG
      const config = bunnyConfig.getSectionConfig('photos');
      if (!config) {
        throw new Error('Photos configuration not found');
      }
      
      console.log(`🔑 Using photos config: Storage=${config.storageZoneName}, Host=${config.host}, Key=${config.storageAccessKey ? config.storageAccessKey.substring(0, 20) + '...' : 'MISSING'}`);
      
      // Note: This still fetches from Bunny API to get the list, 
      // but we map the URLs to local server for the database.
      const response = await axios.get(
        `https://${config.host}/${config.storageZoneName}/`,
        {
          headers: {
            'AccessKey': config.storageAccessKey, // FIXED: Use storageAccessKey
            'accept': 'application/json'
          }
        }
      );

      return response.data.map(photo => ({
        guid: photo.Guid,
        title: photo.ObjectName,
        libraryId: 'photos',
        dateUploaded: photo.LastChanged,
        description: '',
        tags: [],
        storageSize: photo.Length,
        thumbnailUrl: config.host ? `https://${config.host}/${photo.ObjectName}` : '',
        playbackUrl: config.host ? `https://${config.host}/${photo.ObjectName}` : ''
      }));
    } catch (error) {
      throw new Error(`Failed to fetch photos from BunnyCDN: ${error.message}`);
    }
  }
  
  // ==================== URL GENERATORS ====================
  
  static generateThumbnailUrl(guid, libraryId) {
    const configs = this.BUNNY_CONFIG;
    const libraryIdStr = String(libraryId);
    const config =
      configs.reels.libraryId === libraryIdStr
        ? configs.reels
        : configs.video.libraryId === libraryIdStr
        ? configs.video
        : configs.live.libraryId === libraryIdStr
        ? configs.live
        : configs.story.libraryId === libraryIdStr
        ? configs.story
        : null;

    if (config && config.host) {
      return `https://${config.host}/${guid}/thumbnail.jpg`;
    }

    return '';
  }
  
  static generatePlaybackUrl(guid, libraryId) {
    const configs = this.BUNNY_CONFIG;
    const libraryIdStr = String(libraryId);
    const config =
      configs.reels.libraryId === libraryIdStr
        ? configs.reels
        : configs.video.libraryId === libraryIdStr
        ? configs.video
        : configs.live.libraryId === libraryIdStr
        ? configs.live
        : configs.story.libraryId === libraryIdStr
        ? configs.story
        : null;

    if (config && config.host) {
      return `https://${config.host}/${guid}/playlist.m3u8`;
    }

    return '';
  }
  
  static resolveHostForLibrary(libraryId) {
    const configs = this.BUNNY_CONFIG;
    const id = String(libraryId);
    if (configs.reels.libraryId === id) return configs.reels.host;
    if (configs.video.libraryId === id) return configs.video.host;
    if (configs.live.libraryId === id) return configs.live.host;
    if (configs.story.libraryId === id) return configs.story.host;
    return null;
  }
  
  // ==================== SMART SYNC ====================
  
  static async syncAllContent() {
    try {
      console.log('🚀 Starting BunnyCDN sync...');
      
      // Check database connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database Connection Error - MongoDB is not connected');
      }
      
      const results = {
        reels: await BunnyContentService.syncContentType('reels'),
        video: await BunnyContentService.syncContentType('video'),
        live: await BunnyContentService.syncContentType('live'),
        story: await BunnyContentService.syncContentType('story'),
        photos: await BunnyContentService.syncPhotos()
      };

      const totalSynced = Object.values(results).reduce((sum, result) => sum + result.length, 0);
      console.log(`✅ Sync completed! Total items: ${totalSynced}`);
      
      return results;
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      throw error;
    }
  }
  
  static async syncContentType(type) {
    try {
      // FIXED: Use centralized config instead of old BUNNY_CONFIG
      const config = bunnyConfig.getSectionConfig(type);
      if (!config) {
        throw new Error(`Invalid content type: ${type}`);
      }
      if (!config.apiKey || String(config.apiKey).trim().length === 0) {
        throw new Error(`Missing AccessKey for ${type}`);
      }
      
      if (!config.libraryId || String(config.libraryId).includes('...')) {
        throw new Error(`Invalid libraryId for ${type}`);
      }

      console.log(`📥 Fetching ${type} from BunnyCDN...`);
      console.log(`🔑 Using config for ${type}: Library=${config.libraryId}, Key=${config.apiKey.substring(0, 20)}...`);
      
      const bunnyData = await BunnyContentService.fetchVideosFromBunny(config.libraryId, config.apiKey);
      
      console.log(`🔄 Processing ${bunnyData.length} ${type} items...`);
      const syncedData = await BunnyContentService.processAndSaveContent(bunnyData);
      
      console.log(`✅ Synced ${syncedData.newItems.length} new ${type}, ${syncedData.existingItems} existing`);
      return syncedData.newItems;
    } catch (error) {
      console.error(`❌ Failed to sync ${type}:`, error.message);
      return [];
    }
  }
  
  static async syncPhotos() {
    try {
      console.log('📥 Fetching photos from BunnyCDN...');
      const bunnyData = await BunnyContentService.fetchPhotosFromBunny();
      
      console.log(`🔄 Processing ${bunnyData.length} photos...`);
      
      // Process photos with explicit type
      const newItems = [];
      let existingItems = 0;

      for (const item of bunnyData) {
        try {
          console.log(`🔍 Processing photo: "${item.title}" (GUID: ${item.guid})`);
          
          // Force type to Photo for all photos
          const category = 'Photo';
          
          // Check if already exists
          const existingContent = await DatabaseService.findContentByBunnyId(item.guid);
          
          if (!existingContent) {
            // Prepare content data for database
            // Fix Date Validation - Handle Invalid Date properly
            let createdAt;
            if (item.dateUploaded) {
              createdAt = new Date(item.dateUploaded);
              // Check if date is valid
              if (isNaN(createdAt.getTime())) {
                console.warn(`⚠️ Invalid dateUploaded for ${item.title}: ${item.dateUploaded}, using current time`);
                createdAt = new Date();
              }
            } else {
              createdAt = new Date();
            }
            
            const contentData = {
              title: item.title || 'Untitled Photo',
              type: category, // Force to Photo
              bunny_id: item.guid || `photo_${Date.now()}_${Math.random()}`,
              url: item.playbackUrl,
              thumbnail: item.thumbnailUrl,
              description: item.description || '',
              duration: 0,
              tags: item.tags || [],
              created_at: createdAt, // Fixed: Use validated date
              user_id: process.env.DEFAULT_USER_ID || null // Default user ID from environment
            };

            console.log(`💾 Saving photo: ${contentData.title}`);
            const savedContent = await DatabaseService.createContent(contentData);
            newItems.push(savedContent);
          } else {
            existingItems++;
            console.log(`⏭️ Photo already exists: ${item.title}`);
          }
        } catch (error) {
          console.error(`❌ Failed to process photo ${item.guid}:`, error.message);
        }
      }

      console.log(`✅ Synced ${newItems.length} new photos, ${existingItems} existing`);
      return newItems;
    } catch (error) {
      console.error('❌ Failed to sync photos:', error.message);
      return [];
    }
  }
  
  static async processAndSaveContent(bunnyData) {
    const newItems = [];
    let existingItems = 0;

    for (const item of bunnyData) {
      try {
        // Auto-identify category
        const category = BunnyContentService.identifyCategory(item.title, item.libraryId);
        
        // Check if already exists
        const existingContent = await DatabaseService.findContentByBunnyId(item.guid);
        
        if (!existingContent) {
          // Fix Date Validation - Handle Invalid Date properly
          let createdAt;
          if (item.dateUploaded) {
            createdAt = new Date(item.dateUploaded);
            // Check if date is valid
            if (isNaN(createdAt.getTime())) {
              console.warn(`⚠️ Invalid dateUploaded for ${item.title}: ${item.dateUploaded}, using current time`);
              createdAt = new Date();
            }
          } else {
            createdAt = new Date();
          }
          
          // Prepare content data for database
          const contentData = {
            title: item.title || 'Untitled',
            type: category, // Fixed: Use exact enum values
            bunny_id: item.guid || `content_${Date.now()}_${Math.random()}`,
            url: item.playbackUrl,
            thumbnail: item.thumbnailUrl,
            description: item.description || '',
            duration: item.duration || 0,
            tags: item.tags || [],
            created_at: createdAt, // Fixed: Use validated date
            user_id: process.env.DEFAULT_USER_ID || null // Default user ID from environment
          };

          // Add expiration for stories
          if (category === 'Story') {
            contentData.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          }

          const savedContent = await DatabaseService.createContent(contentData);
          newItems.push(savedContent);
        } else {
          existingItems++;
        }
      } catch (error) {
        console.error(`❌ Failed to process item ${item.guid}:`, error.message);
      }
    }

    return { newItems, existingItems };
  }
  
  // ==================== FRONTEND READY DATA ====================
  
  static async getContentForFrontend(type, page = 1, limit = 20, fields = null) {
    try {
      const cacheKey = makeCacheKey('frontend:single', type, page, limit, fields);
      
      if (redisClient) {
        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (err) {
          console.error('Redis get error:', err.message);
        }
      }

      const content = await DatabaseService.getContentByType(type, page, limit);
      const baseItems = content.map(item => ({
        id: item._id,
        title: item.title,
        type: item.type,
        url: item.url,
        thumbnail: item.thumbnail,
        description: item.description,
        duration: item.duration || 0,
        tags: item.tags,
        views: item.views,
        likes: item.likes,
        created_at: item.created_at,
        user: item.user_id
      }));

      if (!fields) {
        if (redisClient) {
          try {
            await redisClient.setEx(cacheKey, REDIS_TTL_SECONDS, JSON.stringify(baseItems));
          } catch (err) {
            console.error('Redis setEx error:', err.message);
          }
        }
        return baseItems;
      }

      const fieldSet = new Set(fields);
      const filteredItems = baseItems.map(item => {
        const filtered = {};
        fieldSet.forEach(key => {
          if (key in item) {
            filtered[key] = item[key];
          }
        });
        return filtered;
      });

      if (redisClient) {
        try {
          await redisClient.setEx(cacheKey, REDIS_TTL_SECONDS, JSON.stringify(filteredItems));
        } catch (err) {
          console.error('Redis setEx error:', err.message);
        }
      }

      return filteredItems;
    } catch (error) {
      throw new Error(`Failed to get content for frontend: ${error.message}`);
    }
  }
  
  static async getAllContentForFrontend(page = 1, limit = 20, fields = null) {
    try {
      const types = ['Reel', 'Video', 'Live', 'Photo', 'Story'];
      const results = {};
      const cacheKey = makeCacheKey('frontend:all', 'all', page, limit, fields);
      
      if (redisClient) {
        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (err) {
          console.error('Redis get error:', err.message);
        }
      }
      
      for (const type of types) {
        results[type.toLowerCase()] = await BunnyContentService.getContentForFrontend(type, page, limit, fields);
      }

      if (redisClient) {
        try {
          await redisClient.setEx(cacheKey, REDIS_TTL_SECONDS, JSON.stringify(results));
        } catch (err) {
          console.error('Redis setEx error:', err.message);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to get all content for frontend: ${error.message}`);
    }
  }
  
  // ==================== SCHEDULED SYNC ====================
  
  static async scheduleSync(intervalMinutes = 5) {
    console.log(`⏰ Scheduling sync every ${intervalMinutes} minutes...`);
    
    setInterval(async () => {
      try {
        console.log('🔄 Starting scheduled sync...');
        await this.syncAllContent();
        await DatabaseService.deactivateExpiredStories();
        console.log('✅ Scheduled sync completed');
      } catch (error) {
        console.error('❌ Scheduled sync failed:', error.message);
        // Don't throw error to prevent sync from stopping
      }
    }, intervalMinutes * 60 * 1000);
  }
  
  // ==================== UTILITY METHODS ====================
  
  static async forceSyncAll() {
    console.log('🔄 Force syncing all content...');
    return await this.syncAllContent();
  }
  
  static async getSyncStatus() {
    try {
      const types = ['Reel', 'Video', 'Live', 'Photo', 'Story'];
      const status = {};
      
      for (const type of types) {
        const count = await DatabaseService.getContentCount(type);
        status[type.toLowerCase()] = count;
      }
      
      return status;
    } catch (error) {
      throw new Error(`Failed to get sync status: ${error.message}`);
    }
  }
}

// Create instance and export both instance and static methods
const bunnyContentService = new BunnyContentService();

// Export static methods directly
module.exports = bunnyContentService;
module.exports.syncAllContent = BunnyContentService.syncAllContent;
module.exports.syncContentType = BunnyContentService.syncContentType;
module.exports.syncPhotos = BunnyContentService.syncPhotos;
module.exports.getContentForFrontend = BunnyContentService.getContentForFrontend;
module.exports.getAllContentForFrontend = BunnyContentService.getAllContentForFrontend;
module.exports.forceSyncAll = BunnyContentService.forceSyncAll;
module.exports.getSyncStatus = BunnyContentService.getSyncStatus;
