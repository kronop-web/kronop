import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Share,
  Alert,
  Animated,
  TextInput,
  ScrollView
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Categories array
const CATEGORIES = [
  'All',
  'Entertainment',
  'Music',
  'Gaming',
  'Movie',
  'News',
  'Sports',
  'People',
  'Food',
  'HowTo',
  'ProductReviews',
  'Education',
  'Science',
  'Autos',
  'Travel',
  'Pets',
  'Nonprofits'
];

// ==================== BUNNY.NET API CONFIGURATION ====================
interface BunnyConfigType {
  LIBRARY_ID: string;
  ACCESS_KEY: string;
  STREAM_KEY: string;
  CDN_HOSTNAME: string;
  TOKEN_KEY: string;
  LIST_VIDEOS_URL: string;
  getVideoUrl: (videoId: string) => string;
  getThumbnailUrl: (videoId: string) => string;
  getApiHeaders: () => any;
}

const BUNNY_CONFIG: BunnyConfigType = {
  LIBRARY_ID: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || process.env.BUNNY_LIBRARY_ID_VIDEO || '',
  ACCESS_KEY: process.env.EXPO_PUBLIC_BUNNY_API_KEY_VIDEO || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || '',
  STREAM_KEY: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_VIDEO || process.env.BUNNY_STREAM_KEY_VIDEO || '',
  CDN_HOSTNAME: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || process.env.BUNNY_HOST_VIDEO || '',
  TOKEN_KEY: process.env.EXPO_PUBLIC_BUNNY_TOKEN_KEY || process.env.BUNNY_TOKEN_KEY || '',
  
  // API URLs - VARIABLE: Use environment variables for all BunnyCDN endpoints
  LIST_VIDEOS_URL: `${process.env.EXPO_PUBLIC_BUNNY_API_URL || 'https://video.bunnycdn.com'}/library/${process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || process.env.BUNNY_LIBRARY_ID_VIDEO || ''}/videos`,
  
  // Get video URL for player - FIXED: Use stream URL with audio
  getVideoUrl: (videoId: string) => {
    const host = process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || process.env.BUNNY_HOST_VIDEO || '';
    // Use playlist.m3u8 for streaming with audio (instead of play_720p.mp4)
    return host ? `https://${host}/${videoId}/playlist.m3u8` : '';
  },
  
  // Get thumbnail URL
  getThumbnailUrl: (videoId: string) => {
    const host = process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || process.env.BUNNY_HOST_VIDEO || '';
    return host ? `https://${host}/${videoId}/thumbnail.jpg` : '';
  },
  
  // API headers - FIXED: Add security token for video access
  getApiHeaders: () => {
    const headers: any = {
      'AccessKey': BUNNY_CONFIG.ACCESS_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    // Add security token if available for video access
    if (BUNNY_CONFIG.STREAM_KEY) {
      headers['Authorization'] = `Bearer ${BUNNY_CONFIG.STREAM_KEY}`;
    }
    
    console.log('📡 Video Headers:', headers);
    return headers;
  }
};

// ==================== BUNNY.NET VIDEOS SERVICE ====================
class BunnyVideosService {
  // Get all videos from Bunny CDN
  async getAllVideos() {
    try {
      console.log('📡 Fetching videos from Bunny CDN...');
      
      const response = await fetch(BUNNY_CONFIG.LIST_VIDEOS_URL, {
        method: 'GET',
        headers: BUNNY_CONFIG.getApiHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Bunny API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform Bunny response to Video format
      const videos = data.items?.map((item: any) => {
        const videoId = item.guid || item.id || `video_${Date.now()}_${Math.random()}`;
        
        // Check if video is accessible
        const isAccessible = item.status === 'ready' || !item.status;
        
        return {
          id: videoId,
          user_id: 'bunny_user',
          title: item.title || 'Amazing Video',
          description: item.description || 'Check out this awesome video!',
          video_url: isAccessible ? BUNNY_CONFIG.getVideoUrl(videoId) : null,
          thumbnail_url: BUNNY_CONFIG.getThumbnailUrl(videoId),
          duration: Math.floor(item.length || 120),
          views_count: item.views || Math.floor(Math.random() * 10000),
          likes_count: item.likes || Math.floor(Math.random() * 500),
          category: CATEGORIES[Math.floor(Math.random() * (CATEGORIES.length - 1)) + 1],
          tags: item.tags ? item.tags.split(',') : ['video', 'entertainment'],
          is_public: true,
          created_at: item.dateUploaded || new Date().toISOString(),
          user_profiles: {
            username: 'Bunny Creator',
            avatar_url: 'https://i.pravatar.cc/150'
          }
        };
      })?.filter((video: any) => video.video_url !== null) || []; // Filter out inaccessible videos
      
      console.log(`✅ Successfully loaded ${videos.length} videos from Bunny CDN`);
      return { data: videos, error: null };
      
    } catch (error: any) {
      console.error('❌ Bunny CDN fetch error:', error.message);
      
      // Fallback to sample videos
      const sampleVideos = this.getSampleVideos();
      return { data: sampleVideos, error: error.message };
    }
  }

  // Get sample videos for fallback
  getSampleVideos() {
    const videoUrls = [
      process.env.EXPO_PUBLIC_SAMPLE_VIDEO_1 || '',
      process.env.EXPO_PUBLIC_SAMPLE_VIDEO_2 || '',
      process.env.EXPO_PUBLIC_SAMPLE_VIDEO_3 || '',
      process.env.EXPO_PUBLIC_SAMPLE_VIDEO_4 || '',
    ].filter(url => url !== '');

    return Array.from({ length: 12 }, (_, index) => ({
      id: `video_${Date.now()}_${index}`,
      user_id: `user_${index + 1}`,
      title: `Awesome Video ${index + 1}`,
      description: `This is an amazing video ${index + 1} with great content and production quality.`,
      video_url: videoUrls[index % videoUrls.length],
      thumbnail_url: `https://picsum.photos/400/225?random=${index}`,
      duration: 120 + (index * 30),
      views_count: 10000 + (index * 2500),
      likes_count: 500 + (index * 100),
      category: CATEGORIES[(index % (CATEGORIES.length - 1)) + 1],
      tags: ['video', 'entertainment', 'fun'],
      is_public: true,
      created_at: new Date(Date.now() - index * 86400000).toISOString(),
      user_profiles: {
        username: `Creator${index + 1}`,
        avatar_url: `https://i.pravatar.cc/150?img=${index + 3}`
      }
    }));
  }
}

// Initialize Bunny Videos Service
const bunnyVideosService = new BunnyVideosService();

interface Video {
  id: string;
  user_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  views_count: number;
  likes_count: number;
  category: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  user_profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

// Bullet Comment Interface
interface BulletComment {
  id: string;
  text: string;
  position: number;
  color: string;
}

// ==================== DOT ANIMATION ====================
const DotAnimation = ({ isActive }: { isActive: boolean }) => {
  const dotsAnim = useRef(new Animated.Value(0)).current;
  const [animationActive, setAnimationActive] = useState(false);

  useEffect(() => {
    if (isActive) {
      startAnimation();
    }
  }, [isActive]);

  const startAnimation = () => {
    setAnimationActive(true);
    dotsAnim.setValue(0);

    Animated.timing(dotsAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        setAnimationActive(false);
      }, 300);
    });
  };

  if (!animationActive) return null;

  return (
    <View style={styles.dotAnimationContainer}>
      {Array.from({ length: 200 }).map((_, i) => {
        const angle = (i * 1.8) * (Math.PI / 180);
        const distance = 250 + Math.random() * 150;
        const size = 1 + Math.random() * 2;
        
        return (
          <Animated.View 
            key={`dot-${i}`}
            style={[
              styles.tinyRedDot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: dotsAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1, 0]
                }),
                transform: [
                  {
                    translateX: dotsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Math.cos(angle) * distance, 0]
                    })
                  },
                  {
                    translateY: dotsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Math.sin(angle) * distance, 0]
                    })
                  },
                  {
                    scale: dotsAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 1.2, 0.8]
                    })
                  }
                ]
              }
            ]}
          />
        );
      })}
    </View>
  );
};

