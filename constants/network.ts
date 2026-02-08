import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ==================== NETWORK CONFIGURATION ====================
// Railway deployment URL configuration

const PORT = 3000;

// Use Railway URL for deployment
const getApiBaseUrl = () => {
  const envUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;
  if (!envUrl) {
    throw new Error('EXPO_PUBLIC_API_URL environment variable is required');
  }
  
  // Remove trailing slashes and add /api
  const cleanBase = envUrl.replace(/\/+$/, '');
  return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
};

export const API_BASE_URL = getApiBaseUrl();
export const DEV_PORT = PORT;

