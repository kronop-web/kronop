// ==================== BUNNY CDN CONFIGURATION ====================
// Backend compatible BunnyCDN configuration

const getBunnyConfigByType = (type) => {
  const configs = {
    reels: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '593793',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || 'storage.b-cdn.net',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_REELS || process.env.EXPO_PUBLIC_BUNNY_API_KEY || ''
    },
    video: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || '593795',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || 'storage.b-cdn.net', 
      apiKey: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_VIDEO || process.env.EXPO_PUBLIC_BUNNY_API_KEY || ''
    },
    live: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || '594452',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || 'storage.b-cdn.net',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_LIVE || process.env.EXPO_PUBLIC_BUNNY_API_KEY || ''
    },
    photos: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO || 'photu',
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_PHOTO || '',
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO || 'photu.b-cdn.net'
    },
    shayari: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI || 'shayar',
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_SHAYARI || '',
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_SHAYARI || 'shayar.b-cdn.net'
    },
    story: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_STORY || 'storiy',
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_STORY || '',
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_STORY || 'storiy.b-cdn.net'
    }
  };
  
  return configs[type.toLowerCase()] || configs.reels;
};

const LIBRARY_ID_MAP = {
  reels: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '593793',
  video: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || '593795',
  live: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || '594452'
};

const BUNNY_CONFIG = getBunnyConfigByType;

module.exports = {
  getBunnyConfigByType,
  LIBRARY_ID_MAP,
  BUNNY_CONFIG
};
