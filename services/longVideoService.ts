// Long Video Service - Connected to MongoDB via Bridge API
// Fetches long videos from MongoDB database through Bridge API (not direct BunnyCDN)

import { videosApi } from './api';
import { getBunnyConfigByType } from '../constants/Config';

export interface LongVideo {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  views: string;
  likes: number;
  isLiked: boolean;
  type: 'long';
  user: {
    name: string;
    avatar: string;
    isSupported: boolean;
    supporters: number;
  };
  description: string;
  comments: number;
}

// Format duration from seconds to MM:SS
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Format views count
function formatViews(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

// Transform MongoDB video data to LongVideo format
function transformVideoData(item: any): LongVideo {
  // Extract GUID for video URL construction
  const guid = item.guid || item.bunny_id || (item.url && item.url.split('/')[3]) || '';
  
  // Get BunnyCDN config for video type
  const contentType = item.type || item.contentType || 'video';
  const bunnyConfig = getBunnyConfigByType(contentType);
  const host = bunnyConfig.host || '';
  
  // Construct HLS streaming URL
  let videoUrl = item.url || item.video_url || '';
  if (guid && host) {
    videoUrl = `https://${host}/${guid}/playlist.m3u8`;
  }
  
  // Construct thumbnail URL
  let thumbnail = item.thumbnail || item.thumbnail_url || '';
  if (!thumbnail && guid && host) {
    thumbnail = `https://${host}/${guid}/thumbnail.jpg`;
  }
  
  // Clean title
  let cleanTitle = item.title || 'Untitled Video';
  if (cleanTitle.match(/^[a-zA-Z]+_\d+/)) {
    cleanTitle = cleanTitle.replace(/^[a-zA-Z]+_\d+_?/, '');
    if (!cleanTitle) cleanTitle = 'Untitled Video';
  }
  
  // Format duration
  const durationSeconds = item.duration || 0;
  const formattedDuration = formatDuration(durationSeconds);
  
  // Format views
  const views = item.views || item.views_count || 0;
  const formattedViews = formatViews(views);
  
  // Get user info
  const userName = item.user_id?.name || item.user?.name || item.user_id?.username || item.user?.username || item.channelName || 'Kronop Creator';
  const userAvatar = item.user_id?.avatar || item.user?.avatar || item.channelAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
  
  return {
    id: item._id || item.id || guid || `video_${Date.now()}`,
    title: cleanTitle,
    thumbnail: thumbnail,
    videoUrl: videoUrl,
    duration: formattedDuration,
    views: formattedViews,
    likes: item.likes || item.likes_count || 0,
    isLiked: false,
    type: 'long',
    user: {
      name: userName,
      avatar: userAvatar,
      isSupported: false,
      supporters: item.user_id?.followers || item.user?.followers || item.followerCount || 0,
    },
    description: item.description || cleanTitle || 'Watch this amazing video on Kronop!',
    comments: item.comments || item.comments_count || 0,
  };
}

// Fetch videos from MongoDB via Bridge API
async function fetchVideosFromBridgeAPI(): Promise<LongVideo[]> {
  try {
    console.log('📡 Fetching long videos from MongoDB via Bridge API...');
    
    // Call Bridge API (which connects to MongoDB)
    const response = await videosApi.getVideos(1, 50); // Fetch first 50 videos
    
    // Ensure response is an array
    const data = Array.isArray(response) ? response : [];
    
    if (data.length === 0) {
      console.warn('⚠️ No videos found from Bridge API, using fallback');
      return sampleLongVideos;
    }
    
    console.log(`✅ Fetched ${data.length} videos from MongoDB via Bridge API`);
    
    // Transform MongoDB data to LongVideo format
    const videos: LongVideo[] = data
      .filter((item: any) => item && (item._id || item.id)) // Only include valid videos
      .map(transformVideoData);
    
    return videos.length > 0 ? videos : sampleLongVideos;
  } catch (error: any) {
    console.error('❌ Error fetching videos from Bridge API:', error.message);
    console.warn('⚠️ Using fallback sample videos due to error');
    return sampleLongVideos;
  }
}

// Sample fallback videos (used when API is unavailable)
export const sampleLongVideos: LongVideo[] = [
  {
    id: '1',
    title: 'Stunning Mountain Landscapes in 4K',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=450&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: '10:24',
    views: '1.2M',
    likes: 45000,
    isLiked: false,
    type: 'long',
    user: {
      name: 'Nature Explorer',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      isSupported: false,
      supporters: 12500,
    },
    description: 'Experience breathtaking mountain landscapes captured in stunning 4K quality. This video takes you through some of the most beautiful mountain ranges in the world, featuring snow-capped peaks, pristine lakes, and dramatic valleys.',
    comments: 1240,
  },
  {
    id: '2',
    title: 'Ocean Waves - Relaxing Nature Sounds',
    thumbnail: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=450&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: '8:15',
    views: '890K',
    likes: 32000,
    isLiked: false,
    type: 'long',
    user: {
      name: 'Ocean Vibes',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      isSupported: false,
      supporters: 8900,
    },
    description: 'Relax and unwind with soothing ocean wave sounds. Perfect for meditation, sleep, or creating a peaceful atmosphere. Filmed at various beautiful beaches around the world.',
    comments: 567,
  },
];

// Get long videos - fetches from MongoDB via Bridge API
export async function getLongVideos(): Promise<LongVideo[]> {
  try {
    return await fetchVideosFromBridgeAPI();
  } catch (error) {
    console.error('Error in getLongVideos:', error);
    return sampleLongVideos;
  }
}

// Get single video by ID
export async function getLongVideoById(id: string): Promise<LongVideo | null> {
  try {
    const videos = await getLongVideos();
    return videos.find(v => v.id === id) || null;
  } catch (error) {
    console.error('Error in getLongVideoById:', error);
    return null;
  }
}

// Toggle like for a video
export function toggleLike(videoId: string, videos: LongVideo[]): LongVideo[] {
  return videos.map(video => {
    if (video.id === videoId) {
      return {
        ...video,
        isLiked: !video.isLiked,
        likes: video.isLiked ? video.likes - 1 : video.likes + 1,
      };
    }
    return video;
  });
}
