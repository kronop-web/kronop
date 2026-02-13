// Global API Configuration for Kronop App
// Updated for Koyeb Deployment

// Get base URL from environment
const getBaseUrl = () => {
  // Check for Koyeb URL first (priority)
  if (process.env.KOYEB_API_URL) {
    return process.env.KOYEB_API_URL;
  }
  
  // Fallback to environment variable (server-side)
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  throw new Error('KOYEB_API_URL environment variable is required');
};

export const BASE_URL = getBaseUrl();

// API Endpoints (remove /api since BASE_URL already includes it)
export const API_ENDPOINTS = {
  // Content endpoints
  PHOTOS: `${BASE_URL}/photos`,
  VIDEOS: `${BASE_URL}/videos`,
  REELS: `${BASE_URL}/reels`,
  STORIES: `${BASE_URL}/stories`,
  LIVE: `${BASE_URL}/live`,
  
  // User endpoints
  USER_PROFILE: `${BASE_URL}/user/profile`,
  
  // Auth endpoints
  LOGIN: `${BASE_URL}/auth/login`,
  REGISTER: `${BASE_URL}/auth/register`,
  
  // Interaction endpoints
  LIKE: `${BASE_URL}/like`,
  COMMENT: `${BASE_URL}/comment`,
  SHARE: `${BASE_URL}/share`
};

export default BASE_URL;
