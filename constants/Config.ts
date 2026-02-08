// ==================== CENTRALIZED CONFIGURATION ====================
// ONE SOURCE OF TRUTH - All API Keys and Configuration
// NO HARDCODED VALUES ANYWHERE IN THE PROJECT

export const API_KEYS = {
  // BunnyCDN Master API Key
  BUNNY: process.env.EXPO_PUBLIC_BUNNY_API_KEY || '',
  
  // External Search APIs
  OPENAI: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  GOOGLE_SEARCH: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_KEY || '',
  GOOGLE_SEARCH_CX: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_CX || '',
  UNSPLASH: process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || '',
  PEXELS: process.env.EXPO_PUBLIC_PEXELS_API_KEY || '',
  
  // AI Supporter Key (for AI Image Generation)
  AI_SUPPORT: process.env.EXPO_PUBLIC_AI_SUPPORT_KEY || '',
  
  // Groq AI API Key (for Support Chat)
  GROQ: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
  
  // Additional API Keys
  PIXABAY: process.env.EXPO_PUBLIC_PIXABAY_KEY || '',
  FLICKR: process.env.EXPO_PUBLIC_FLICKR_KEY || '',
  GIPHY: process.env.EXPO_PUBLIC_GIPHY_KEY || '',
  BING: process.env.EXPO_PUBLIC_BING_KEY || '',
  OPENVERSE: process.env.EXPO_PUBLIC_OPENVERSE_KEY || '',
  STABLE_DIFFUSION: process.env.EXPO_PUBLIC_STABLE_DIFFUSION_KEY || '',
  
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  
  // OneSignal
  ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
  ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY || '',
  
  // Google Auth
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || '',
  
  // Railway URL
  RAILWAY_URL: process.env.EXPO_PUBLIC_API_URL || 'https://web-production-44afa.up.railway.app',
};

// Type definitions for better TypeScript support
export interface BunnyConfigType {
  libraryId: string;
  host: string;
  apiKey: string;
}

export interface BunnyPhotosConfigType {
  storageZoneName: string;
  host: string;
  apiKey: string;
}

export const BUNNY_CONFIG = {
  // Stream API Configuration (Video Content)
  reels: {
    libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '593793',
    host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || '',
    apiKey: API_KEYS.BUNNY,
  },
  video: {
    libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || '593795',
    host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || '',
    apiKey: API_KEYS.BUNNY,
  },
  live: {
    libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || '594452',
    host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || '',
    apiKey: API_KEYS.BUNNY,
  },
  story: {
    libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_STORY || '',
    host: process.env.EXPO_PUBLIC_BUNNY_HOST_STORY || '',
    apiKey: API_KEYS.BUNNY,
  },
  
  // Storage API Configuration (Image/Document Content)
  photos: {
    storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO || 'photu',
    host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO || '',
    apiKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_PHOTO || '',
  },
  shayari: {
    storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI || 'shayar',
    host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_SHAYARI || '',
    apiKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_SHAYARI || '',
  },
};

// Library ID mapping for dynamic content identification
export const LIBRARY_ID_MAP: Record<string, string> = {
  [process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '']: 'Reel',
  [process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || '']: 'Video',
  [process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || '']: 'Live',
  [process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_STORY || '']: 'Story',
  photos: 'Photo',
};

// Helper function to get config by content type
export const getBunnyConfigByType = (type: string): BunnyConfigType | BunnyPhotosConfigType => {
  switch (type.toLowerCase()) {
    case 'reel':
    case 'reels':
      return BUNNY_CONFIG.reels;
    case 'video':
    case 'videos':
      return BUNNY_CONFIG.video;
    case 'live':
      return BUNNY_CONFIG.live;
    case 'story':
    case 'stories':
      return BUNNY_CONFIG.story;
    case 'photo':
    case 'photos':
      return BUNNY_CONFIG.photos;
    case 'shayari':
    case 'shayari-photos':
      return BUNNY_CONFIG.shayari;
    default:
      return BUNNY_CONFIG.video; // Default fallback
  }
};

export default {
  API_KEYS,
  BUNNY_CONFIG,
  LIBRARY_ID_MAP,
  getBunnyConfigByType,
};
