import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ==================== NETWORK CONFIGURATION ====================
// Koyeb deployment URL configuration

const PORT = 3000;

// Use Koyeb URL for deployment
const getApiBaseUrl = () => {
  // Check for primary environment variable first
  if (process.env.EXPO_PUBLIC_API_URL) {
    const cleanBase = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
    console.log('[NETWORK_CONFIG]: Using EXPO_PUBLIC_API_URL');
    return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  }
  
  // Check for KOYEB_URL second priority
  if (process.env.KOYEB_API_URL) {
    const cleanBase = process.env.KOYEB_API_URL.replace(/\/+$/, '');
    console.log('[NETWORK_CONFIG]: Using KOYEB_API_URL');
    return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  }

  // Development fallback
  if (__DEV__) {
    const devUrl = process.env.DEV_API_URL || 'http://0.0.0.0:3000';
    const cleanBase = devUrl.replace(/\/+$/, '');
    console.log('[NETWORK_CONFIG]: Using development URL');
    return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  }

  throw new Error('[NETWORK_CONFIG]: No API URL configured. Set EXPO_PUBLIC_API_URL or KOYEB_API_URL');
};

export const API_BASE_URL = getApiBaseUrl();
export const DEV_PORT = PORT;

