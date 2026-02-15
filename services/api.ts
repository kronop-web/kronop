import axios from 'axios';
import { API_KEYS, BUNNY_CONFIG, getBunnyConfigByType, BunnyConfigType } from '../constants/Config';
import { reelsService } from './reelsService';
import { videosService } from './videosService';
import { authService } from './authService';

// Get base URL from environment
const getBaseUrl = () => {
  console.log('[API_CONFIG]: Getting base URL...');
  
  // Check for environment variable first
  if (process.env.EXPO_PUBLIC_API_URL) {
    const url = process.env.EXPO_PUBLIC_API_URL;
    console.log('[API_CONFIG]: Using EXPO_PUBLIC_API_URL:', url);
    return url;
  }
  
  // Check for KOYEB_URL from config
  if (API_KEYS.KOYEB_URL) {
    const url = API_KEYS.KOYEB_URL;
    console.log('[API_CONFIG]: Using KOYEB_URL:', url);
    return url;
  }
  
  // Universal development URL - works on all devices in the same network
  if (__DEV__) {
    const url = process.env.DEV_API_URL || 'http://0.0.0.0:3000';
    console.log('[API_CONFIG]: Using development URL:', url);
    return url;
  }
  
  // Production URL from environment
  const prodUrl = process.env.PRODUCTION_API_URL;
  if (prodUrl) {
    console.log('[API_CONFIG]: Using production URL:', prodUrl);
    return prodUrl;
  }
  
  throw new Error('[API_CONFIG]: No API URL configured. Set EXPO_PUBLIC_API_URL or KOYEB_URL');
};

const base = getBaseUrl();
const cleanBase = base.replace(/\/+$/, ''); 
export const API_URL = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
console.log('[API_CONFIG]: API Base URL configured:', API_URL);

const API_CLIENT = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' }
});

