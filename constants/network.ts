import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PORT = 3000;

// Use EXPO_PUBLIC_API_URL directly from environment
const getApiBaseUrl = () => {
  const envUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;
  if (!envUrl) return 'https://web-production-dc9f.up.railway.app/api';
  
  // Remove trailing slashes and add /api
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return `${cleanUrl}/api`;
};

export const API_BASE_URL = getApiBaseUrl();
export const DEV_PORT = PORT;

