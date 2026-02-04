// Global API Configuration for Kronop App
// Updated for Render Deployment

// Dynamic base URL that works in all environments
const getBaseUrl = () => {
  // Check if we're in production on Render
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://kronop.onrender.com/api';
  }
  
  // Check for environment variable (server-side)
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) {
    return `${process.env.EXPO_PUBLIC_API_URL}/api`;
  }

  return '';
};

export const BASE_URL = getBaseUrl();

// API Endpoints
export const API_ENDPOINTS = {
  // Content endpoints
  PHOTOS: `${BASE_URL}/photos`,
  VIDEOS: `${BASE_URL}/videos`,
  REELS: `${BASE_URL}/reels`,
  STORIES: `${BASE_URL}/stories`,
  LIVE: `${BASE_URL}/live`,
  
  // User endpoints
  USER_PROFILE: `${BASE_URL}/user/profile`,
  USER_EARNINGS: `${BASE_URL}/user/earnings`,
  
  // Auth endpoints
  LOGIN: `${BASE_URL}/auth/login`,
  REGISTER: `${BASE_URL}/auth/register`,
  
  // Interaction endpoints
  LIKE: `${BASE_URL}/like`,
  COMMENT: `${BASE_URL}/comment`,
  SHARE: `${BASE_URL}/share`
};

export default BASE_URL;
