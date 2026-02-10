// ==================== BUNNY CDN CONFIGURATION ====================
// Backend compatible BunnyCDN configuration

const getBunnyConfigByType = (type) => {
  const configs = {
    reels: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '593793',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || 'storage.b-cdn.net',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_REELS
    },
    video: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || '593795',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || 'storage.b-cdn.net',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_VIDEO
    },
    live: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || '594452',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || 'storage.b-cdn.net',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_LIVE
    },
    photos: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO,
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_PHOTO,
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO
    },
    shayari: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI,
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_SHAYARI,
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_SHAYARI
    },
    story: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_STORY,
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_STORY,
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_STORY
    }
  };
  
  return configs[type.toLowerCase()] || configs.reels;
};

const LIBRARY_ID_MAP = {
  reels: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS,
  video: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO,
  live: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE
};

const BUNNY_CONFIG = getBunnyConfigByType;

module.exports = {
  getBunnyConfigByType,
  LIBRARY_ID_MAP,
  BUNNY_CONFIG
};
