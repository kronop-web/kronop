import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ==================== NETWORK CONFIGURATION ====================
// Koyeb deployment URL configuration

const PORT = 3000;

// Use Koyeb URL for deployment
const getApiBaseUrl = () => {
  // Check for Koyeb URL first (priority)
  if (process.env.KOYEB_API_URL) {
    const cleanBase = process.env.KOYEB_API_URL.replace(/\/+$/, '');
    return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  }
  
  // Check for fallback environment variable
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) {
    const cleanBase = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
    return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  }

  throw new Error('KOYEB_API_URL environment variable is required');
};

export const API_BASE_URL = getApiBaseUrl();
export const DEV_PORT = PORT;

