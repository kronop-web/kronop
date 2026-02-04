import AsyncStorage from '@react-native-async-storage/async-storage';

// Content types enum for type safety
export enum ContentType {
  REELS = 'reels',
  VIDEOS = 'videos',
  PHOTOS = 'photos',
  STORIES = 'stories',
  LIVE = 'live',
  SHAYARI = 'shayari'
}

// User content interface
export interface UserContent {
  id: string;
  userId: string;
  contentType: ContentType;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Pagination interface
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total: number;
  offset: number;
  limit: number;
}

// Database response wrapper for crash-free operations
export interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

class UserContentService {
  private static instance: UserContentService;
  private readonly STORAGE_KEY = 'user_content_database';
  private readonly MAX_RETRIES = 3;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): UserContentService {
    if (!UserContentService.instance) {
      UserContentService.instance = new UserContentService();
    }
    return UserContentService.instance;
  }

  // Safe storage operations with error handling
  private async safeStorageOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<DatabaseResponse<T>> {
    let retries = 0;
    
    while (retries < this.MAX_RETRIES) {
      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          timestamp: Date.now()
        };
      } catch (error) {
        retries++;
        console.error(`[DATABASE ERROR] ${operationName} - Attempt ${retries}:`, error);
        
        if (retries >= this.MAX_RETRIES) {
          return {
            success: false,
            error: `${operationName} failed after ${retries} attempts: ${error}`,
            timestamp: Date.now()
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    return {
      success: false,
      error: `${operationName} failed: Maximum retries exceeded`,
      timestamp: Date.now()
    };
  }

  // Get paginated content for a specific user and content type
  async getUserContentPaginated(
    userId: string,
    contentType: ContentType,
    pagination: PaginationParams = { limit: 10, offset: 0 }
  ): Promise<DatabaseResponse<PaginatedResponse<UserContent>>> {
    return this.safeStorageOperation(async () => {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allContent: UserContent[] = stored ? JSON.parse(stored) : [];
      
      const userContent = allContent.filter(
        item => item.userId === userId && item.contentType === contentType
      );

      // Sort by creation date (newest first)
      const sortedContent = userContent.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Apply pagination
      const limit = pagination.limit || 10;
      const offset = pagination.offset || 0;
      const paginatedData = sortedContent.slice(offset, offset + limit);
      
      return {
        data: paginatedData,
        hasMore: offset + limit < sortedContent.length,
        total: sortedContent.length,
        offset,
        limit
      };
    }, `getUserContentPaginated(${userId}, ${contentType}, ${JSON.stringify(pagination)})`);
  }

  // Get all content for a specific user and content type (legacy method)
  async getUserContent(
    userId: string,
    contentType: ContentType
  ): Promise<DatabaseResponse<UserContent[]>> {
    return this.safeStorageOperation(async () => {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allContent: UserContent[] = stored ? JSON.parse(stored) : [];
      
      const userContent = allContent.filter(
        item => item.userId === userId && item.contentType === contentType
      );

      // Sort by creation date (newest first)
      return userContent.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }, `getUserContent(${userId}, ${contentType})`);
  }

  // Get content statistics for a user
  async getUserStats(userId: string): Promise<DatabaseResponse<Record<ContentType, {
    count: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
  }>>> {
    return this.safeStorageOperation(async () => {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allContent: UserContent[] = stored ? JSON.parse(stored) : [];
      
      const userContent = allContent.filter(item => item.userId === userId);
      
      const stats: Record<ContentType, any> = {
        [ContentType.REELS]: { count: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
        [ContentType.VIDEOS]: { count: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
        [ContentType.PHOTOS]: { count: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
        [ContentType.STORIES]: { count: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
        [ContentType.LIVE]: { count: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
        [ContentType.SHAYARI]: { count: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 }
      };

      userContent.forEach(item => {
        const contentType = item.contentType as ContentType;
        if (stats[contentType]) {
          stats[contentType].count++;
          stats[contentType].totalViews += item.views;
          stats[contentType].totalLikes += item.likes;
          stats[contentType].totalComments += item.comments;
          stats[contentType].totalShares += item.shares;
        }
      });

      return stats;
    }, `getUserStats(${userId})`);
  }

  // Add new content (for upload functionality)
  async addContent(content: Omit<UserContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseResponse<UserContent>> {
    return this.safeStorageOperation(async () => {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allContent: UserContent[] = stored ? JSON.parse(stored) : [];
      
      const newContent: UserContent = {
        ...content,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      allContent.push(newContent);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allContent));
      
      return newContent;
    }, `addContent(${content.contentType})`);
  }

  // Update content (for likes, views, etc.)
  async updateContent(
    contentId: string,
    updates: Partial<UserContent>
  ): Promise<DatabaseResponse<UserContent>> {
    return this.safeStorageOperation(async () => {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allContent: UserContent[] = stored ? JSON.parse(stored) : [];
      
      const contentIndex = allContent.findIndex(item => item.id === contentId);
      if (contentIndex === -1) {
        throw new Error(`Content with id ${contentId} not found`);
      }

      allContent[contentIndex] = {
        ...allContent[contentIndex],
        ...updates,
        updatedAt: new Date()
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allContent));
      return allContent[contentIndex];
    }, `updateContent(${contentId})`);
  }

  // Delete content
  async deleteContent(contentId: string): Promise<DatabaseResponse<boolean>> {
    return this.safeStorageOperation(async () => {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allContent: UserContent[] = stored ? JSON.parse(stored) : [];
      
      const filteredContent = allContent.filter(item => item.id !== contentId);
      
      if (filteredContent.length === allContent.length) {
        throw new Error(`Content with id ${contentId} not found`);
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredContent));
      return true;
    }, `deleteContent(${contentId})`);
  }

  // Get single content by ID
  async getContentById(contentId: string): Promise<DatabaseResponse<UserContent>> {
    return this.safeStorageOperation(async () => {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allContent: UserContent[] = stored ? JSON.parse(stored) : [];
      
      const content = allContent.find(item => item.id === contentId);
      if (!content) {
        throw new Error(`Content with id ${contentId} not found`);
      }

      return content;
    }, `getContentById(${contentId})`);
  }

  // Initialize with sample data for testing
  async initializeSampleData(userId: string): Promise<DatabaseResponse<boolean>> {
    return this.safeStorageOperation(async () => {
      const sampleContent: Omit<UserContent, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          userId,
          contentType: ContentType.REELS,
          title: "Amazing Reel 1",
          description: "First amazing reel",
          url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
          thumbnailUrl: "https://picsum.photos/seed/reel1/300/400",
          duration: 30,
          views: 1250,
          likes: 89,
          comments: 12,
          shares: 5,
          isPublic: true,
          tags: ["amazing", "first", "reel"]
        },
        {
          userId,
          contentType: ContentType.VIDEOS,
          title: "Tutorial Video 1",
          description: "Learn something new",
          url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
          thumbnailUrl: "https://picsum.photos/seed/video1/300/400",
          duration: 300,
          views: 3500,
          likes: 234,
          comments: 45,
          shares: 23,
          isPublic: true,
          tags: ["tutorial", "learn", "video"]
        },
        {
          userId,
          contentType: ContentType.PHOTOS,
          title: "Beautiful Photo",
          description: "Nature photography",
          url: "https://picsum.photos/seed/photo1/800/600",
          thumbnailUrl: "https://picsum.photos/seed/photo1/300/400",
          views: 890,
          likes: 67,
          comments: 8,
          shares: 3,
          isPublic: true,
          tags: ["nature", "photography", "beautiful"]
        },
        {
          userId,
          contentType: ContentType.SHAYARI,
          title: "Dil Ki Baat",
          description: "दिल की बात शायरी में",
          url: "shayari://dil-ki-baat",
          views: 567,
          likes: 45,
          comments: 6,
          shares: 2,
          isPublic: true,
          tags: ["shayari", "dil", "hindipoetry"]
        }
      ];

      for (const content of sampleContent) {
        await this.addContent(content);
      }

      return true;
    }, `initializeSampleData(${userId})`);
  }

  // Clear all data (for testing/reset)
  async clearAllData(): Promise<DatabaseResponse<boolean>> {
    return this.safeStorageOperation(async () => {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      return true;
    }, 'clearAllData');
  }
}

export default UserContentService.getInstance();