export const fetchUnifiedData = async (endpoint: string) => {
  try {
    const response = await API_CLIENT.get(endpoint);
    // Return .data if it exists (standard response format)
    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  } catch (error) {
    console.error('Unified Fetch Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

// const CACHE_KEYS = { // Unused - keeping for future use
//   PROFILE: 'user_profile',
//   IMAGES: 'cached_images'
// };
// const imageCache: Record<string, string> = {}; // Unused - keeping for future use
let profileCache: any | null = null;
let profileCacheTime = 0;
const PROFILE_TTL_MS = 60 * 1000;

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const fullUrl = `${API_URL}${endpoint}`;
    console.log(`📡 Fetching: ${fullUrl}`);
    
    // BYPASS LOGIN FOR TESTING: Use dummy headers instead of auth
    // const headers = await authService.createAuthHeaders();
    
    // Ensure we have proper headers even without token
    let finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      // BYPASS LOGIN: No authentication required for testing
      // 'Authorization': 'Bearer dummy_token_for_testing'
    };
    
    // Handle body serialization
    let finalBody = options.body;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      finalBody = JSON.stringify(options.body);
    }
    
    // Remove Content-Type for FormData or no body
    if (finalBody instanceof FormData || !finalBody) {
      const { 'Content-Type': _, ...headersWithoutContentType } = finalHeaders;
      finalHeaders = headersWithoutContentType;
    }
    
    console.log(`[UPLOADING START] Making request to: ${fullUrl}`);
    console.log(`[FILE DETAILS] Request headers:`, JSON.stringify(finalHeaders, null, 2));
    console.log(`[FILE DETAILS] Request options:`, JSON.stringify({
      method: options.method || 'GET',
      body: finalBody ? (finalBody instanceof FormData ? '[FormData]' : finalBody) : 'no body',
    }, null, 2));
    
    const response = await fetch(fullUrl, {
      headers: finalHeaders,
      body: finalBody,
      ...options,
    });

    if (!response.ok) {
      console.error(`[SERVER RESPONSE] API Error: ${response.status} ${response.statusText} at ${fullUrl}`);
      
      // Try to get error response body
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
        console.error(`[SERVER RESPONSE] Error response body:`, errorText);
      } catch (e) {
        console.error(`[SERVER RESPONSE] Could not read error response body`);
      }
      
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorDetails}`);
    }

    const result = await response.json();
    console.log('[SERVER RESPONSE] API Response received:', result);
    
    // Auto-unwrap data if it exists to fix "filter is not a function" errors
    if (result && result.success && Array.isArray(result.data)) {
      return result.data;
    }
    
    return result;
  } catch (error) {
    console.error(`[SERVER RESPONSE] API Call Failed: ${endpoint}`, error);
    throw error;
  }
};

const getUploadUrl = async (contentType: string, fileName: string, fileSize: number, metadata?: any) => {
  console.log(`[${contentType.toUpperCase()}_UPLOAD]: Getting URL...`);
  
  try {
    const response = await apiCall('/upload/url', {
      method: 'POST',
      body: JSON.stringify({
        contentType,
        fileName,
        fileSize,
        metadata
      })
    });
    
    console.log(`[${contentType.toUpperCase()}_UPLOAD]: URL received`);
    return response;
  } catch (error) {
    console.error(`[${contentType.toUpperCase()}_UPLOAD]: URL error`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const uploadReel = async (file: any, metadata: any) => {
  console.log('[REELS_UPLOAD]: START');
  
  // BYPASS LOGIN: Add dummy user ID for testing
  const enhancedMetadata = {
    ...metadata,
    userId: 'guest_user' // Dummy user ID for testing
  };
  
  const fileName = file.name || file.fileName || `reel_${Date.now()}.mp4`;
  const fileSize = file.size || file.fileSize || 0;
  
  console.log('[REELS_UPLOAD]: Details', { fileName, fileSize });
  
  try {
    const { uploadUrl, videoId } = await getUploadUrl('reel', fileName, fileSize, enhancedMetadata);
    
    if (fileSize > 100 * 1024 * 1024) {
      console.log('[FILE DETAILS] Large file detected, using chunk upload');
      const config = BUNNY_CONFIG.reels;
      await uploadInChunks(file, config, videoId, enhancedMetadata);
    } else {
      console.log('[FILE DETAILS] Small file detected, using direct upload');
      await uploadToBunny(file, 'reel', enhancedMetadata);
    }
    
    console.log('[REELS_UPLOAD]: SUCCESS', { videoId, uploadUrl });
    return { success: true, videoId, url: uploadUrl };
  } catch (error) {
    console.error('[REELS_UPLOAD]: ERROR', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const uploadVideo = async (file: any, metadata: any) => {
  console.log('[VIDEO_UPLOAD]: START');
  
  // BYPASS LOGIN: Add dummy user ID for testing
  const enhancedMetadata = {
    ...metadata,
    userId: 'guest_user' // Dummy user ID for testing
  };
  
  const fileName = file.name || file.fileName || `video_${Date.now()}.mp4`;
  const fileSize = file.size || file.fileSize || 0;
  
  console.log('[VIDEO_UPLOAD]: Details', { fileName, fileSize });
  
  try {
    const { uploadUrl, videoId } = await getUploadUrl('video', fileName, fileSize, enhancedMetadata);
    
    if (fileSize > 100 * 1024 * 1024) {
      console.log('[FILE_DETAILS] Large file detected, using chunk upload');
      const config = BUNNY_CONFIG.video;
      await uploadInChunks(file, config, videoId, enhancedMetadata);
    } else {
      console.log('[FILE_DETAILS] Small file detected, using direct upload');
      await uploadToBunny(file, 'video', enhancedMetadata);
    }
    
    console.log('[VIDEO_UPLOAD]: SUCCESS', { videoId, uploadUrl });
    return { success: true, videoId, url: uploadUrl };
  } catch (error) {
    console.error('[VIDEO_UPLOAD]: ERROR', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const uploadPhoto = async (file: any, metadata: any) => {
  console.log('[PHOTO_UPLOAD]: START');
  
  // BYPASS LOGIN: Add dummy user ID for testing
  const enhancedMetadata = {
    ...metadata,
    userId: 'guest_user' // Dummy user ID for testing
  };
  
  const fileName = file.name || file.fileName || `photo_${Date.now()}.jpg`;
  const fileSize = file.size || file.fileSize || 0;
  
  console.log('[PHOTO_UPLOAD]: Details', { fileName, fileSize });
  
  try {
    // Step 1: Upload to BunnyCDN via PhotoBridge
    const { PhotoBridge } = await import('./bridges/PhotoBridge');
    const bridge = new PhotoBridge();
    
    const bunnyResult = await bridge.uploadPhoto(file, enhancedMetadata);
    
    if (!bunnyResult.success) {
      throw new Error(bunnyResult.error || 'BunnyCDN upload failed');
    }
    
    console.log('[PHOTO_UPLOAD]: BunnyCDN upload successful:', bunnyResult);
    
    // Step 2: Save metadata to MongoDB
    console.log('[PHOTO_UPLOAD]: Saving metadata to MongoDB...');
    const photoData = {
      title: enhancedMetadata.title || bunnyResult.fileName,
      description: enhancedMetadata.description,
      bunny_id: bunnyResult.fileName, // Server expects 'bunny_id'
      url: bunnyResult.url, // Server expects 'url'
      thumbnail: bunnyResult.url, // Server expects 'thumbnail'
      category: enhancedMetadata.category,
      tags: enhancedMetadata.tags,
      userId: 'guest_user' // Server expects 'userId'
    };
    
    const response = await apiCall('/upload/photo', {
      method: 'POST',
      body: JSON.stringify(photoData)
    });
    
    console.log('[PHOTO_UPLOAD]: MongoDB save successful:', response);
    return { success: true, photoId: bunnyResult.fileName, url: bunnyResult.url, data: response };
    
  } catch (error) {
    console.error('[PHOTO_UPLOAD]: ERROR', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const uploadStory = async (file: any, metadata: any) => {
  console.log('[STORY_UPLOAD]: START');
  
  // BYPASS LOGIN: Add dummy user ID for testing
  const enhancedMetadata = {
    ...metadata,
    userId: 'guest_user' // Dummy user ID for testing
  };
  
  const fileName = file.name || file.fileName || `story_${Date.now()}.jpg`;
  const fileSize = file.size || file.fileSize || 0;
  
  console.log('[STORY_UPLOAD]: Details', { fileName, fileSize });
  
  try {
    // Step 1: Upload to BunnyCDN via StoryBridge
    const { StoryBridge } = await import('./bridges/StoryBridge');
    const bridge = new StoryBridge();
    
    const bunnyResult = await bridge.uploadStory(file, enhancedMetadata);
    
    if (!bunnyResult.success) {
      throw new Error(bunnyResult.error || 'BunnyCDN upload failed');
    }
    
    console.log('[STORY_UPLOAD]: BunnyCDN upload successful:', bunnyResult);
    
    // Step 2: Save metadata to MongoDB
    console.log('[STORY_UPLOAD]: Saving metadata to MongoDB...');
    const storyData = {
      title: enhancedMetadata.title || bunnyResult.fileName,
      description: enhancedMetadata.description,
      bunny_id: bunnyResult.fileName, // Server expects 'bunny_id'
      url: bunnyResult.url, // Server expects 'url'
      thumbnail: bunnyResult.url, // Server expects 'thumbnail'
      tags: enhancedMetadata.tags,
      userId: 'guest_user' // Server expects 'userId'
    };
    
    const response = await apiCall('/upload/story', {
      method: 'POST',
      body: JSON.stringify(storyData)
    });
    
    console.log('[STORY_UPLOAD]: MongoDB save successful:', response);
    return { success: true, storyId: bunnyResult.fileName, url: bunnyResult.url, data: response };
    
  } catch (error) {
    console.error('[STORY_UPLOAD]: ERROR', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const uploadLive = async (metadata: any) => {
  console.log('[LIVE_UPLOAD]: START');
  
  // BYPASS LOGIN: Add dummy user ID for testing
  const enhancedMetadata = {
    ...metadata,
    userId: 'guest_user' // Dummy user ID for testing
  };
  
  console.log('[LIVE_UPLOAD]: Details', enhancedMetadata);
  
  try {
    const response = await apiCall('/content/live/upload', {
      method: 'POST',
      body: JSON.stringify(enhancedMetadata)
    });
    
    console.log('[LIVE_UPLOAD]: SUCCESS', response);
    return response;
  } catch (error) {
    console.error('[LIVE_UPLOAD]: ERROR', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const uploadShayari = async (file: any, metadata: any) => {
  console.log('[SHAYARI_UPLOAD]: START');
  
  // BYPASS LOGIN: Add dummy user ID for testing
  const enhancedMetadata = {
    ...metadata,
    userId: 'guest_user' // Dummy user ID for testing
  };
  
  const fileName = file.name || file.fileName || `shayari_${Date.now()}.jpg`;
  const fileSize = file.size || file.fileSize || 0;
  
  console.log('[SHAYARI_UPLOAD]: Details', { fileName, fileSize });
  
  try {
    // Step 1: Upload to BunnyCDN via ShayariBridge
    const { ShayariBridge } = await import('./bridges/ShayariBridge');
    const bridge = new ShayariBridge();
    
    const bunnyResult = await bridge.uploadShayari(file, enhancedMetadata);
    
    if (!bunnyResult.success) {
      throw new Error(bunnyResult.error || 'BunnyCDN upload failed');
    }
    
    console.log('[SHAYARI_UPLOAD]: BunnyCDN upload successful:', bunnyResult);
    
    // Step 2: Save metadata to MongoDB
    console.log('[SHAYARI_UPLOAD]: Saving metadata to MongoDB...');
    const shayariData = {
      title: enhancedMetadata.title || bunnyResult.fileName,
      description: enhancedMetadata.description,
      bunny_id: bunnyResult.fileName, // Server expects 'bunny_id'
      url: bunnyResult.url, // Server expects 'url'
      thumbnail: bunnyResult.url, // Server expects 'thumbnail'
      tags: enhancedMetadata.tags,
      userId: 'guest_user', // Server expects 'userId'
      shayari_text: enhancedMetadata.content, // Server expects 'shayari_text'
      shayari_author: enhancedMetadata.author // Server expects 'shayari_author'
    };
    
    const response = await apiCall('/upload/shayari', {
      method: 'POST',
      body: JSON.stringify(shayariData)
    });
    
    console.log('[SHAYARI_UPLOAD]: MongoDB save successful:', response);
    return { success: true, shayariId: bunnyResult.fileName, url: bunnyResult.url, data: response };
    
  } catch (error) {
    console.error('[SHAYARI_UPLOAD]: ERROR', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

// ==================== CONTENT MANAGEMENT API ====================
export const photosApi = {
  getPhotos: async (page = 1, limit = 20, category?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (category && category !== 'all') {
      params.append('category', category);
    }
    
    return await apiCall(`/photos?${params}`);
  },

  getUserPhotos: async () => {
    console.log('📡 Calling getUserPhotos API...');
    return await apiCall('/photos/user');
  },

  uploadPhoto: async (file: any, metadata: any) => {
    return await uploadPhoto(file, metadata);
  },

  updatePhoto: async (photoId: string, updates: any) => {
    return await apiCall(`/photos/${photoId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deletePhoto: async (photoId: string) => {
    return await apiCall(`/photos/${photoId}`, {
      method: 'DELETE',
    });
  },

  getPhotoStats: async () => {
    return await apiCall('/photos/stats');
  }
};

