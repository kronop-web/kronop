import { storiesApi } from './api';

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  timestamp: string;
  viewed: boolean;
}

export interface GroupedStory {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: Story[];
  latestTimestamp: string;
}

class StoryService {
  async getGroupedStories(): Promise<{ success: boolean; data: GroupedStory[]; error?: string }> {
    try {
      // For now, return mock data since the backend story service is not fully implemented
      const mockStories: GroupedStory[] = [
        {
          userId: 'user1',
          userName: 'John Doe',
          userAvatar: 'https://via.placeholder.com/100',
          stories: [
            {
              id: 's1',
              userId: 'user1',
              userName: 'John Doe',
              userAvatar: 'https://via.placeholder.com/100',
              imageUrl: 'https://picsum.photos/1080x1920?random=1',
              timestamp: new Date().toISOString(),
              viewed: false
            }
          ],
          latestTimestamp: new Date().toISOString()
        },
        {
          userId: 'user2',
          userName: 'Jane Smith',
          userAvatar: 'https://via.placeholder.com/100',
          stories: [
            {
              id: 's2',
              userId: 'user2',
              userName: 'Jane Smith',
              userAvatar: 'https://via.placeholder.com/100',
              imageUrl: 'https://picsum.photos/1080x1920?random=2',
              timestamp: new Date().toISOString(),
              viewed: true
            }
          ],
          latestTimestamp: new Date().toISOString()
        }
      ];

      return { success: true, data: mockStories };
    } catch (error: any) {
      console.error('StoryService: Failed to load stories:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  async getStories(page = 1, limit = 20) {
    try {
      const result = await storiesApi.getStories(page, limit);
      return result;
    } catch (error: any) {
      console.error('StoryService: Failed to get stories:', error);
      throw error;
    }
  }
}

export const storyService = new StoryService();
