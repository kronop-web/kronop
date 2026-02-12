// ==================== BUNNYCDN CENTRALIZED CONFIGURATION ====================
// This file reads ALL configuration from environment variables only
// NO HARDCODED VALUES - Everything from .env

require('dotenv').config();

const getBunnyConfigByType = (type) => {
  // Master API Key from .env (Primary for all operations)
  const MASTER_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || '';
  
  console.log(`🔑 Master API Key: ${MASTER_API_KEY ? MASTER_API_KEY.substring(0, 20) + '...' : 'MISSING'}`);
  
  const configs = {
    reels: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || process.env.BUNNY_LIBRARY_ID_REELS || '',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || process.env.BUNNY_HOST_REELS || '',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_REELS || MASTER_API_KEY,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_REELS || process.env.BUNNY_STREAM_KEY_REELS || ''
    },
    video: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || process.env.BUNNY_LIBRARY_ID_VIDEO || '',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || process.env.BUNNY_HOST_VIDEO || '',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_VIDEO || MASTER_API_KEY,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_VIDEO || process.env.BUNNY_STREAM_KEY_VIDEO || ''
    },
    live: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || process.env.BUNNY_LIBRARY_ID_LIVE || '',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || process.env.BUNNY_HOST_LIVE || '',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ACCESS_KEY_LIVE || MASTER_API_KEY,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_LIVE || process.env.BUNNY_STREAM_KEY_LIVE || ''
    },
    photos: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO || process.env.BUNNY_STORAGE_ZONE || '',
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_PHOTO_STORAGE_KEY || process.env.BUNNY_PHOTO_STORAGE_KEY || '',
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO || process.env.BUNNY_HOST_PHOTOS || ''
    },
    shayari: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI || process.env.BUNNY_STORAGE_ZONE_SHAYARI || '',
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_SHAYARI_STORAGE_KEY || process.env.BUNNY_SHAYARI_STORAGE_KEY || '',
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_SHAYARI || process.env.BUNNY_HOST_SHAYARI || ''
    },
    story: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_STORY || process.env.BUNNY_LIBRARY_ID_STORY || '',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_STORY || process.env.BUNNY_HOST_STORY || '',
      apiKey: MASTER_API_KEY,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_STORY || process.env.BUNNY_STREAM_KEY_STORY || '',
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_STORY_STORAGE_KEY || process.env.BUNNY_STORY_STORAGE_KEY || ''
    }
  };
  
  const config = configs[type.toLowerCase()] || configs.reels;
  console.log(`📚 ${type.toUpperCase()} Config: Library=${config.libraryId || 'N/A'}, Host=${config.host || 'N/A'}`);
  
  return config;
};

const LIBRARY_ID_MAP = {
  reels: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || process.env.BUNNY_LIBRARY_ID_REELS || '',
  video: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || process.env.BUNNY_LIBRARY_ID_VIDEO || '',
  live: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || process.env.BUNNY_LIBRARY_ID_LIVE || ''
};

// API Headers Factory - Uses Master API Key
const getApiHeaders = (section = 'master') => {
  const MASTER_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || '';
  
  const headers = {
    'AccessKey': MASTER_API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  if (MASTER_API_KEY) {
    headers['Authorization'] = `Bearer ${MASTER_API_KEY}`;
  }
  
  console.log(`📡 API Headers for ${section}:`, {
    'AccessKey': MASTER_API_KEY ? `${MASTER_API_KEY.substring(0, 20)}...` : 'MISSING',
    'Authorization': MASTER_API_KEY ? 'Bearer ***' : 'MISSING'
  });
  
  return headers;
};

// Validation function
const validateConfig = () => {
  const masterKey = process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || '';
  
  if (!masterKey || masterKey.trim().length === 0) {
    console.error('❌ CRITICAL: EXPO_PUBLIC_BUNNY_API_KEY is missing in .env file');
    return false;
  }
  
  console.log('✅ BunnyCDN Configuration Validated');
  return true;
};

const BUNNY_CONFIG = getBunnyConfigByType;

module.exports = {
  getBunnyConfigByType,
  LIBRARY_ID_MAP,
  BUNNY_CONFIG,
  getApiHeaders,
  validateConfig,
  
  // Helper functions
  getMasterApiKey: () => process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || '',
  getSectionConfig: (section) => getBunnyConfigByType(section)
};
