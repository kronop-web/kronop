import { videoService } from './videoService';
import { reelsService } from './reelsService';
import { liveService } from './liveService';
import { storyService } from './storyService';
import { getPhotosByCategory, getRelatedPhotos } from './photoService';
import { apiCall } from './api';

// Bridge Service acting as a Facade
export const bridgeService = {
  // Content Services
  video: videoService,
  reels: reelsService,
  live: liveService,
  story: storyService,
  photos: {
    getByCategory: getPhotosByCategory,
    getRelated: getRelatedPhotos,
  },

  // General API Access (if needed directly)
  apiCall: apiCall,

  // User Profile (Keeping it here for now as it's shared)
  user: {
    getProfile: async (userId?: string) => {
       const endpoint = userId ? `/users/${userId}` : '/users/profile';
       return await apiCall(endpoint);
    },
    getCurrentProfile: async () => {
       return await apiCall('/users/profile'); // Backend should handle /users/profile as "me" if no ID
    },
    getSupporters: async () => await apiCall('/users/supporters'),
    getSupporting: async () => await apiCall('/users/supporting'),
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
    }
  }
};
