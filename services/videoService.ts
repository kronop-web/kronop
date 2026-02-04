import { Video, Comment } from '../types/video';
import { videosApi } from './api';

// Fallback mock data if API fails or is empty
const MOCK_VIDEOS: Video[] = [];

export const videoService = {
  getAllVideos: async (): Promise<Video[]> => {
    try {
      const response = await videosApi.getVideos();
      // api.ts now returns response.data (array) directly due to our fix
      const data = Array.isArray(response) ? response : [];
      
      return data.map((item: any) => {
        // Construct Direct HLS Link logic
        const guid = item.guid || (item.url && item.url.split('/')[3]) || item.bunny_id || ''; // Extract GUID if possible
        
        // Determine content type and host mapping
        const contentType = item.type || item.contentType || 'video';
        let host = '';
        let libraryId = '';
        
        if (contentType === 'Reel' || contentType === 'reels') {
          host = process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || 'vz-43e06bff-fc5.b-cdn.net';
          libraryId = '584910';
        } else if (contentType === 'Video' || contentType === 'video') {
          host = process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || 'vz-c9342ec7-688.b-cdn.net';
          libraryId = '584911';
        } else if (contentType === 'Live' || contentType === 'live') {
          host = process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || 'vz-abea507d-489.b-cdn.net';
          libraryId = '584916';
        } else {
          // Default to video host
          host = process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || 'vz-c9342ec7-688.b-cdn.net';
          libraryId = '584911';
        }

        // Force .m3u8 playlist format for videos, use iframe for long videos
        let finalVideoUrl = item.url || item.videoUrl || '';
        if (guid && host) {
          // For long videos, try iframe URL first, fallback to m3u8
          if (contentType === 'Video' || contentType === 'video') {
            finalVideoUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${guid}`;
            // Keep m3u8 as backup
            const m3u8Url = `https://${host}/${guid}/playlist.m3u8`;
            console.log(`🎥 Video URL for ${item.title}: ${finalVideoUrl}`);
            console.log(`🎥 Backup m3u8 URL: ${m3u8Url}`);
          } else {
            finalVideoUrl = `https://${host}/${guid}/playlist.m3u8`;
            console.log(`🎥 ${contentType} URL: ${finalVideoUrl}`);
          }
        }
        
        // Clean and validate the final URL
        if (finalVideoUrl) {
          finalVideoUrl = finalVideoUrl.trim();
          console.log('🔧 CLEANING FINAL VIDEO URL:', JSON.stringify(item.url || item.videoUrl), '->', JSON.stringify(finalVideoUrl));
          
          if (!finalVideoUrl.startsWith('https')) {
            console.error('❌ INVALID FINAL URL FORMAT:', finalVideoUrl);
            // Fallback to a valid URL format if possible
            if (guid && host) {
              finalVideoUrl = `https://${host}/${guid}/playlist.m3u8`;
              console.log('🔧 FALLBACK URL:', finalVideoUrl);
            }
          }
        }

        // Clean title - remove Facebook_123 style prefixes
        let cleanTitle = item.title || 'Untitled Video';
        if (cleanTitle.match(/^[a-zA-Z]+_\d+/)) {
          cleanTitle = cleanTitle.replace(/^[a-zA-Z]+_\d+_?/, '');
          if (!cleanTitle) cleanTitle = 'Untitled Video';
        }
        if (cleanTitle.length > 60) {
          cleanTitle = cleanTitle.substring(0, 57) + '...';
        }

        return {
          id: item._id || item.id,
          title: cleanTitle,
          description: item.description || '',
          thumbnailUrl: item.thumbnail || item.thumbnailUrl || '',
          videoUrl: finalVideoUrl,
          duration: item.duration || 0,
          views: item.views || 0,
          likes: item.likes || 0,
          dislikes: 0,
          uploadDate: item.created_at || new Date().toISOString(),
          channelId: item.user_id?._id || item.user?._id || 'admin',
          channelName: item.user_id?.name || item.user?.name || item.user_id?.username || item.user?.username || 'Kronop Admin',
          channelAvatar: item.user_id?.avatar || item.user?.avatar || 'https://picsum.photos/seed/admin/100/100',
          followerCount: item.user_id?.followers || item.user?.followers || 0,
          contentType: contentType === 'Reel' ? 'reel' : contentType === 'Photo' ? 'photo' : 'video',
          guid: guid, // Store guid for debugging if needed
        };
      });
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      return MOCK_VIDEOS;
    }
  },

  getVideoById: async (id: string): Promise<Video | null> => {
    try {
      // Since we don't have a single item endpoint yet, we'll fetch list and find
      // In production, you should add GET /api/content/item/:id
      const videos = await videoService.getAllVideos();
      return videos.find(v => v.id === id) || null;
    } catch (error) {
      console.error('Failed to get video by id:', error);
      return null;
    }
  },

  getVideoComments: async (videoId: string): Promise<Comment[]> => {
    // Return mock comments for now as backend comments API might not be ready
    await new Promise(resolve => setTimeout(resolve, 400));
    return [
      {
        id: '1',
        videoId,
        userId: 'u1',
        userName: 'John Doe',
        userAvatar: 'https://picsum.photos/seed/user1/100/100',
        text: 'Great video! Very helpful content.',
        likes: 45,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  },

  searchVideos: async (query: string): Promise<Video[]> => {
    const videos = await videoService.getAllVideos();
    return videos.filter(v =>
      v.title.toLowerCase().includes(query.toLowerCase())
    );
  },

  likeVideo: async (videoId: string): Promise<void> => {
    // TODO: Connect to backend like API
    await new Promise(resolve => setTimeout(resolve, 200));
  },

  addComment: async (videoId: string, text: string, parentId?: string): Promise<Comment> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      id: Date.now().toString(),
      videoId,
      userId: 'current',
      userName: 'You',
      userAvatar: 'https://picsum.photos/seed/currentuser/100/100',
      text,
      likes: 0,
      timestamp: new Date().toISOString(),
      replies: [],
      parentId,
    };
  },

  likeComment: async (commentId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
  },

  dislikeVideo: async (videoId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
  },

  shareVideo: async (videoId: string): Promise<string> => {
    return `https://videotube.app/video/${videoId}`;
  },

  downloadVideo: async (videoId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  },
};
