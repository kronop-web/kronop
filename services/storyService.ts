import { apiCall, BUNNY_CONFIG } from './cnv_config';

export const storyService = {
  getConfig: () => BUNNY_CONFIG.story,

  getStories: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return await apiCall(`/content/story?${params}`);
  },

  getGroupedStories: async () => {
    try {
      const result = await storyService.getStories();
      
      console.log('StoryService: Raw API result:', result);
      
      if (result.success && Array.isArray(result.data)) {
        console.log('StoryService: Got stories array:', result.data.length);
        
        if (result.data.length === 0) {
          console.log('StoryService: No stories from API, returning empty array');
          // Return empty array when no stories available - NO MOCK DATA
          return {
            success: true,
            data: []
          };
        }
        
        // Group stories by user
        const grouped = result.data.reduce((acc: any, story: any) => {
          const userId = story.user_id || 'anonymous';
          
          if (!acc[userId]) {
            acc[userId] = {
              userId,
              userName: story.user_profiles?.username || story.user_name || 'Anonymous',
              userAvatar: story.user_profiles?.avatar_url || story.user_avatar || 'https://via.placeholder.com/100',
              stories: [],
              latestTimestamp: story.created_at
            };
          }
          
          acc[userId].stories.push({
            id: story.id,
            userId: story.user_id || 'anonymous',
            userName: story.user_profiles?.username || story.user_name || 'Anonymous',
            userAvatar: story.user_profiles?.avatar_url || story.user_avatar || 'https://via.placeholder.com/100',
            imageUrl: story.media_url || story.thumbnail_url,
            thumbnailUrl: story.thumbnail_url,
            videoUrl: story.video_url,
            timestamp: story.created_at,
            viewed: story.viewed || false
          });
          
          // Update latest timestamp if this story is newer
          if (new Date(story.created_at) > new Date(acc[userId].latestTimestamp)) {
            acc[userId].latestTimestamp = story.created_at;
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
