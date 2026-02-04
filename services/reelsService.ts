import { apiCall, BUNNY_CONFIG } from './cnv_config';

export const reelsService = {
  getConfig: () => BUNNY_CONFIG.reels,

  getReels: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return await apiCall(`/content/reels?${params}`);
  },

  getUserReels: async (userId?: string) => {
    // Redirect to global reels endpoint
    const params = new URLSearchParams({
      page: '1',
      limit: '20',
    });
    return await apiCall(`/content/reels?${params}`);
  },

  uploadReel: async (file: any, metadata: any) => {
    // Placeholder for reel upload logic
    return { success: true, message: "Reel upload logic ready" };
  },

  deleteReel: async (reelId: string) => {
    return await apiCall(`/reels/${reelId}`, { method: 'DELETE' });
  },

  updateReel: async (reelId: string, updates: any) => {
    return await apiCall(`/reels/${reelId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
};