// Bullet Comment Component
const BulletComment = ({ comment }: { comment: BulletComment }) => {
  const translateX = useRef(new Animated.Value(width)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -200,
        duration: 8000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(7000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.bulletComment,
        {
          top: comment.position,
          transform: [{ translateX }],
          opacity,
        },
      ]}
    >
      <Text style={[styles.bulletCommentText, { color: comment.color }]}>
        {comment.text}
      </Text>
    </Animated.View>
  );
};

// Horizontal Controls Component
const HorizontalControls = ({
  isLandscape,
  onShare,
  onComment,
  onSpeedChange,
  onLockToggle,
  onBrightnessChange,
  onVolumeChange,
  currentSpeed,
  isLocked,
}: {
  isLandscape: boolean;
  onShare: () => void;
  onComment: () => void;
  onSpeedChange: (speed: number) => void;
  onLockToggle: () => void;
  onBrightnessChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
  currentSpeed: number;
  isLocked: boolean;
}) => {
  const [showControls, setShowControls] = useState(true);
  const [brightness, setBrightness] = useState(0.5);
  const [volume, setVolume] = useState(0.7);

  if (!isLandscape || isLocked) return null;

  return (
    <View style={styles.horizontalControlsContainer}>
      {/* Left Side Controls */}
      <View style={styles.leftControls}>
        <TouchableOpacity style={styles.controlButton} onPress={onShare}>
          <MaterialIcons name="share" size={24} color="#fff" />
          <Text style={styles.controlButtonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={onComment}>
          <MaterialIcons name="chat-bubble-outline" size={24} color="#fff" />
          <Text style={styles.controlButtonText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => onSpeedChange(currentSpeed === 1 ? 1.5 : currentSpeed === 1.5 ? 2 : 0.5)}
        >
          <MaterialIcons name="speed" size={24} color="#fff" />
          <Text style={styles.controlButtonText}>{currentSpeed}x</Text>
        </TouchableOpacity>
      </View>

      {/* Right Side Controls */}
      <View style={styles.rightControls}>
        <TouchableOpacity style={styles.controlButton} onPress={onLockToggle}>
          <MaterialIcons 
            name={isLocked ? "lock" : "lock-open"} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.controlButtonText}>{isLocked ? "Unlock" : "Lock"}</Text>
        </TouchableOpacity>

        {/* Brightness Control */}
        <View style={styles.sliderControl}>
          <MaterialIcons name="brightness-6" size={20} color="#fff" />
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>{(brightness * 100).toFixed(0)}%</Text>
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderFill, 
                  { width: `${brightness * 100}%` }
                ]} 
              />
              <View style={styles.sliderThumb} />
            </View>
          </View>
        </View>

        {/* Volume Control */}
        <View style={styles.sliderControl}>
          <MaterialIcons name="volume-up" size={20} color="#fff" />
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>{(volume * 100).toFixed(0)}%</Text>
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderFill, 
                  { width: `${volume * 100}%` }
                ]} 
              />
              <View style={styles.sliderThumb} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function VideosScreen() {
  const router = useRouter();
  // const { hideTabBar, showTabBar } = useTabBar(); // TabBarContext not available
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  
  // Engagement states
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [supported, setSupported] = useState<Record<string, boolean>>({});
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [shares, setShares] = useState<Record<string, number>>({});
  const [activeAnimations, setActiveAnimations] = useState<Record<string, boolean>>({});

  // Modals
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isDescriptionLong, setIsDescriptionLong] = useState(false);
  
  // Category states
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  
  // Landscape mode states
  const [isLandscape, setIsLandscape] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [bulletComments, setBulletComments] = useState<BulletComment[]>([]);
  
  // Load videos from Bunny CDN
  const loadVideos = async () => {
    setLoading(true);
    try {
      const result = await bunnyVideosService.getAllVideos();
      
      if (result.data && Array.isArray(result.data)) {
        console.log(`✅ Loaded ${result.data.length} videos from Bunny CDN`);
        
        setVideos(result.data);
        filterVideosByCategory('All', result.data);
        
        // Initialize likes count
        const initialLikes: Record<string, number> = {};
        result.data.forEach(video => {
          initialLikes[video.id] = video.likes_count || 0;
        });
        setLikes(initialLikes);
        
      } else {
        console.log('No videos data received from Bunny CDN');
        setVideos([]);
        setFilteredVideos([]);
      }
    } catch (error) {
      console.error('Error loading videos from Bunny CDN:', error);
      Alert.alert('Info', 'Using sample videos from Bunny CDN');
      setVideos([]);
      setFilteredVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  };

  useEffect(() => {
    loadVideos();
    
    // Listen for orientation changes
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setIsLandscape(width > height);
    };
    
    // Initial check
    updateOrientation();
    
    // Add listener
    const subscription = Dimensions.addEventListener('change', updateOrientation);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Filter videos by category
  const filterVideosByCategory = (category: string, videosList: Video[] = videos) => {
    setSelectedCategory(category);
    
    if (category === 'All') {
      setFilteredVideos(videosList);
    } else {
      const filtered = videosList.filter(video => 
        video.category?.toLowerCase() === category.toLowerCase()
      );
      setFilteredVideos(filtered);
    }
  };

  // Auto-pause when navigating away and manage tab bar
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      // hideTabBar(); // Hide tab bar when screen is focused - TabBarContext not available
      
      return () => {
        setIsScreenFocused(false);
        setPlayingVideoId(null);
        // showTabBar(); // Show tab bar when leaving screen - TabBarContext not available
      };
    }, []) // [hideTabBar, showTabBar] - TabBarContext not available
  );
  
  // Handle close button press - Go to home and show tab bar
  const handleClose = () => {
    // showTabBar(); // TabBarContext not available
    router.push('/');
  };

  const triggerStarAnimation = (videoId: string) => {
    setActiveAnimations(prev => ({
      ...prev,
      [videoId]: true
    }));
    
    setTimeout(() => {
      setActiveAnimations(prev => ({
        ...prev,
        [videoId]: false
      }));
    }, 2000);
  };

  const handleStar = async (videoId: string) => {
    if (!starred[videoId]) {
      setStarred(prev => ({ ...prev, [videoId]: true }));
      setLikes(prev => ({ ...prev, [videoId]: (prev[videoId] || 0) + 1 }));
      triggerStarAnimation(videoId);
    }
  };

  const handleVideoPress = (video: Video) => {
    setSelectedVideo(video);
    setPlayingVideoId(video.id);
    setShowFullDescription(false);
    
    if (video.description && video.description.length > 100) {
      setIsDescriptionLong(true);
    } else {
      setIsDescriptionLong(false);
    }
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
    setPlayingVideoId(null);
    setShowFullDescription(false);
    setIsLandscape(false);
    setIsLocked(false);
  };

  const handleComment = (video: Video) => {
    setSelectedVideo(video);
    setShowCommentsModal(true);
  };

  const handleAddComment = async () => {
    if (!selectedVideo || !newComment.trim()) return;

    setIsLoading(true);
    
    const mockComment = {
      id: `comment_${Date.now()}`,
      userId: 'current_user',
      comment_text: newComment.trim(),
      created_at: new Date().toISOString(),
      user_profiles: {
        username: 'You',
        avatar_url: 'https://i.pravatar.cc/150?img=0'
      }
    };

    const newCommentObj: Comment = {
      id: mockComment.id,
      userId: mockComment.userId,
      userName: mockComment.user_profiles?.username || 'You',
      userAvatar: mockComment.user_profiles?.avatar_url || 'https://i.pravatar.cc/150?img=0',
      text: mockComment.comment_text,
      timestamp: 'Just now',
    };

    setComments(prev => ({
      ...prev,
      [selectedVideo.id]: [newCommentObj, ...(prev[selectedVideo.id] || [])]
    }));

    setNewComment('');
    setIsLoading(false);
  };

  const handleSaveVideo = async () => {
    // Save video to user's profile Saved section
    try {
      // Get current saved videos from AsyncStorage
      const savedVideos = await AsyncStorage.getItem('savedVideos');
      const savedVideosArray = savedVideos ? JSON.parse(savedVideos) : [];
      
      // Check if video is already saved
      const isAlreadySaved = savedVideosArray.some((v: any) => v.id === selectedVideo?.id);
      
      if (!isAlreadySaved && selectedVideo) {
        // Add video to saved array
        savedVideosArray.push({
          id: selectedVideo.id,
          title: selectedVideo.title,
          thumbnail_url: selectedVideo.thumbnail_url,
          video_url: selectedVideo.video_url,
          duration: selectedVideo.duration,
          user_profiles: selectedVideo.user_profiles,
          saved_at: new Date().toISOString()
        });
        
        // Save to AsyncStorage
        await AsyncStorage.setItem('savedVideos', JSON.stringify(savedVideosArray));
        Alert.alert('Success', 'Video saved to your profile!');
      } else {
        Alert.alert('Info', 'Video already saved');
      }
    } catch (error) {
      console.error('Save video error:', error);
      Alert.alert('Error', 'Failed to save video');
    }
  };

  const handleReportVideo = async () => {
    // Report video functionality
    Alert.alert(
      'Report Video',
      'Why are you reporting this video?',
      [
        { text: 'Inappropriate Content', onPress: () => console.log('Reported: Inappropriate') },
        { text: 'Spam', onPress: () => console.log('Reported: Spam') },
        { text: 'Copyright', onPress: () => console.log('Reported: Copyright') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleShare = async (video: Video) => {
    try {
      const shareUrl = video.video_url;
      
      const result = await Share.share({
        message: `Check out this video: ${video.title}`,
        url: shareUrl,
        title: video.title
      });

      if (result.action === Share.sharedAction) {
        setShares(prev => ({ 
          ...prev, 
          [video.id]: (prev[video.id] || 0) + 1 
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share video');
    }
  };

  const toggleSupport = async (userId: string) => {
    setSupported(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleSpeedChange = (speed: number) => {
    setCurrentSpeed(speed);
  };

  const handleLockToggle = () => {
    setIsLocked(!isLocked);
  };

  const handleBrightnessChange = (value: number) => {
    // Implement brightness change logic
    console.log('Brightness changed to:', value);
  };

  const handleVolumeChange = (value: number) => {
    // Implement volume change logic
    console.log('Volume changed to:', value);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVideoItem = ({ item }: { item: Video }) => {
    return (
      <TouchableOpacity 
        style={styles.videoCard}
        onPress={() => handleVideoPress(item)}
        activeOpacity={0.9}
      >
        {/* Thumbnail with YouTube style 16:9 aspect ratio - full width */}
        <View style={styles.thumbnailContainer}>
          <Image 
            source={{ 
              uri: item.thumbnail_url || 'https://picsum.photos/400/225'
            }} 
            style={styles.thumbnail}
            contentFit="cover"
          />
          <View style={styles.playIconOverlay}>
            <Ionicons name="play-circle" size={60} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
          </View>
          {/* Category Badge */}
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          )}
        </View>
        
        {/* Video Title - below thumbnail */}
        <View style={styles.videoTitleContainer}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>

        {/* Video stats */}
        <View style={styles.videoStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="remove-red-eye" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.statText}>{formatCount(item.views_count || 0)} views</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="star" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.statText}>{formatCount(item.likes_count || 0)} likes</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="schedule" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.statText}>{formatDuration(item.duration)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <Image 
        source={{ uri: item.userAvatar }} 
        style={styles.commentAvatar} 
        contentFit="cover"
        onLoad={() => console.log('[VIDEO_SCREEN]: Comment avatar loaded successfully:', item.userAvatar)}
        onError={(error) => console.error('[VIDEO_SCREEN]: Comment avatar failed to load:', error)}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{item.userName}</Text>
          <Text style={styles.commentTime}>{item.timestamp}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  );

  // Render category button
  const renderCategoryButton = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item && styles.categoryButtonActive
      ]}
      onPress={() => filterVideosByCategory(item)}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === item && styles.categoryButtonTextActive
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeScreen edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading videos from Bunny CDN...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
      {/* Close Button - Top Left */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>
      
      {/* Header - Compact Search Bar Only */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => router.push('/search')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="search" size={20} color={theme.colors.text.secondary} />
          <Text style={styles.searchButtonText}>Search videos...</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Horizontal Scroll */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryButton}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Videos List - Full width YouTube style */}
      <FlatList
        data={filteredVideos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="video-library" size={80} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Videos Found</Text>
            <Text style={styles.emptyText}>
              {selectedCategory === 'All' 
                ? 'No videos available from Bunny CDN' 
                : `No videos found in ${selectedCategory} category`}
            </Text>
          </View>
        }
      />

      {/* Video Player Modal */}
      {selectedVideo && playingVideoId && (
        <VideoPlayerModal
          video={selectedVideo}
          isPlaying={isScreenFocused}
          onClose={handleCloseVideo}
          onStar={() => handleStar(selectedVideo.id)}
          onComment={() => handleComment(selectedVideo)}
          onShare={() => handleShare(selectedVideo)}
          onSupport={() => toggleSupport(selectedVideo.user_id)}
          onSaveVideo={() => handleSaveVideo()}
          onReportVideo={() => handleReportVideo()}
          starred={starred[selectedVideo.id] || false}
          supported={supported[selectedVideo.user_id] || false}
          likes={likes[selectedVideo.id] || 0}
          comments={comments[selectedVideo.id]?.length || 0}
          shares={shares[selectedVideo.id] || 0}
          activeAnimation={activeAnimations[selectedVideo.id] || false}
          showFullDescription={showFullDescription}
          isDescriptionLong={isDescriptionLong}
          onToggleDescription={() => setShowFullDescription(!showFullDescription)}
          isLandscape={isLandscape}
          onSpeedChange={handleSpeedChange}
          onLockToggle={handleLockToggle}
          onBrightnessChange={handleBrightnessChange}
          onVolumeChange={handleVolumeChange}
          currentSpeed={currentSpeed}
          isLocked={isLocked}
          bulletComments={bulletComments}
        />
      )}

      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCommentsModal(false)}
      >
        <SafeScreen>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => setShowCommentsModal(false)}
            >
              <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Comments</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedVideo && (
            <>
              <FlatList
                data={comments[selectedVideo.id] || []}
                keyExtractor={(item) => item.id}
                renderItem={renderComment}
                style={styles.commentsList}
                contentContainerStyle={styles.commentsListContent}
                ListEmptyComponent={
                  <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                }
              />

              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor={theme.colors.text.secondary}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!newComment.trim() || isLoading) && styles.sendButtonDisabled]}
                  onPress={handleAddComment}
                  disabled={!newComment.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.text.primary} />
                  ) : (
                    <MaterialIcons name="send" size={24} color={theme.colors.text.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeScreen>
      </Modal>
    </SafeScreen>
  );
}

// Video Player Modal Component
function VideoPlayerModal({ 
  video, 
  isPlaying,
  onClose,
  onStar,
  onComment,
  onShare,
  onSupport,
  onSaveVideo,
  onReportVideo,
  starred,
  supported,
  likes,
  comments,
  shares,
  activeAnimation,
  showFullDescription,
  isDescriptionLong,
  onToggleDescription,
  isLandscape,
  onSpeedChange,
  onLockToggle,
  onBrightnessChange,
  onVolumeChange,
  currentSpeed,
  isLocked,
  bulletComments
}: { 
  video: Video;
  isPlaying: boolean;
  onClose: () => void;
  onStar: () => void;
  onComment: () => void;
  onShare: () => void;
  onSupport: () => void;
  onSaveVideo?: () => void;
  onReportVideo?: () => void;
  starred: boolean;
  supported: boolean;
  likes: number;
  comments: number;
  shares: number;
  activeAnimation: boolean;
  showFullDescription: boolean;
  isDescriptionLong: boolean;
  onToggleDescription: () => void;
  isLandscape: boolean;
  onSpeedChange: (speed: number) => void;
  onLockToggle: () => void;
  onBrightnessChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
  currentSpeed: number;
  isLocked: boolean;
  bulletComments: BulletComment[];
}) {
  const player = useVideoPlayer(video.video_url, (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1;
    // Note: playbackRate will be set after player is ready
  });

  const [showFullDescModal, setShowFullDescModal] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const playerRef = useRef(player);

  // Update player ref when player changes
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // Auto-play video with proper cleanup (Android-safe)
  useEffect(() => {
    if (player && isPlaying) {
      try {
        player.play();
        // Set playback rate after player is ready
        if (player.playbackRate !== undefined) {
          player.playbackRate = currentSpeed;
        }
        setPlayerReady(true);
      } catch (error) {
        console.log('Player play error:', error);
      }
    }

    return () => {
      const currentPlayer = playerRef.current;
      if (currentPlayer) {
        try {
          if (typeof currentPlayer.pause === 'function') {
            currentPlayer.pause();
          }
        } catch (error) {
          console.log('Player cleanup handled');
        }
      }
    };
  }, [isPlaying, currentSpeed]);

  // Update playback rate when speed changes
  useEffect(() => {
    if (player && playerReady) {
      // Use playbackRate property if available, otherwise ignore
      if (player.playbackRate !== undefined) {
        player.playbackRate = currentSpeed;
      }
    }
  }, [currentSpeed]);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={[
        styles.modalContainer,
        isLandscape && styles.landscapeContainer
      ]}>
        <DotAnimation isActive={activeAnimation} />
        
        {/* Bullet Comments for Landscape Mode */}
        {isLandscape && bulletComments.map((comment) => (
          <BulletComment key={comment.id} comment={comment} />
        ))}
        
        {/* Horizontal Controls for Landscape Mode */}
        {isLandscape && (
          <HorizontalControls
            isLandscape={isLandscape}
            onShare={onShare}
            onComment={onComment}
            onSpeedChange={onSpeedChange}
            onLockToggle={onLockToggle}
            onBrightnessChange={onBrightnessChange}
            onVolumeChange={onVolumeChange}
            currentSpeed={currentSpeed}
            isLocked={isLocked}
          />
        )}

        {/* Full Description Modal */}
        <Modal
          visible={showFullDescModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFullDescModal(false)}
        >
          <View style={styles.fullDescModalOverlay}>
            <View style={styles.fullDescModalContent}>
              <View style={styles.fullDescModalHeader}>
                <Text style={styles.fullDescModalTitle}>Description</Text>
                <TouchableOpacity 
                  style={styles.fullDescCloseButton}
                  onPress={() => setShowFullDescModal(false)}
                >
                  <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.fullDescScrollView}>
                <Text style={styles.fullDescriptionText}>
                  {video.description}
                </Text>
                {video.category && (
                  <View style={styles.fullDescCategoryContainer}>
                    <Text style={styles.fullDescCategoryLabel}>Category:</Text>
                    <View style={styles.fullDescCategoryBadge}>
                      <Text style={styles.fullDescCategoryText}>{video.category}</Text>
                    </View>
                  </View>
                )}
                {video.tags && video.tags.length > 0 && (
                  <View style={styles.fullDescTagsContainer}>
                    <Text style={styles.fullDescTagsLabel}>Tags:</Text>
                    <View style={styles.fullDescTagsList}>
                      {video.tags.map((tag, index) => (
                        <View key={index} style={styles.fullDescTagBadge}>
                          <Text style={styles.fullDescTagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Close Button - Only show in portrait mode */}
        {!isLandscape && (
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Video Player - Adjust aspect ratio based on orientation */}
        <View style={[
          styles.videoPlayerContainer,
          isLandscape && styles.landscapeVideoPlayer
        ]}>
          {!playerReady && (
            <View style={styles.videoLoadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingVideoText}>Loading video...</Text>
            </View>
          )}
          <VideoView 
            player={player} 
            style={styles.videoPlayer}
            contentFit="contain"
            nativeControls={!isLandscape}
            allowsFullscreen={false}
            allowsPictureInPicture={true}
          />
        </View>

        {/* Video Details - Only show in portrait mode */}
        {!isLandscape && (
          <View style={styles.videoDetailsContainer}>
            <View style={styles.videoTitleSection}>
              <View style={styles.modalVideoHeaderRow}>
                <Text style={styles.modalVideoTitle}>{video.title}</Text>
              </View>
              <Text style={styles.modalVideoViews}>
                {formatCount(video.views_count || 0)} views
              </Text>
              {video.category && (
                <View style={styles.modalCategoryBadge}>
                  <Text style={styles.modalCategoryText}>{video.category}</Text>
                </View>
              )}
            </View>

            {/* Action Buttons - Correct Order: Star -> Comment -> Share -> Download -> Save -> Report */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={onStar} disabled={starred}>
                <MaterialIcons 
                  name={starred ? 'star' : 'star-border'} 
                  size={26} 
                  color={starred ? '#FF3B30' : theme.colors.text.primary}
                />
                <Text style={styles.actionButtonText}>{formatCount(likes)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={onComment}>
                <MaterialIcons name="chat-bubble-outline" size={26} color={theme.colors.text.primary} />
                <Text style={styles.actionButtonText}>{formatCount(comments)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                <MaterialIcons name="share" size={26} color={theme.colors.text.primary} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="download" size={26} color={theme.colors.text.primary} />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={onSaveVideo}>
                <MaterialIcons name="bookmark-border" size={26} color={theme.colors.text.primary} />
                <Text style={styles.actionButtonText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={onReportVideo}>
                <MaterialIcons name="flag" size={26} color={theme.colors.text.primary} />
                <Text style={styles.actionButtonText}>Report</Text>
              </TouchableOpacity>
            </View>

            {/* Channel Logo aur Name */}
            <View style={styles.channelSection}>
              <Image 
                source={{ uri: video.user_profiles?.avatar_url || 'https://via.placeholder.com/50' }} 
                style={styles.modalChannelAvatar}
                contentFit="cover"
              />
              <View style={styles.channelInfo}>
                <View style={styles.channelNameContainer}>
                  <Text style={styles.modalChannelName}>
                    {video.user_profiles?.username || 'Video Creator'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.supportButton, supported && styles.supportButtonActive]} 
                  onPress={onSupport}
                >
                  <Text style={styles.supportButtonText}>{supported ? 'Unsupport' : 'Support'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            {video.description && (
              <View style={styles.descriptionSection}>
                <Text 
                  style={styles.descriptionText}
                  numberOfLines={showFullDescription ? undefined : 2}
                >
                  {video.description}
                </Text>
                
                {isDescriptionLong && !showFullDescription && (
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => setShowFullDescModal(true)}
                  >
                    <Text style={styles.moreButtonText}>More</Text>
                  </TouchableOpacity>
                )}
                
                {isDescriptionLong && showFullDescription && (
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={onToggleDescription}
                  >
                    <Text style={styles.moreButtonText}>Show less</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  // Close Button
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  
  // Header with Search Only - Reduced gap
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    paddingTop: 45, // Reduced from 50
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  searchButtonText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  
  // Categories Styles
  categoriesContainer: {
    backgroundColor: theme.colors.background.primary,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  categoriesList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  categoryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: theme.typography.fontWeight.semibold,
  },
  
  // Video card styles
  videoCard: {
    marginVertical: theme.spacing.md,
    width: '100%',
  },
  videoTitleContainer: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: 4,
  },
  videoTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    flex: 1,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  
  // Video stats
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    paddingHorizontal: 4,
    gap: theme.spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  
  // List styles
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    maxWidth: 300,
  },
  
  // Thumbnail styles
  thumbnailContainer: {
    width: '100%',
    height: width * (9 / 16), // 16:9 YouTube style
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  landscapeContainer: {
    backgroundColor: '#000',
  },
  
  // Dot animation
  dotAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  tinyRedDot: {
    position: 'absolute',
    backgroundColor: '#FF3B30',
    top: '50%',
    left: '50%',
    zIndex: 1000,
  },
  
  // Close button
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Video player
  videoPlayerContainer: {
    width: '100%',
    height: width * (3 / 4), // 4:3 ratio (width * 0.75)
    backgroundColor: '#000',
    marginTop: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeVideoPlayer: {
    height: '100%',
    marginTop: 0,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  
  // Video loading
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 5,
  },
  loadingVideoText: {
    color: '#fff',
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
  },
  
  // Video details
  videoDetailsContainer: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  videoTitleSection: {
    marginBottom: theme.spacing.md,
  },
  modalVideoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  modalVideoTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    flex: 1,
  },
  modalVideoViews: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  modalCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary.light,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  modalCategoryText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary.dark,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  
  // Action buttons - Match Reels section styling with more spacing
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl, // Increased padding
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
    gap: theme.spacing.xl, // Increased gap significantly
  },
  actionButton: {
    alignItems: 'center',
    gap: 6, // Increased gap between icon and text
    minWidth: 60, // Increased minimum width for better touch targets
    paddingHorizontal: theme.spacing.sm, // Added horizontal padding
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  
  // Channel section
  channelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  modalChannelAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  channelInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  modalChannelName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  supportButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.borderRadius.full,
  },
  supportButtonActive: {
    backgroundColor: '#34C759',
  },
  supportButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#fff',
  },
  
  // Description section
  descriptionSection: {
    paddingVertical: theme.spacing.md,
  },
  descriptionText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    lineHeight: 22,
  },
  moreButton: {
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  moreButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  
  // Full Description Modal Styles
  fullDescModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  fullDescModalContent: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  fullDescModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  fullDescModalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  fullDescCloseButton: {
    padding: theme.spacing.xs,
  },
  fullDescScrollView: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  fullDescriptionText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
  },
  fullDescCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  fullDescCategoryLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  fullDescCategoryBadge: {
    backgroundColor: theme.colors.primary.light,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  fullDescCategoryText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary.dark,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  fullDescTagsContainer: {
    marginBottom: theme.spacing.md,
  },
  fullDescTagsLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  fullDescTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  fullDescTagBadge: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  fullDescTagText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  
  // Comments modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  commentUserName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  commentTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  commentText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: 18,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
    backgroundColor: theme.colors.background.primary,
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: theme.spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  noCommentsText: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xl,
    fontSize: theme.typography.fontSize.md,
  },
  
  // Horizontal Controls Styles
  horizontalControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  leftControls: {
    justifyContent: 'flex-start',
    gap: 20,
  },
  rightControls: {
    justifyContent: 'flex-end',
    gap: 20,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
    minWidth: 60,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  sliderControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
    minWidth: 120,
  },
  sliderContainer: {
    flex: 1,
    marginLeft: 10,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 4,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    top: -4,
    left: '50%',
  },
  sliderValue: {
    color: '#fff',
    fontSize: 12,
  },
  
  // Bullet Comments Styles
  bulletComment: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 999,
  },
  bulletCommentText: {
    fontSize: 14,
    fontWeight: '600',
  },
});