export const shayariPhotosApi = {
  getShayariPhotos: async (page = 1, limit = 20, category?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (category && category !== 'all') {
      params.append('category', category);
    }
    
    return await apiCall(`/content/shayari-photo?${params}`);
  },

  getUserShayariPhotos: async () => {
    console.log('📝 Calling getUserShayariPhotos API...');
    return await apiCall('/content/shayari-photo');
  },

  uploadShayariPhoto: async (file: any, metadata: any) => {
    console.log('[UPLOADING START] Uploading shayari photo:', { fileName: file.name, fileSize: file.size });
    
    try {
      const response = await uploadShayari(file, metadata);
      console.log('[UPLOADING SUCCESS] Shayari photo uploaded:', response);
      return response;
    } catch (error) {
      console.error('[UPLOADING ERROR] Shayari photo upload failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  updateShayariPhoto: async (photoId: string, updates: any) => {
    return await apiCall(`/shayari-photos/${photoId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteShayariPhoto: async (photoId: string) => {
    return await apiCall(`/shayari-photos/${photoId}`, {
      method: 'DELETE',
    });
  },

  getShayariPhotoStats: async () => {
    return await apiCall('/shayari-photos/stats');
  }
};

export const reelsApi = {
  getReels: async (page = 1, limit = 20) => {
    try {
      console.log('🎬 Calling reelsService.getPublicReels...');
      return await reelsService.getPublicReels(page, limit);
    } catch (error) {
      console.error('🎬 reelsApi.getReels error:', error);
      return [];
    }
  },

  getAllReels: async (page = 1, limit = 20) => {
    try {
      console.log('🎬 Calling reelsService.getPublicReels...');
      return await reelsService.getPublicReels(page, limit);
    } catch (error) {
      console.error('🎬 reelsApi.getAllReels error:', error);
      return [];
    }
  },

  getUserReels: async () => {
    try {
      console.log('🎬 Calling reelsService.getUserReels...');
      return await reelsService.getUserReels();
    } catch (error) {
      console.error('🎬 reelsApi.getUserReels error:', error);
      return [];
    }
  },

  uploadReel: async (file: any, metadata: any) => {
    try {
      console.log('🎬 Calling reelsService.uploadReel...');
      return await reelsService.uploadReel(file, metadata);
    } catch (error) {
      console.error('🎬 reelsApi.uploadReel error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  updateReel: async (reelId: string, updates: any) => {
    try {
      console.log('🎬 Calling reelsService.updateReel...');
      return await reelsService.updateReel(reelId, updates);
    } catch (error) {
      console.error('🎬 reelsApi.updateReel error:', error);
      return null;
    }
  },

  deleteReel: async (reelId: string) => {
    try {
      console.log('🎬 Calling reelsService.deleteReel...');
      return await reelsService.deleteReel(reelId);
    } catch (error) {
      console.error('🎬 reelsApi.deleteReel error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  toggleLike: async (reelId: string) => {
    try {
      console.log('🎬 Calling reelsService.toggleReelLike...');
      return await reelsService.toggleReelLike(reelId);
    } catch (error) {
      console.error('🎬 reelsApi.toggleLike error:', error);
      throw error;
    }
  },

  getReelStats: async () => {
    return await apiCall('/reels/stats');
  }
};

export const videosApi = {
  getVideos: async (page = 1, limit = 20) => {
    try {
      console.log('🎥 Calling videosService.getPublicVideos...');
      return await videosService.getPublicVideos(page, limit);
    } catch (error) {
      console.error('🎥 videosApi.getVideos error:', error);
      return [];
    }
  },

  getAllVideos: async (page = 1, limit = 20) => {
    try {
      console.log('🎥 Calling videosService.getPublicVideos...');
      return await videosService.getPublicVideos(page, limit);
    } catch (error) {
      console.error('🎥 videosApi.getAllVideos error:', error);
      return [];
    }
  },

  getUserVideos: async () => {
    try {
      console.log('🎥 Calling videosService.getUserVideos...');
      return await videosService.getUserVideos();
    } catch (error) {
      console.error('🎥 videosApi.getUserVideos error:', error);
      return [];
    }
  },

  uploadVideo: async (file: any, metadata: any) => {
    try {
      console.log('[VIDEO_UPLOAD]: Starting upload...');
      return await uploadVideo(file, metadata);
    } catch (error) {
      console.error('[VIDEO_UPLOAD]: ERROR', error instanceof Error ? error.message : String(error));
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  updateVideo: async (videoId: string, updates: any) => {
    try {
      console.log('🎥 Calling videosService.updateVideo...');
      return await videosService.updateVideo(videoId, updates);
    } catch (error) {
      console.error('🎥 videosApi.updateVideo error:', error);
      return null;
    }
  },

  deleteVideo: async (videoId: string) => {
    try {
      console.log('🎥 Calling videosService.deleteVideo...');
      return await videosService.deleteVideo(videoId);
    } catch (error) {
      console.error('🎥 videosApi.deleteVideo error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  toggleLike: async (videoId: string) => {
    try {
      console.log('🎥 Calling videosService.toggleVideoLike...');
      return await videosService.toggleVideoLike(videoId);
    } catch (error) {
      console.error('🎥 videosApi.toggleLike error:', error);
      throw error;
    }
  },

  getVideoStats: async () => {
    return await apiCall('/videos/stats');
  }
};

export const storiesApi = {
  getStories: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return await apiCall(`/stories?${params}`);
  },

  uploadStory: async (file: any, metadata: any) => {
    return await uploadStory(file, metadata);
  },
  
  // Add other methods as needed to match pattern
};

export const liveApi = {
  getLive: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return await apiCall(`/live?${params}`);
  },

  uploadLive: async (metadata: any) => {
    return await uploadLive(metadata);
  },
};


export const savedApi = {
  getSaved: async (contentType?: string, page = 1, limit = 20) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      // Add content type filter if provided
      if (contentType) {
        params.append('content_type', contentType);
      }
      
      const endpoint = `/content/saved?${params}`;
      console.log('🔍 Calling savedApi.getSaved with endpoint:', endpoint);
      
      const result = await apiCall(endpoint);
      
      // Handle different response formats
      if (result && result.data && Array.isArray(result.data)) {
        return result.data;
      } else if (result && Array.isArray(result)) {
        return result;
      } else if (result && result.success && result.data) {
        return Array.isArray(result.data) ? result.data : [];
      } else {
        console.warn('🔍 savedApi: Unexpected response format:', result);
        return [];
      }
    } catch (error) {
      console.error('🔍 savedApi.getSaved error:', error);
      // Return empty array on error to prevent app crashes
      return [];
    }
  },
  
  saveItem: async (itemId: string, itemType: string) => {
    console.log('[UPLOADING START] Saving item:', { itemId, itemType });
    console.log('[FILE DETAILS] Item ID:', itemId, 'Type:', itemType);
    
    try {
      const response = await apiCall('/content/save', {
        method: 'POST',
        body: JSON.stringify({ itemId, itemType })
      });
      
      console.log('[UPLOADING SUCCESS] Save successful:', response);
      return response;
    } catch (error) {
      console.error('[UPLOADING ERROR] Save failed:', error);
      throw error;
    }
  },
  
  unsaveItem: async (itemId: string) => {
    return await apiCall(`/content/saved/${itemId}`, {
      method: 'DELETE'
    });
  }
};


// ==================== USER PROFILE API ====================
export const userProfileApi = {
  getCurrentProfile: async () => {
    const now = Date.now();
    if (profileCache && now - profileCacheTime < PROFILE_TTL_MS) {
      return profileCache;
    }
    const result = await apiCall('/users/profile');
    profileCache = result;
    profileCacheTime = now;
    return result;
  },

  getProfile: async (userId: string) => {
    return await apiCall(`/users/${userId}`);
  },

  updateProfile: async (updates: any) => {
    return await apiCall('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  uploadProfileImage: async (formData: FormData, type: 'profile' | 'cover') => {
    console.log('[UPLOADING START] Uploading profile image:', { type });
    console.log('[FILE DETAILS] FormData entries count:', formData.getAll.length);
    
    try {
      const response = await apiCall('/users/upload-image', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      console.log('[SERVER RESPONSE] Profile image upload successful:', response);
      return response;
    } catch (error) {
      console.error('[SERVER RESPONSE] Profile image upload failed:', error);
      throw error;
    }
  },

  getSupporters: async () => {
    return await apiCall('/users/supporters');
  },

  getSupporting: async () => {
    return await apiCall('/users/supporting');
  },

};

// ==================== CHUNK UPLOAD HELPER ====================
// For large video files - upload in chunks

const uploadInChunks = async (
  file: any, 
  videoConfig: BunnyConfigType, 
  videoGuid: string,
  metadata?: any
) => {
  const CHUNK_SIZE = 2 * 1024 * 1024;
  const totalSize = file.size || file.fileSize || 0;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  
  console.log(`Starting chunk upload: ${totalSize} bytes in ${totalChunks} chunks of ${CHUNK_SIZE} bytes`);
  
  try {
    // Step 1: Initialize upload session
    const initResponse = await fetch(`https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos/${videoGuid}/uploads`, {
      method: 'POST',
      headers: {
        'AccessKey': videoConfig.streamKey || videoConfig.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uploadType: 'chunked'
      })
    });
    
    if (!initResponse.ok) {
      throw new Error(`Failed to initialize chunk upload: ${initResponse.status}`);
    }
    
    const { uploadSessionId } = await initResponse.json();
    
    // Step 2: Upload chunks with retry logic
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice ? file.slice(start, end) : file;
      
      console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} (${start}-${end})`);
      
      // Retry logic for each chunk
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('index', chunkIndex.toString());
          formData.append('totalChunks', totalChunks.toString());
          
          const chunkResponse = await fetch(
            `https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos/${videoGuid}/uploads/${uploadSessionId}`,
            {
              method: 'POST',
              headers: {
                'AccessKey': videoConfig.streamKey || videoConfig.apiKey,
              },
              body: formData
            }
          );
          
          if (chunkResponse.ok) {
            break; // Success, move to next chunk
          } else {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw new Error(`Chunk ${chunkIndex} upload failed after ${maxRetries} retries: ${chunkResponse.status}`);
            }
            console.log(`Chunk ${chunkIndex} failed, retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          console.log(`Chunk ${chunkIndex} error, retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      // Progress callback could be added here
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      console.log(`Upload progress: ${progress}%`);
    }
    
    // Step 3: Finalize upload
    const finalizeResponse = await fetch(`https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos/${videoGuid}/uploads/${uploadSessionId}/complete`, {
      method: 'POST',
      headers: {
        'AccessKey': videoConfig.streamKey || videoConfig.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        totalChunks: totalChunks
      })
    });
    
    if (!finalizeResponse.ok) {
      throw new Error(`Failed to finalize chunk upload: ${finalizeResponse.status}`);
    }
    
    console.log('Chunk upload completed successfully');
    return true;
    
  } catch (error) {
    console.error('Chunk upload error:', error);
    throw error;
  }
};

// ==================== MAIN BUNNYCDN UPLOAD FUNCTION ====================
// Real working upload function with proper BunnyCDN API calls

export const uploadToBunny = async (file: any, contentType: string, metadata?: any) => {
  const config = BUNNY_CONFIG[contentType as keyof typeof BUNNY_CONFIG];
  if (!config) {
    throw new Error(`Invalid content type: ${contentType}`);
  }

  try {
    if (contentType === 'photos') {
      // Photos - BunnyCDN Storage API
      const photoConfig = config as { storageZoneName: string; host: string; apiKey: string };
      const fileName = file.name || file.fileName || `photo_${Date.now()}.${file.type?.split('/')[1] || 'jpg'}`;
      const url = `https://${photoConfig.host}/${photoConfig.storageZoneName}/${fileName}`;
      
      // Convert file to proper format for upload
      let fileBlob;
      if (file.uri) {
        // React Native file - need to convert to blob
        const response = await fetch(file.uri);
        fileBlob = await response.blob();
      } else {
        fileBlob = file;
      }
      
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'AccessKey': photoConfig.apiKey,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: fileBlob
      });

      if (!uploadResponse.ok) {
        throw new Error(`BunnyCDN Storage upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      return {
        success: true,
        url: `https://${photoConfig.host}/${photoConfig.storageZoneName}/${fileName}`,
        fileName: fileName,
        size: file.size || file.fileSize
      };

    } else {
      // Videos/Reels/Live/Story - BunnyCDN Stream API
      const videoConfig = config as BunnyConfigType;
      
      // Step 1: Create video entry first
      const createVideoUrl = `https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos`;
      
      // Get file name for title
      const fileName = file.name || file.fileName || `video_${Date.now()}.mp4`;
      const fileSize = file.size || file.fileSize || 0;
      
      // Create video with JSON body first
      const createResponse = await fetch(createVideoUrl, {
        method: 'POST',
        headers: {
          'AccessKey': videoConfig.streamKey || videoConfig.apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ 
          title: metadata?.title || fileName.split('.')[0] 
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`BunnyCDN Stream create failed: ${createResponse.status} ${errorText}`);
      }

      const videoResult = await createResponse.json();
      
      // Step 2: Choose upload method based on file size
      const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB - use chunk upload for larger files
      
      if (fileSize > LARGE_FILE_THRESHOLD) {
        // Use chunk upload for large files
        console.log('Using chunk upload for large file');
        await uploadInChunks(file, videoConfig, videoResult.guid, metadata);
      } else {
        // Use simple upload for smaller files
        console.log('Using simple upload for small file');
        
        // Prepare file for upload
        let fileBlob;
        if (file.uri) {
          // React Native file - convert to blob
          const response = await fetch(file.uri);
          fileBlob = await response.blob();
        } else {
          fileBlob = file;
        }
        
        const uploadUrl = `https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos/${videoResult.guid}`;
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'AccessKey': videoConfig.streamKey || videoConfig.apiKey,
            'Content-Type': 'application/octet-stream'
          },
          body: fileBlob
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`BunnyCDN Stream upload failed: ${uploadResponse.status} ${errorText}`);
        }
      }
      
      // Step 3: Update video metadata if provided
      if (metadata && (metadata.description || metadata.tags)) {
        const updateData: any = {};
        if (metadata.description) updateData.description = metadata.description;
        if (metadata.tags && Array.isArray(metadata.tags)) updateData.tags = metadata.tags;
        
        await fetch(`https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos/${videoResult.guid}`, {
          method: 'POST',
          headers: {
            'AccessKey': videoConfig.streamKey || videoConfig.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
      }
      
      // Step 4: Get final video URL
      const videoUrl = `https://${videoConfig.host}/${videoResult.guid}/playlist.m3u8`;

      return {
        success: true,
        videoId: videoResult.guid,
        url: videoUrl,
        libraryId: videoConfig.libraryId,
        title: metadata?.title || fileName.split('.')[0],
        description: metadata?.description || ''
      };
    }

  } catch (error) {
    console.error('BunnyCDN upload error:', error);
    throw error;
  }
};

// ==================== VALIDATION FUNCTIONS ====================
// File type and size validation for different content types

export const validateFileType = (file: any, type: string) => {
  // Simply check if file exists - no strict validation
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Always return true for any file type
  // Let BunnyCDN handle the actual validation
  return { valid: true, error: null };
};

export const validateFileSize = (file: any, type: string) => {
  // No file size limits - unlimited uploads allowed
  // Let BunnyCDN handle the actual size limits
  return { valid: true, error: null };
};

export default {
  uploadToBunny,
  validateFileType,
  validateFileSize,
  apiCall,
};

// Also export apiCall separately for direct imports
export { apiCall };
