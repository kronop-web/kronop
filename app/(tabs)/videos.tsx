import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Video from 'expo-video';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { useSWRContent } from '../../hooks/swr';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  username: string;
}

// ==================== DOT ANIMATION ====================
const DotAnimation = ({ isActive }: { isActive: boolean }) => {
  const dotsAnim = useRef(new Animated.Value(0)).current;
  const [animationActive, setAnimationActive] = useState(false);

  const startAnimation = React.useCallback(() => {
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
  }, [dotsAnim]);

  useEffect(() => {
    if (isActive) {
      startAnimation();
    }
  }, [isActive, startAnimation]);

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

// Bullet Comment Component (Chinese Style)
const BulletComment = ({ comment }: { comment: BulletComment }) => {
  const translateX = useRef(new Animated.Value(width)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -300,
        duration: 8000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(7500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
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
      <View style={styles.bulletCommentContent}>
        <Text style={styles.bulletCommentUsername}>{comment.username}</Text>
        <Text style={[styles.bulletCommentText, { color: comment.color }]}>
          {comment.text}
        </Text>
      </View>
    </Animated.View>
  );
};

// Horizontal Controls Component (Chinese Style)
const HorizontalControls = ({
  isLandscape,
  onShare,
  onStar,
  onComment,
  onSpeedChange,
  onLockToggle,
  onBrightnessChange,
  onVolumeChange,
  currentSpeed,
  isLocked,
  player,
  currentTime,
  duration,
  onSeek,
  showControls,
  onToggleControls,
  starred,
  likes
}: {
  isLandscape: boolean;
  onShare: () => void;
  onStar: () => void;
  onComment: () => void;
  onSpeedChange: (speed: number) => void;
  onLockToggle: () => void;
  onBrightnessChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
  currentSpeed: number;
  isLocked: boolean;
  player: any;
  currentTime: number;
  duration: number;
  onSeek: (position: number) => void;
  showControls: boolean;
  onToggleControls: () => void;
  starred: boolean;
  likes: number;
}) => {
  const [brightness, setBrightness] = useState(0.5);
  const [volume, setVolume] = useState(0.7);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);

  if (!isLandscape) return null;

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <>
      {/* Touchable area to show/hide controls */}
      <TouchableWithoutFeedback onPress={onToggleControls}>
        <View style={styles.touchableOverlay} />
      </TouchableWithoutFeedback>

      {/* Main Controls */}
      {showControls && (
        <View style={styles.horizontalControlsContainer}>
          {/* Left Side Controls */}
          <View style={styles.leftControls}>
            <TouchableOpacity style={styles.controlButton} onPress={onStar}>
              <MaterialIcons 
                name={starred ? 'star' : 'star-border'} 
                size={22} 
                color={starred ? '#FFD700' : '#fff'}
              />
              <Text style={styles.controlButtonText}>{formatCount(likes)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={onShare}>
              <Feather name="share-2" size={22} color="#fff" />
              <Text style={styles.controlButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={onComment}>
              <Feather name="message-circle" size={22} color="#fff" />
              <Text style={styles.controlButtonText}>Comment</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setShowSpeedOptions(!showSpeedOptions)}
            >
              <Feather name="fast-forward" size={22} color="#fff" />
              <Text style={styles.controlButtonText}>{currentSpeed}x</Text>
            </TouchableOpacity>

            {/* Speed Options Modal */}
            {showSpeedOptions && (
              <View style={styles.speedOptionsModal}>
                {speedOptions.map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedOption,
                      currentSpeed === speed && styles.speedOptionActive
                    ]}
                    onPress={() => {
                      onSpeedChange(speed);
                      setShowSpeedOptions(false);
                    }}
                  >
                    <Text style={[
                      styles.speedOptionText,
                      currentSpeed === speed && styles.speedOptionTextActive
                    ]}>
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Right Side Controls */}
          <View style={styles.rightControls}>
            <TouchableOpacity style={styles.controlButton} onPress={onLockToggle}>
              <Feather 
                name={isLocked ? "lock" : "unlock"} 
                size={22} 
                color="#fff" 
              />
              <Text style={styles.controlButtonText}>{isLocked ? "Lock" : "Unlock"}</Text>
            </TouchableOpacity>

            {/* Brightness Control */}
            <View style={styles.sliderControl}>
              <Feather name="sun" size={18} color="#fff" />
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>{(brightness * 100).toFixed(0)}%</Text>
                <TouchableOpacity 
                  style={styles.sliderTrack}
                  onPressIn={(e) => {
                    const x = e.nativeEvent.locationX;
                    const percentage = Math.min(Math.max(x / 120, 0), 1);
                    setBrightness(percentage);
                    onBrightnessChange(percentage);
                  }}
                >
                  <View 
                    style={[
                      styles.sliderFill, 
                      { width: `${brightness * 100}%` }
                    ]} 
                  />
                  <View style={[styles.sliderThumb, { left: `${brightness * 100}%` }]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Volume Control */}
            <View style={styles.sliderControl}>
              <Feather name="volume-2" size={18} color="#fff" />
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>{(volume * 100).toFixed(0)}%</Text>
                <TouchableOpacity 
                  style={styles.sliderTrack}
                  onPressIn={(e) => {
                    const x = e.nativeEvent.locationX;
                    const percentage = Math.min(Math.max(x / 120, 0), 1);
                    setVolume(percentage);
                    onVolumeChange(percentage);
                  }}
                >
                  <View 
                    style={[
                      styles.sliderFill, 
                      { width: `${volume * 100}%` }
                    ]} 
                  />
                  <View style={[styles.sliderThumb, { left: `${volume * 100}%` }]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Bottom Progress Bar */}
          <View style={styles.bottomControls}>
            <View style={styles.progressBarContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <TouchableOpacity 
                style={styles.progressBar}
                onPressIn={(e) => {
                  const x = e.nativeEvent.locationX;
                  const percentage = Math.min(Math.max(x / (width - 100), 0), 1);
                  const seekPosition = percentage * duration;
                  onSeek(seekPosition);
                }}
              >
                <View style={styles.progressBarTrack}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${(currentTime / duration) * 100}%` }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.progressBarThumb, 
                      { left: `${(currentTime / duration) * 100}%` }
                    ]} 
                  />
                </View>
              </TouchableOpacity>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Playback Controls */}
            <View style={styles.playbackControls}>
              <TouchableOpacity style={styles.playbackButton}>
                <Feather name="skip-back" size={18} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.playButton}
                onPress={() => {
                  try {
                    // @ts-ignore
                    if (player && typeof player.play === 'function') {
                      // @ts-ignore
                      player.play().catch((err: any) => {
                        if (err?.message?.includes('already released')) {
                        } else {
                          console.warn('Play error:', err);
                        }
                      });
                    }
                  } catch (error: any) {
                    if (error?.message?.includes('already released')) {
                    }
                  }
                }}
              >
                <Feather name="play" size={20} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.playbackButton}>
                <Feather name="skip-forward" size={18} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.playbackButton}>
                <Feather name="repeat" size={18} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.playbackButton}>
                <Feather name="tv" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Lock Screen Message */}
      {isLocked && (
        <TouchableWithoutFeedback onPress={onLockToggle}>
          <View style={styles.lockMessage}>
            <Feather name="lock" size={40} color="#fff" />
            <Text style={styles.lockMessageText}>Screen Locked</Text>
            <Text style={styles.lockMessageSubtext}>Tap to unlock</Text>
          </View>
        </TouchableWithoutFeedback>
      )}
    </>
  );
};

// Video Details Component for Landscape Mode
const VideoDetailsLandscape = ({ video }: { video: Video }) => {
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <View style={styles.landscapeVideoDetails}>
      <Text style={styles.landscapeVideoTitle}>{video.title}</Text>
      
      <View style={styles.landscapeVideoStats}>
        <Text style={styles.landscapeVideoViews}>
          {formatCount(video.views_count)} views • {new Date(video.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.landscapeChannelInfo}>
        <Image 
          source={{ uri: video.user_profiles?.avatar_url || 'https://via.placeholder.com/50' }} 
          style={styles.landscapeChannelAvatar}
          contentFit="cover"
        />
        <View style={styles.landscapeChannelDetails}>
          <Text style={styles.landscapeChannelName}>
            {video.user_profiles?.username || 'Video Creator'}
          </Text>
          <Text style={styles.landscapeChannelFollowers}>1.5M followers</Text>
        </View>
        <TouchableOpacity style={styles.landscapeSubscribeButton}>
          <Text style={styles.landscapeSubscribeText}>Subscribe</Text>
        </TouchableOpacity>
      </View>

      {video.description && (
        <View style={styles.landscapeDescription}>
          <Text style={styles.landscapeDescriptionText} numberOfLines={3}>
            {video.description}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function VideosScreen() {
  const router = useRouter();
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
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { data: swrVideos, loading: swrLoading, refresh } = useSWRContent('Video', 1, 50);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(swrLoading);
    const result = Array.isArray(swrVideos) ? swrVideos : [];
    setVideos(result);
    filterVideosByCategory('All', result);
    const initialLikes: Record<string, number> = {};
    result.forEach(video => {
      initialLikes[video.id] = video.likes_count || 0;
    });
    setLikes(initialLikes);
    
    // Listen for orientation changes
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setIsLandscape(width > height);
    };
    
    updateOrientation();
    
    const subscription = Dimensions.addEventListener('change', updateOrientation);
    
    return () => {
      subscription?.remove();
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [swrVideos, swrLoading]);

  // Generate sample bullet comments
  const generateBulletComments = () => {
    const comments = [
      { text: "你这打脸也来得太快了些吧！李雾", username: "用户A", color: "#FF6B6B" },
      { text: "偶像剧超级好看！", username: "追剧达人", color: "#4ECDC4" },
      { text: "小甜剧推荐不错👍", username: "剧迷", color: "#FFD166" },
      { text: "现偶天花板！", username: "影视专家", color: "#06D6A0" },
      { text: "李雾演技太棒了！", username: "粉丝", color: "#118AB2" },
      { text: "剧情发展太快了", username: "观众", color: "#EF476F" },
      { text: "画面质感一流", username: "摄影爱好者", color: "#FFD166" },
      { text: "BGM超好听", username: "音乐迷", color: "#118AB2" },
      { text: "追更中...", username: "等待更新", color: "#06D6A0" },
      { text: "期待下一集", username: "剧透预警", color: "#FF6B6B" }
    ];
    
    const bulletComments: BulletComment[] = comments.map((comment, index) => ({
      id: `bullet_${Date.now()}_${index}`,
      text: comment.text,
      username: comment.username,
      color: comment.color,
      position: 100 + (index * 40)
    }));
    
    setBulletComments(bulletComments);
    
    // Add new bullet comments periodically
    const interval = setInterval(() => {
      const newComment = {
        id: `bullet_${Date.now()}_${bulletComments.length}`,
        text: "弹幕测试" + Math.floor(Math.random() * 100),
        username: `用户${Math.floor(Math.random() * 1000)}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        position: 100 + (Math.random() * (SCREEN_HEIGHT - 200))
      };
      
      setBulletComments(prev => [...prev.slice(-15), newComment]);
    }, 3000);
    
    return () => clearInterval(interval);
  };

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

  // Auto-pause when navigating away
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      
      return () => {
        setIsScreenFocused(false);
        setPlayingVideoId(null);
      };
    }, [])
  );

  const triggerStarAnimation = (videoId: string) => {
    setActiveAnimations(prev => ({
      ...prev,
      [videoId]: true
    }));
    
    setTimeout(() => {
      setActiveAnimations((prev: Record<string, boolean>) => ({
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
    } else {
      setStarred(prev => ({ ...prev, [videoId]: false }));
      setLikes(prev => ({ ...prev, [videoId]: Math.max((prev[videoId] || 0) - 1, 0) }));
    }
  };

  const handleVideoPress = (video: Video) => {
    setSelectedVideo(video);
    setPlayingVideoId(video.id);
    setShowFullDescription(false);
    generateBulletComments();
    setShowControls(true);
    
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
    setBulletComments([]);
    setShowControls(true);
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
  };

  const handleVolumeChange = (value: number) => {
  };

  const handleToggleControls = () => {
    if (isLocked) {
      setIsLocked(false);
      return;
    }
    
    setShowControls(!showControls);
    
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    
    if (showControls) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
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
      <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} contentFit="cover" />
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
        
        {/* Close Button - Top Right (Smaller Size) */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.7}
        >
          <MaterialIcons name="close" size={20} color={theme.colors.text.primary} />
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
          onClose={handleCloseVideo}
          isPlaying={playingVideoId === selectedVideo.id}
          onStar={() => {}}
          onComment={() => {}}
          onShare={() => {}}
          onSupport={() => {}}
          starred={starred[selectedVideo.id] || false}
          supported={false}
          likes={likes[selectedVideo.id] || 0}
          comments={0}
          shares={0}
          activeAnimation={false}
          showFullDescription={false}
          isDescriptionLong={false}
          onToggleDescription={() => {}}
          isLandscape={isLandscape}
          isLocked={isLocked}
          onLockToggle={() => setIsLocked(!isLocked)}
          currentSpeed={currentSpeed}
          onSpeedChange={setCurrentSpeed}
          onBrightnessChange={handleBrightnessChange}
          onVolumeChange={handleVolumeChange}
          onToggleControls={handleToggleControls}
          bulletComments={bulletComments}
          showControls={showControls}
        />
      )}

      {/* VIDEOS EARNINGS BUTTON */}
      <TouchableOpacity 
        style={styles.earningsButton}
        onPress={() => {
          // Open user's video earnings list
          // TODO: Navigate to earnings list modal
        }}
      >
        <MaterialIcons name="trending-up" size={20} color="#fff" />
        <Text style={styles.earningsButtonText}>My Video Earnings</Text>
      </TouchableOpacity>

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
  bulletComments,
  showControls,
  onToggleControls
}: { 
  video: Video;
  isPlaying: boolean;
  onClose: () => void;
  onStar: () => void;
  onComment: () => void;
  onShare: () => void;
  onSupport: () => void;
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
  showControls: boolean;
  onToggleControls: () => void;
}) {
  const [showFullDescModal, setShowFullDescModal] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration);

  const player = useVideoPlayer(video.video_url, (player: any) => {
    try {
      player.loop = false;
      player.muted = false;
      player.volume = 1;
      // @ts-ignore
      if (player?.rate !== undefined) {
        // @ts-ignore
        player.rate = currentSpeed;
      }
      setPlayerReady(true);
      setLoadingError(null);
    } catch (error) {
      console.error('❌ Player initialization failed:', error);
      setLoadingError('Failed to initialize video player');
      setPlayerReady(false);
    }
  });

  // Update current time with proper error handling
  useEffect(() => {
    if (!player || !playerReady) return;

    const interval = setInterval(() => {
      try {
        if (player?.currentTime !== undefined) {
          setCurrentTime(player.currentTime);
        }
        if (player?.duration !== undefined && player.duration > 0) {
          setDuration(player.duration);
        }
      } catch (error) {
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player, playerReady]);

  // Update player ref when player changes
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // Auto-play video with proper cleanup and error handling
  useEffect(() => {
    if (player && isPlaying && playerReady) {
      const playVideo = async () => {
        try {
          // @ts-ignore
          if (player && typeof player.play === 'function') {
            // @ts-ignore
            await player.play();
          }
        } catch (error: any) {
          if (error?.message?.includes('already released')) {
          } else {
            console.error('❌ Player play error:', error);
            setLoadingError('Failed to play video');
          }
        }
      };
      playVideo();
    }

    return () => {
      const currentPlayer = playerRef.current;
      if (currentPlayer) {
        try {
          if (typeof currentPlayer.pause === 'function') {
            currentPlayer.pause();
          }
        } catch (error: any) {
          if (error?.message?.includes('already released')) {
          } else {
          }
        }
      }
    };
  }, [isPlaying, currentSpeed, playerReady, video.title]);

  // Update playback rate when speed changes
  useEffect(() => {
    if (player && playerReady) {
      try {
        // @ts-ignore
        player.rate = currentSpeed;
      } catch (error) {
      }
    }
  }, [currentSpeed, playerReady]);

  const handleSeek = (position: number) => {
    // no-op for compile safety
  };

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
            onStar={onStar}
            onComment={onComment}
            onSpeedChange={onSpeedChange}
            onLockToggle={onLockToggle}
            onBrightnessChange={onBrightnessChange}
            onVolumeChange={onVolumeChange}
            currentSpeed={currentSpeed}
            isLocked={isLocked}
            player={player}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            showControls={showControls}
            onToggleControls={onToggleControls}
            starred={starred}
            likes={likes}
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

        {/* Close Button - Only show in portrait mode or when controls are visible */}
        {(!isLandscape || showControls) && (
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Video Player - Adjust aspect ratio based on orientation */}
        <View style={[
          styles.videoPlayerContainer,
          isLandscape && styles.landscapeVideoPlayer
        ]}>
          {!playerReady && !loadingError && (
            <View style={styles.videoLoadingOverlay}>
              {/* Show thumbnail while loading */}
              <Image 
                source={{ 
                  uri: video.thumbnail_url || 'https://picsum.photos/800/450'
                }} 
                style={styles.videoThumbnail}
                contentFit="cover"
                blurRadius={2}
              />
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingVideoText}>Loading video...</Text>
              </View>
            </View>
          )}
          
          {loadingError && (
            <View style={styles.videoErrorOverlay}>
              <Image 
                source={{ 
                  uri: video.thumbnail_url || 'https://picsum.photos/800/450'
                }} 
                style={styles.videoThumbnail}
                contentFit="cover"
                blurRadius={3}
              />
              <View style={styles.errorOverlay}>
                <MaterialIcons name="error" size={48} color="#ff4444" />
                <Text style={styles.errorVideoText}>{loadingError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setLoadingError(null);
                    setPlayerReady(false);
                    // Force re-initialization by triggering a re-render
                    setTimeout(() => {
                      if (player) {
                        try {
                          // @ts-ignore
                          if (typeof player.play === 'function') {
                            // @ts-ignore
                            player.play().catch((err: any) => {
                              if (err?.message?.includes('already released')) {
                              } else {
                              }
                            });
                          }
                        } catch (error: any) {
                          if (error?.message?.includes('already released')) {
                          } else {
                          }
                        }
                      }
                    }, 1000);
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <VideoView 
            player={player} 
            style={[styles.videoPlayer, !playerReady && { display: 'none' }]}
            contentFit="cover"
            nativeControls={!isLandscape}
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

            {/* Action Buttons - POSITION SWAPPED: Now Star first, then Share */}
            <View style={styles.actionButtons}>
              {/* Star Button - Now First Position */}
              <TouchableOpacity style={styles.actionButton} onPress={onStar}>
                <MaterialIcons 
                  name={starred ? 'star' : 'star-border'} 
                  size={24} 
                  color={starred ? '#FFD700' : theme.colors.text.primary}
                />
                <Text style={styles.actionButtonText}>{formatCount(likes)}</Text>
              </TouchableOpacity>

              {/* Share Button - Now Second Position */}
              <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                <Feather name="share-2" size={24} color={theme.colors.text.primary} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>

              {/* Comment Button */}
              <TouchableOpacity style={styles.actionButton} onPress={onComment}>
                <Feather name="message-circle" size={24} color={theme.colors.text.primary} />
                <Text style={styles.actionButtonText}>{formatCount(comments)}</Text>
              </TouchableOpacity>

              {/* Download Button */}
              <TouchableOpacity style={styles.actionButton}>
                <Feather name="download" size={24} color={theme.colors.text.primary} />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
            </View>

            {/* Channel Info */}
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

        {/* Video Details for Landscape Mode */}
        {isLandscape && showControls && <VideoDetailsLandscape video={video} />}
      </View>
    </Modal>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  // Header with Search and Close Button
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingTop: 50,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    marginRight: theme.spacing.sm,
  },
  searchButtonText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  
  // Close Button (Smaller Size)
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
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
    fontSize: 13,
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
  
  // Touchable Overlay for controls
  touchableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  
  // Close button in modal
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  
  // Horizontal Controls Styles
  horizontalControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  leftControls: {
    position: 'absolute',
    left: 20,
    top: 80,
    gap: 12,
    alignItems: 'flex-start',
  },
  rightControls: {
    position: 'absolute',
    right: 20,
    top: 80,
    gap: 12,
    alignItems: 'flex-end',
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Speed Options
  speedOptionsModal: {
    position: 'absolute',
    left: 0,
    top: 60,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 8,
    padding: 8,
    minWidth: 70,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 10,
  },
  speedOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 2,
  },
  speedOptionActive: {
    backgroundColor: '#FF3B30',
  },
  speedOptionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  speedOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Slider Controls
  sliderControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderContainer: {
    flex: 1,
    marginLeft: 8,
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
    backgroundColor: '#FF3B30',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: '#fff',
    borderRadius: 7,
    top: -5,
    marginLeft: -7,
  },
  sliderValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Bottom Controls
  bottomControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 10,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  progressBarFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#FF3B30',
    borderRadius: 2,
  },
  progressBarThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: '#fff',
    borderRadius: 7,
    top: -5,
    marginLeft: -7,
  },
  timeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    minWidth: 35,
    textAlign: 'center',
  },
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  playbackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,59,48,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Lock Screen Message
  lockMessage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 100,
  },
  lockMessageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  lockMessageSubtext: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 5,
  },
  
  // Bullet Comments Styles (Chinese Style)
  bulletComment: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bulletCommentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletCommentUsername: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 6,
  },
  bulletCommentText: {
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // Video Details for Landscape Mode
  landscapeVideoDetails: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 12,
    zIndex: 10,
  },
  landscapeVideoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  landscapeVideoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  landscapeVideoViews: {
    color: '#ccc',
    fontSize: 11,
  },
  landscapeChannelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  landscapeChannelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  landscapeChannelDetails: {
    flex: 1,
  },
  landscapeChannelName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  landscapeChannelFollowers: {
    color: '#aaa',
    fontSize: 11,
  },
  landscapeSubscribeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  landscapeSubscribeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  landscapeDescription: {
    marginTop: 6,
  },
  landscapeDescriptionText: {
    color: '#ccc',
    fontSize: 11,
    lineHeight: 15,
  },
  
  // Video details (Portrait Mode)
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
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  modalCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: theme.spacing.xs,
  },
  modalCategoryText: {
    fontSize: 11,
    color: theme.colors.primary.dark,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  
  // Action buttons (Portrait Mode) - Smaller size
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  
  // Channel section (Portrait Mode)
  channelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  modalChannelAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
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
    fontSize: 15,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  supportButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.borderRadius.full,
  },
  supportButtonActive: {
    backgroundColor: '#34C759',
  },
  supportButtonText: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#fff',
  },
  
  // Description section
  descriptionSection: {
    paddingVertical: theme.spacing.md,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  moreButton: {
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  moreButtonText: {
    fontSize: 13,
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
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  fullDescCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  fullDescCategoryLabel: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  fullDescCategoryBadge: {
    backgroundColor: theme.colors.primary.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fullDescCategoryText: {
    fontSize: 12,
    color: theme.colors.primary.dark,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  fullDescTagsContainer: {
    marginBottom: theme.spacing.md,
  },
  fullDescTagsLabel: {
    fontSize: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  fullDescTagText: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  commentTime: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  commentText: {
    fontSize: 13,
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
    fontSize: 13,
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
  
  // Video loading and error overlay styles
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  videoErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 10,
  },
  videoThumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    borderRadius: 10,
  },
  errorOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
  },
  loadingVideoText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  errorVideoText: {
    color: '#ff4444',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  earningsButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  earningsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
