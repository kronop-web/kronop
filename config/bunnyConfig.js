// ==================== BUNNY CDN CONFIGURATION ====================
// Backend compatible BunnyCDN configuration

const getBunnyConfigByType = (type) => {
  const configs = {
    reels: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS,
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS,
      apiKey: process.env.EXPO_PUBLIC_BUNNY_REELS_ACCESS_KEY,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_REELS
    },
    video: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO,
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO,
      apiKey: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ACCESS_KEY_VIDEO,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_VIDEO
    },
    live: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE,
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE,
      apiKey: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ACCESS_KEY_LIVE,
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_LIVE
    },
    photos: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO,
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_PHOTO_STORAGE_KEY,
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO
    },
    shayari: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI,
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_SHAYARI_STORAGE_KEY,
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_SHAYARI
    },
    story: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_STORY,
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_STORY_STORAGE_KEY,
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
