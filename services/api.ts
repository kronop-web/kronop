import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

// Fix double slash issue by cleaning the base URL
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') + '/api';
console.log('🔗 API Base URL set to:', API_URL);

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
    
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText} at ${fullUrl}`);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Auto-unwrap data if it exists to fix "filter is not a function" errors
    if (result && result.success && Array.isArray(result.data)) {
      return result.data;
    }
    
    return result;
  } catch (error) {
    console.error(`⚠️ API Call Failed: ${endpoint}`, error);
    throw error;
  }
};

const getUploadUrl = async (contentType: string, fileName: string, fileSize: number, metadata?: any) => {
  return await apiCall('/upload/url', {
    method: 'POST',
    body: JSON.stringify({
      contentType,
      fileName,
      fileSize,
      metadata
    })
  });
};

export const uploadReel = async (file: any, metadata: any) => {
  const fileName = file.name || file.fileName || `reel_${Date.now()}.mp4`;
  const fileSize = file.size || file.fileSize || 0;
  
  const { uploadUrl, videoId } = await getUploadUrl('reel', fileName, fileSize, metadata);
  
  if (fileSize > 100 * 1024 * 1024) {
    const config = BUNNY_CONFIG.reels;
    await uploadInChunks(file, config, videoId, metadata);
  } else {
    await uploadToBunny(file, 'reel', metadata);
  }
  
  return { success: true, videoId, url: uploadUrl };
};

export const uploadVideo = async (file: any, metadata: any) => {
  const fileName = file.name || file.fileName || `video_${Date.now()}.mp4`;
  const fileSize = file.size || file.fileSize || 0;
  
  const { uploadUrl, videoId } = await getUploadUrl('video', fileName, fileSize, metadata);
  
  if (fileSize > 100 * 1024 * 1024) {
    const config = BUNNY_CONFIG.video;
    await uploadInChunks(file, config, videoId, metadata);
  } else {
    await uploadToBunny(file, 'video', metadata);
  }
  
  return { success: true, videoId, url: uploadUrl };
};

export const uploadPhoto = async (file: any, metadata: any) => {
  const fileName = file.name || file.fileName || `photo_${Date.now()}.jpg`;
  const fileSize = file.size || file.fileSize || 0;
  
  const { uploadUrl } = await getUploadUrl('photo', fileName, fileSize, metadata);
  await uploadToBunny(file, 'photos', metadata);
  
  return { success: true, url: uploadUrl };
};

export const uploadStory = async (file: any, metadata: any) => {
  const fileName = file.name || file.fileName || `story_${Date.now()}.mp4`;
  const fileSize = file.size || file.fileSize || 0;
  
  const { uploadUrl, videoId } = await getUploadUrl('story', fileName, fileSize, metadata);
  await uploadToBunny(file, 'story', metadata);
  
  return { success: true, videoId, url: uploadUrl };
};

export const uploadLive = async (file: any, metadata: any) => {
  const fileName = file.name || file.fileName || `live_${Date.now()}.mp4`;
  const fileSize = file.size || file.fileSize || 0;
  
  const { uploadUrl, videoId } = await getUploadUrl('live', fileName, fileSize, metadata);
  await uploadToBunny(file, 'live', metadata);
  
  return { success: true, videoId, url: uploadUrl };
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
    return await uploadToBunny(file, 'shayari-photos', metadata);
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
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return await apiCall(`/reels?${params}`);
  },

  getAllReels: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return await apiCall(`/reels?${params}`);
  },

  getUserReels: async () => {
    // Remove hardcoded userId - let backend use default
    console.log('📡 Calling getUserReels API...');
    return await apiCall('/reels/user');
  },

  uploadReel: async (file: any, metadata: any) => {
    return await uploadReel(file, metadata);
  },

  updateReel: async (reelId: string, updates: any) => {
    return await apiCall(`/reels/${reelId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteReel: async (reelId: string) => {
    return await apiCall(`/reels/${reelId}`, {
      method: 'DELETE',
    });
  },

  getReelStats: async () => {
    return await apiCall('/reels/stats');
  }
};

export const videosApi = {
  getVideos: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return await apiCall(`/videos?${params}`);
  },

  getUserVideos: async () => {
    // Remove hardcoded userId - let backend use default
    console.log('📡 Calling getUserVideos API...');
    return await apiCall('/videos/user');
  },

  uploadVideo: async (file: any, metadata: any) => {
    return await uploadVideo(file, metadata);
  },

  updateVideo: async (videoId: string, updates: any) => {
    return await apiCall(`/content/${videoId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteVideo: async (videoId: string) => {
    return await apiCall(`/content/${videoId}`, {
      method: 'DELETE',
    });
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

  uploadLive: async (file: any, metadata: any) => {
    return await uploadLive(file, metadata);
  },
};


export const savedApi = {
  getSaved: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    return await apiCall(`/content/saved?${params}`);
  },
  
  saveItem: async (itemId: string, itemType: string) => {
    return await apiCall('/content/save', {
      method: 'POST',
      body: JSON.stringify({ itemId, itemType })
    });
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
    return await apiCall('/users/upload-image', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  },

  getSupporters: async () => {
    return await apiCall('/users/supporters');
  },

  getSupporting: async () => {
    return await apiCall('/users/supporting');
  },

  getEarnings: async (userId?: string) => {
    const endpoint = userId ? `/users/${userId}/earnings` : '/users/earnings';
    return await apiCall(endpoint);
  },

  getTransactions: async (userId?: string) => {
    const endpoint = userId ? `/users/${userId}/transactions` : '/users/transactions';
    return await apiCall(endpoint);
  }
};

// ==================== BUNNYCDN CONFIGURATION ====================
// Centralized configuration for all BunnyCDN services

const BUNNY_CONFIG = {
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

// ==================== CHUNK UPLOAD HELPER ====================
// For large video files - upload in chunks

const uploadInChunks = async (
  file: any, 
  videoConfig: { libraryId: string; host: string; apiKey: string }, 
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
        'AccessKey': videoConfig.apiKey,
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
                'AccessKey': videoConfig.apiKey,
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
        'AccessKey': videoConfig.apiKey,
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
        url: `https://kronop.b-cdn.net/${fileName}`,
        fileName: fileName,
        size: file.size || file.fileSize
      };

    } else {
      // Videos/Reels/Live/Story - BunnyCDN Stream API
      const videoConfig = config as { libraryId: string; host: string; apiKey: string };
      
      // Step 1: Create video entry first
      const createVideoUrl = `https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos`;
      
      // Get file name for title
      const fileName = file.name || file.fileName || `video_${Date.now()}.mp4`;
      const fileSize = file.size || file.fileSize || 0;
      
      // Create video with JSON body first
      const createResponse = await fetch(createVideoUrl, {
        method: 'POST',
        headers: {
          'AccessKey': videoConfig.apiKey,
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
            'AccessKey': videoConfig.apiKey,
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
            'AccessKey': videoConfig.apiKey,
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
