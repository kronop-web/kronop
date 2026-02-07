import { apiCall } from './api';
import { BUNNY_CONFIG } from '../constants/Config';

export const storyService = {
  getConfig: () => BUNNY_CONFIG.story,

  getStories: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    try {
      // Fetch both stories and reels
      const [storiesResult, reelsResult] = await Promise.all([
        apiCall(`/content/story?${params}`),
        apiCall(`/content/reels?${params}`)
      ]);
      
      // Combine stories and reels
      const stories = storiesResult.success ? storiesResult.data || [] : [];
      const reels = reelsResult.success ? reelsResult.data || [] : [];
      
      // Convert reels to story format
      const reelsAsStories = reels.map((reel: any) => ({
        id: `reel_${reel.id}`,
        user_id: reel.user_id || 'anonymous',
        user_name: reel.user_name || 'Anonymous',
        user_avatar: reel.thumbnailUrl || 'https://via.placeholder.com/100',
        media_url: reel.url || reel.thumbnailUrl,
        thumbnail_url: reel.thumbnailUrl,
        video_url: reel.url,
        created_at: reel.createdAt || new Date().toISOString(),
        viewed: false,
        type: 'reel'
      }));
      
      // Combine both arrays
      const combinedContent = [...stories, ...reelsAsStories];
      
      return {
        success: true,
        data: combinedContent
      };
    } catch (error) {
      console.error('Error fetching stories and reels:', error);
      return { success: false, data: [] };
    }
  },

  getGroupedStories: async () => {
    try {
      const result = await storyService.getStories();
      
      console.log('StoryService: Raw API result:', result);
      
      if (result.success && Array.isArray(result.data)) {
        console.log('StoryService: Got stories array:', result.data.length);
        
        if (result.data.length === 0) {
          console.log('StoryService: No stories from API, returning empty array');
          return {
            success: true,
            data: []
          };
        }
        
        // Group stories by user (including reels)
        const grouped = result.data.reduce((acc: any, item: any) => {
          const userId = item.user_id || 'anonymous';
          
          if (!acc[userId]) {
            acc[userId] = {
              userId,
              userName: item.user_name || 'Anonymous',
              userAvatar: item.user_avatar || 'https://via.placeholder.com/100',
              stories: [],
              latestTimestamp: item.created_at
            };
          }
          
          acc[userId].stories.push({
            id: item.id,
            userId: item.user_id || 'anonymous',
            userName: item.user_name || 'Anonymous',
            userAvatar: item.user_avatar || 'https://via.placeholder.com/100',
            imageUrl: item.media_url || item.thumbnail_url,
            thumbnailUrl: item.thumbnail_url,
            videoUrl: item.video_url,
            timestamp: item.created_at,
            viewed: item.viewed || false,
            type: item.type || 'story'
          });
          
          // Update latest timestamp if this story is newer
          if (new Date(item.created_at) > new Date(acc[userId].latestTimestamp)) {
            acc[userId].latestTimestamp = item.created_at;
          }
          
          return acc;
        }, {});
        
        // Convert to array and sort by latest timestamp
        return {
          success: true,
          data: Object.values(grouped).sort((a: any, b: any) => 
            new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
          )
        };
      }
      
      return { success: false, data: [] };
    } catch (error) {
      console.error('Error grouping stories:', error);
      return { success: false, data: [] };
    }
  },

  markStoryAsViewed: async (storyId: string) => {
    try {
      return await apiCall(`/content/story/${storyId}/view`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error marking story as viewed:', error);
      return { success: false };
    }
  },

  uploadStory: async (file: any, metadata: any) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));
      
      return await apiCall('/content/story', {
        method: 'POST',
        body: formData
      });
    } catch (error) {
      console.error('Error uploading story:', error);
      return { success: false, error: 'Failed to upload story' };
    }
  },

  deleteStory: async (storyId: string) => {
    try {
      return await apiCall(`/content/story/${storyId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting story:', error);
      return { success: false, error: 'Failed to delete story' };
    }
  }
};
