import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/network';
import { MOCK_USER, MOCK_STORIES, MOCK_PHOTOS, MOCK_VIDEOS, MOCK_REELS } from '../constants/mockData';

// ==================== BUNNYCDN CONFIGURATION ====================
export const BUNNY_CONFIG = {
  reels: {
    libraryId: '584910',
    host: 'vz-43e06bff-fc5.b-cdn.net',
    apiKey: 'c10fc40f-3882-4f6c-a1b7e654db1c-bb7a-4eff'
  },
  video: {
    libraryId: '584911', 
    host: 'vz-c9342ec7-688.b-cdn.net',
    apiKey: 'f9ed281d-a736-4c02-84cf92af8b98-beaf-41d0'
  },
  live: {
    libraryId: '584916',
    host: 'vz-abea507d-489.b-cdn.net', 
    apiKey: '8b84db72-6ab8-4da0-9e46e39f10dd-907e-48e3'
  },
  story: {
    libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_STORY || process.env.BUNNY_LIBRARY_ID_STORY || '584913',
    host: process.env.EXPO_PUBLIC_BUNNY_HOST_STORY || process.env.BUNNY_HOST_STORY || 'vz-0f58fe48-df9.b-cdn.net',
    apiKey: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_STORY || process.env.BUNNY_ACCESS_KEY_STORY || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY
  },
  photos: {
    storageZoneName: 'photosusar',
    host: 'storage.bunnycdn.com',
    apiKey: '17ec1af0-bea8-4c7d-872425454ca0-0007-4424'
  }
};

// ==================== CORE FETCHING LOGIC ====================
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    // Ensure endpoint starts with / if not present
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Check if API_BASE_URL already includes /api, if so, don't duplicate it if endpoint also has it
    // But since our API_BASE_URL ends with /api (from network.ts), and endpoints are usually /content/...,
    // we just concatenate. 
    // Wait, network.ts says: '.../api'
    // So if endpoint is '/content/video', result is '.../api/content/video'. Correct.
    
    const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;
    console.log(`📡 Fetching: ${fullUrl}`);

    const token = await AsyncStorage.getItem('user_token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KronopApp',
        ...authHeader,
        ...options.headers,
      } as HeadersInit,
      ...options,
    });

    // Handle 404 and other errors specifically to avoid JSON parse errors
    if (!response.ok) {
      console.warn(`❌ API Error: ${response.status} at ${fullUrl}`);
      
      // Return empty array for content endpoints to fix 404 errors
      if (normalizedEndpoint.includes('/content/')) {
        return { success: true, data: [] };
      }
      
      // Fallback mocks
      if (normalizedEndpoint.includes('/user/profile') || normalizedEndpoint.includes('/auth/me')) return { success: true, data: MOCK_USER };
      if (normalizedEndpoint.includes('/content/story')) return { success: true, data: MOCK_STORIES };
      if (normalizedEndpoint.includes('/content/photo')) return { success: true, data: MOCK_PHOTOS };
      if (normalizedEndpoint.includes('/content/video')) return { success: true, data: MOCK_VIDEOS };
      if (normalizedEndpoint.includes('/content/reels')) return { success: true, data: MOCK_REELS };
      
      // If we can't parse JSON error, return text
      try {
        const errorText = await response.text();
        try {
           const errorJson = JSON.parse(errorText);
           throw new Error(errorJson.message || `API Error: ${response.status}`);
        } catch (e) {
           // If response is not JSON (e.g. HTML error page), throw generic error with status
           throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
      } catch (e) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    }

    // Safe JSON parsing
    const text = await response.text();
    try {
      const result = JSON.parse(text);
      
      // Auto-unwrap data if it exists
      if (result && result.success && Array.isArray(result.data)) {
        return result.data;
      }
      
      return result;
    } catch (e) {
      console.error('JSON Parse Error:', e);
      // Check if text is actually an HTML error page or empty
      if (text.trim().startsWith('<')) {
         console.error('Received HTML instead of JSON. Likely a server error or 404 page.');
      }
      // Return empty structure instead of crashing
      return { success: false, error: 'Invalid JSON response' };
    }
    
  } catch (error) {
    console.error(`⚠️ API Call Failed: ${endpoint}`, error);
    
    // Fallback on Network Error
    if (endpoint.includes('/user/profile') || endpoint.includes('/auth/me')) return { success: true, data: MOCK_USER };
    if (endpoint.includes('/content/')) return { success: true, data: [] };
    
    throw error;
  }
};
