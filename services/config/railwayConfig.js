// ==================== RAILWAY CONFIGURATION ====================
// Environment-based configuration for Railway deployment
// All values prioritize process.env over hardcoded values

const getRailwayConfig = () => {
  // Railway automatically provides these
  const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.ROOT_URL;
  
  return {
    // API Base URL
    API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || railwayUrl,
    
    // Railway Specific
    RAILWAY_URL: railwayUrl,
    PORT: Number(process.env.PORT) || 10000,
    NODE_ENV: process.env.NODE_ENV || 'production',
    
    // Database
    MONGODB_URI: process.env.MONGODB_URI || '',
    
    // BunnyCDN Configuration
    BUNNY_API_KEY: process.env.EXPO_PUBLIC_BUNNY_API_KEY || '',
    LIBRARY_IDS: {
      reels: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '593793',
      video: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || '593795',
      live: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || '594452'
    },
    
    // Storage Zones
    STORAGE_ZONES: {
      photo: {
        name: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO || 'photu',
        accessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_PHOTO || '',
        host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO || 'photu.b-cdn.net'
      },
      shayari: {
        name: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI || 'shayar',
        accessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_SHAYARI || '',
        host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_SHAYARI || 'shayar.b-cdn.net'
      },
      story: {
        name: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_STORY || 'storiy',
        accessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_STORY || '',
        host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_STORY || 'storiy.b-cdn.net'
      }
    },
    
    // AI Supporter
    AI_SUPPORT_KEY: process.env.EXPO_PUBLIC_AI_SUPPORT_KEY || '',
    
    // Groq AI API Key
    GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
    
    // External APIs
    GOOGLE_SEARCH_KEY: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_KEY || '',
    GOOGLE_SEARCH_CX: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_CX || '',
    UNSPLASH_KEY: process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || '',
    PEXELS_KEY: process.env.EXPO_PUBLIC_PEXELS_API_KEY || '',
    
    // Services
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
    ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY || ''
  };
};

// Export configuration
const config = getRailwayConfig();

module.exports = {
  config,
  getRailwayConfig
};
