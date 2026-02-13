
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  FlatList,
  Animated,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { useSWRContent } from '../../hooks/swr';
import { videoFeedService } from '../../services/videoFeedService';
import { videoPreloaderService } from '../../services/videoPreloader';
import { hlsOptimizerService } from '../../services/hlsOptimizer';
import { memoryManagerService } from '../../services/memoryManager';
import { uniqueViewTracker } from '../../services/uniqueViewTracker';
import { slidingWindowManager } from '../../services/slidingWindowManager';
import { videoChunkingService } from '../../services/videoChunkingService';
import { CommentSheet } from '../../components/feature/CommentSheet';
import StatusBarOverlay from '../../components/common/StatusBarOverlay';
import AudioController from '../../services/AudioController';
import RightButtons from '../../components/feature/RightButtons';
import RunningTitle from '../../components/feature/RunningTitle';
import SupportSection from '../../components/feature/SupportSection';
import ChannelInfo from '../../components/feature/ChannelInfo';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const REEL_HEIGHT = SCREEN_HEIGHT;

interface Reel {
  id: string;
  user_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  views_count: number;
  likes_count: number;
  tags: string[];
  is_public: boolean;
  created_at: string;
  user_profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface VideoMetadata {
  duration: number;
  isLoaded: boolean;
  sourceType?: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

interface Channel {
  id: string;
  name: string;
  avatar: string;
  followers: number;
  bio: string;
  isFollowing: boolean;
}

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

// SIMPLE MARQUEE TEXT COMPONENT THAT WORKS
const MarqueeText = ({ text }: { text: string }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const textRef = useRef<Text>(null);
  const containerRef = useRef<View>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (textWidth > containerWidth && containerWidth > 0) {
      // Start marquee animation
      const scrollDistance = textWidth - containerWidth + 50;
      const duration = scrollDistance * 20; // Adjust speed
      
      // Reset position
      scrollX.setValue(0);
      
      // Create the animation sequence
      Animated.loop(
        Animated.sequence([
          // Initial delay
          Animated.delay(500),
          // Scroll to left
          Animated.timing(scrollX, {
            toValue: -scrollDistance,
            duration: duration,
            useNativeDriver: true,
          }),
          // Reset to start
          Animated.timing(scrollX, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          // Pause before repeating
          Animated.delay(1000),
        ])
      ).start();
    }
  }, [textWidth, containerWidth]);

  return (
    <View 
      ref={containerRef}
      style={styles.marqueeContainer}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      <Animated.Text
        ref={textRef}
        style={[
          styles.description,
          {
            transform: [{ translateX: scrollX }],
            width: textWidth > containerWidth ? textWidth : '100%',
          }
        ]}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          setTextWidth(width);
        }}
        numberOfLines={1}
      >
        {text}
      </Animated.Text>
    </View>
  );
};

// Reel Item Component with Video Player
function ReelItem({ 
  item, 
  index, 
  isActive,
  onChannelPress,
  onVideoComplete,
  onVideoWatched,
  onLikeChange,
  onCommentPress,
  onShareChange,
  onSaveChange,
  onSupportChange,
  onReportPress,
  likes,
  comments,
  shares,
  starred,
  saved,
  supported
}: any) {
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata>({
    duration: 0,
    isLoaded: false,
    sourceType: ''
  });
  const lastTap = useRef(0);

  useEffect(() => {
    if (isActive) {
      setIsPaused(false);
    }
  }, [isActive]);

  // Data-Centric: Determine source type based on URL
  const getSourceType = (url: string) => {
    if (url.includes('.m3u8')) {
      return 'm3u8'; // HLS stream type
    }
    return 'mp4'; // Default to mp4
  };

  // Data-Centric: Get optimized video source
  const getVideoSource = () => {
    let videoUrl = item.video_url;
    
    // Optimize for Bunny CDN
    videoUrl = hlsOptimizerService.optimizeForBunnyCDN(videoUrl);
    
    // Convert to HLS if needed
    videoUrl = hlsOptimizerService.convertToOptimizedHLS(videoUrl);
    
    return videoUrl;
  };

  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef(false);

  const safePlayerPlay = useCallback(async () => {
    try {
      if (playerRef.current && isPlayerReadyRef.current) {
        await playerRef.current.play();
      }
    } catch (error: any) {
      console.warn('Error playing video:', error);
    }
  }, []);

  const safePlayerPause = useCallback(() => {
    try {
      if (playerRef.current && isPlayerReadyRef.current) {
        playerRef.current.pause();
      }
    } catch (error: any) {
      console.warn('Error pausing video:', error);
    }
  }, []);

  const cleanupPlayer = useCallback(() => {
    try {
      isPlayerReadyRef.current = false;
      if (playerRef.current) {
        try {
          playerRef.current.pause();
        } catch {}
        playerRef.current = null;
      }
    } catch (error) {
      console.warn('Error cleaning up player:', error);
    }
  }, []);

  const videoSource = getVideoSource();
  const sourceType = getSourceType(videoSource);
  const bufferConfig = hlsOptimizerService.getOptimalBufferConfig();

  const player = useVideoPlayer({
    uri: videoSource,
    headers: {
      'User-Agent': 'KronopApp',
      'Referer': 'https://kronop.app',
      'Origin': 'https://kronop.app'
    }
  }, (playerInstance) => {
    // Store reference
    playerRef.current = playerInstance;
    
    // Data-Centric: Log metadata on load
    console.log({
      duration: playerInstance.duration,
      sourceType: sourceType,
      videoUrl: videoSource
    });
    
    // Instagram-like instant playback configuration with audio managed by audio controller
    playerInstance.loop = false;
    AudioController.applyToPlayer(playerInstance, isActive);
    
    // Mark player as ready and video ready for seamless transition
    isPlayerReadyRef.current = true;
    setIsVideoReady(true);
    
    // Data-Centric: Update metadata state
    setVideoMetadata({
      duration: playerInstance.duration || 0,
      isLoaded: true,
      sourceType: sourceType
    });

    // Mark video as watched when loaded
    if (isActive) {
      onVideoWatched(item.id);
    }

    // Auto-play for active videos with safety check
    if (isActive) {
      setTimeout(() => {
        safePlayerPlay();
      }, 100); // Small delay for smooth transition
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, []);

  // Watch for video completion using interval
  useEffect(() => {
    if (!isActive || !videoMetadata.isLoaded || !isPlayerReadyRef.current) return;

    const checkCompletion = setInterval(() => {
      try {
        if (playerRef.current && playerRef.current.currentTime > 0 && playerRef.current.duration > 0) {
          const progress = (playerRef.current.currentTime / playerRef.current.duration) * 100;
          
          // Consider video completed when 95% watched
          if (progress >= 95) {
            onVideoComplete();
            onVideoWatched(item.id, true); // Mark as completed
            clearInterval(checkCompletion);
          }
        }
      } catch (error: any) {
        if (error?.message?.includes('already released')) {
          clearInterval(checkCompletion);
        }
      }
    }, 500); // Check every 500ms

    return () => clearInterval(checkCompletion);
  }, [isActive, videoMetadata.isLoaded, item.id, onVideoComplete, onVideoWatched]);

  useEffect(() => {
    // Instant audio switch: apply immediately on isActive change
    if (playerRef.current && isPlayerReadyRef.current) {
      AudioController.applyToPlayer(playerRef.current, isActive);
    }
    // Ensure first video (index 0) gets audio when it becomes active
    if (isActive && !isPaused) {
      safePlayerPlay();
    } else if (!isActive) {
      safePlayerPause();
    }
  }, [isActive, isPaused, safePlayerPlay, safePlayerPause]);

  // Extra safety: ensure audio is set when player becomes ready
  useEffect(() => {
    if (videoMetadata.isLoaded && isPlayerReadyRef.current && playerRef.current) {
      AudioController.applyToPlayer(playerRef.current, isActive);
    }
  }, [videoMetadata.isLoaded, isActive]);

  const handleVideoTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
      // Double tap - toggle play/pause
      setIsPaused(prev => !prev);
    }
    lastTap.current = now;
  };

  const channelName = item.user_profiles?.username || 'Unknown User';
  const channelAvatar = item.user_profiles?.avatar_url || 'https://via.placeholder.com/100';

  // Data-Centric: Format duration
  const formatDuration = (duration: number, isLoaded: boolean) => {
    if (!isLoaded || duration === 0) {
      return '0:00';
    }
    
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <View style={styles.reelContainer} key={item.id}>
        <DotAnimation isActive={false} />
        
        {/* Video Player with seamless transition */}
        <TouchableOpacity 
          style={styles.videoContainer}
          activeOpacity={1}
          onPress={handleVideoTap}
        >
          <VideoView 
            player={player} 
            style={[
              styles.reelVideo,
              { opacity: isVideoReady ? 1 : 0 }
            ]}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
          
          {isPaused && (
            <View style={styles.pauseOverlay}>
              <MaterialIcons name="play-circle-outline" size={80} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </TouchableOpacity>

        {/* Bottom-Left Overlay - Channel row (logo + name + support) + Running Title below */}
        <View pointerEvents="box-none" style={styles.leftOverlay}>
          <View style={styles.channelRow}>
            <ChannelInfo
              avatarUrl={channelAvatar}
              channelName={channelName}
              onPress={() => onChannelPress?.(item)}
            />
            <SupportSection
              itemId={item.id}
              isSupported={!!supported[item.id]}
              onSupportChange={(id: string, isSupportedValue: boolean) => onSupportChange?.(id, isSupportedValue, 0)}
            />
          </View>

          <View style={styles.leftTitleRow}>
            <RunningTitle title={item.title || item.description || ''} />
          </View>
        </View>

        <RightButtons
          itemId={item.id}
          likes={likes[item.id] || item.likes_count || 0}
          commentsCount={(comments[item.id] || []).length}
          shares={shares[item.id] || 0}
          isLiked={!!starred[item.id]}
          isSaved={!!saved[item.id]}
          onLikePress={(id: string, nextLiked: boolean) => {
            const currentCount = likes[id] || 0;
            const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
            onLikeChange?.(id, nextLiked, nextCount);
          }}
          onCommentPress={(id: string) => onCommentPress?.(id)}
          onSharePress={(id: string) => {
            const current = shares[id] || 0;
            onShareChange?.(id, current + 1);
          }}
          onSavePress={(id: string, nextSaved: boolean) => onSaveChange?.(id, nextSaved)}
          onReportPress={(id: string) => onReportPress?.(id)}
        />
      </View>
    </>
  );
}

export default function ReelsScreen() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(0);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    AudioController.initialize().catch(() => {});
  }, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
  // Player control functions for scroll handling
  const currentPlayerRef = useRef<any>(null);
  
  const safePlayerPause = useCallback(() => {
    try {
      if (currentPlayerRef.current) {
        currentPlayerRef.current.pause();
      }
    } catch (error: any) {
      console.warn('Error pausing video:', error);
    }
  }, []);
  
  // Simplified state - only essential data
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [supported, setSupported] = useState<Record<string, boolean>>({});
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [shares, setShares] = useState<Record<string, number>>({});
  
  // Modal states
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);

  const { data: swrReels, loading: swrLoading, refresh } = useSWRContent('Reel', 1, 50);

  // Initialize unique view tracker
  useEffect(() => {
    const initializeViewTracker = async () => {
      try {
        // Get user ID from storage (you might have a different way to get this)
        const userId = await AsyncStorage.getItem('user_id') || 'demo_user';
        await uniqueViewTracker.initialize(userId);
        
        // Sync any pending views
        await uniqueViewTracker.syncPendingViews();
      } catch (error) {
        console.error('❌ Error initializing view tracker:', error);
      }
    };

    initializeViewTracker();
  }, []);

  // Smart feed handlers with view tracking
  const handleVideoComplete = useCallback(async () => {
    
    // End current view tracking
    await uniqueViewTracker.endView();
    
    const nextIndex = videoFeedService.getNextUnwatchedVideo(currentIndex);
    
    if (nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true
        });
      }, 100);
    }
  }, [currentIndex]);

  const handleVideoWatched = useCallback(async (videoId: string, completed: boolean = false) => {
    videoFeedService.markVideoWatched(videoId, completed);
    
    // End view tracking when video is marked as watched
    if (completed) {
      await uniqueViewTracker.endView();
    }
  }, []);

  // Handle view change for tracking with sliding window
  const handleViewChange = useCallback(async (newIndex: number) => {
    if (newIndex === currentIndex) return;

    // End previous view tracking
    await uniqueViewTracker.endView();

    // Move sliding window
    await slidingWindowManager.moveWindow(newIndex, reels);

    // Start tracking new view
    const newReel = reels[newIndex];
    if (newReel) {
      await uniqueViewTracker.startView(newReel.id, newReel.duration || 0);
      
      // Update chunking service
      videoChunkingService.updateCurrentChunk(newReel.id, 0);
    }

    setCurrentIndex(newIndex);
    memoryManagerService.setCurrentIndex(newIndex);
    
    // Preload next reels
    slidingWindowManager.preloadNext(reels, newIndex);
  }, [currentIndex, reels]);

  // Track video progress
  const handleVideoProgress = useCallback(async (reelId: string, currentTime: number, totalDuration: number) => {
    await uniqueViewTracker.trackProgress(reelId, currentTime, totalDuration);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup all services
      slidingWindowManager.clearAll();
      videoChunkingService.cleanupAllStreams();
      memoryManagerService.clearAllMemory();
    };
  }, []);

  // Memory monitoring
  useEffect(() => {
    const memoryInterval = setInterval(() => {
      const memoryUsage = slidingWindowManager.getMemoryUsage();
      const videoMemory = videoChunkingService.getMemoryUsage();
      
      
      // Force cleanup if memory is high
      if (memoryUsage > 50) { // 50MB threshold for 3-video limit
        slidingWindowManager.forceCleanup();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(memoryInterval);
  }, []);
  useEffect(() => {
    if (reels.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const videoIds = reels.map(reel => reel.id);
      videoFeedService.initializeVideoPool(videoIds);
      
      // Initialize sliding window with LIMITED 3 reels buffer
      slidingWindowManager.initialize(reels, currentIndex);
      
      // Initialize video preloader
      videoPreloaderService.initializePreloader(reels);
      
      // Initialize chunking service for all reels
      reels.forEach(reel => {
        videoChunkingService.initializeStream(reel.id, reel.video_url, '480p')
          .catch(error => console.error(`Error initializing stream for ${reel.id}:`, error));
      });
      
      // Initialize memory manager
      memoryManagerService.clearAllMemory();
      
      const optimalIndex = 0;
      setCurrentIndex(0);
      memoryManagerService.setCurrentIndex(0);
      
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: 0,
          animated: false
        });
      }, 100);
    }
  }, [reels.length]);

  // Ultra-fast auto-preload: current + next 2 videos for instant play
  useEffect(() => {
    if (reels.length > 0) {
      // Preload current + next 2 videos for instant play
      const preloadIndexes = [currentIndex, currentIndex + 1, currentIndex + 2].filter(i => i >= 0 && i < reels.length);
      
      preloadIndexes.forEach(index => {
        if (reels[index]) {
          videoPreloaderService.forcePreload(reels[index].id, reels[index].video_url);
        }
      });
      
      // Cleanup old videos beyond next 2
      memoryManagerService.aggressiveCleanup(currentIndex, 3); // Keep current + next 2
    }
  }, [currentIndex, reels.length]);

  // Handle index change with auto-play and memory management
  const handleIndexChange = useCallback((newIndex: number) => {
    if (newIndex !== currentIndex) {
      
      // Update memory manager for resume functionality
      memoryManagerService.setCurrentIndex(newIndex);
      
      setCurrentIndex(newIndex);
      
      // Auto-scroll to new video
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: newIndex,
          animated: true
        });
      }, 50);
    }
  }, [currentIndex]);

  // Subscribe to video feed changes
  useEffect(() => {
    const unsubscribe = videoFeedService.subscribe(() => {
    });
    
    return () => unsubscribe();
  }, []);

  // MODULAR INTERACTION HANDLERS
  const handleLikeChange = useCallback((itemId: string, isLiked: boolean, count: number) => {
    setStarred(prev => ({ ...prev, [itemId]: isLiked }));
    setLikes(prev => ({ ...prev, [itemId]: count }));
  }, []);

  const handleCommentPress = useCallback((itemId: string) => {
    const reel = reels.find(r => r.id === itemId);
    if (reel) {
      setSelectedReel(reel);
      setShowCommentsModal(true);
    }
  }, [reels]);

  const handleShareChange = useCallback((itemId: string, count: number) => {
    setShares(prev => ({ ...prev, [itemId]: count }));
  }, []);

  const handleSupportChange = useCallback((itemId: string, isSupported: boolean, count: number) => {
    setSupported(prev => ({ ...prev, [itemId]: isSupported }));
  }, []);

  const handleReportPress = useCallback((itemId: string) => {
    Alert.alert('Report', 'Report submitted');
  }, []);

  const handleSaveChange = useCallback((itemId: string, isSaved: boolean) => {
    setSaved(prev => ({ ...prev, [itemId]: isSaved }));
  }, []);

  const handleChannelPress = useCallback((reel: Reel) => {
    // Channel modal logic can be added here
  }, []);

  const handleAddComment = useCallback(async (itemId: string, text: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userId: 'current-user',
      userName: 'You',
      userAvatar: 'https://i.pravatar.cc/150?img=0',
      text,
      timestamp: 'Just now',
    };

    setComments(prev => ({
      ...prev,
      [itemId]: [newComment, ...(prev[itemId] || [])]
    }));

    return newComment;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(swrLoading);
    const result = Array.isArray(swrReels) ? swrReels : [];
    setReels(result);
  }, [swrReels, swrLoading]);

  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      
      // Resume from last position
      const resumeIndex = memoryManagerService.getResumeIndex();
      if (resumeIndex !== currentIndexRef.current && resumeIndex >= 0) {
        setCurrentIndex(resumeIndex);
        memoryManagerService.setCurrentIndex(resumeIndex);
        
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: resumeIndex,
            animated: false
          });
        }, 100);
      }
      
      return () => {
        setIsScreenFocused(false);
        // Save current position for resume
        memoryManagerService.setCurrentIndex(currentIndexRef.current);
      };
    }, [])
  );

  // Cleanup audio manager when component unmounts
  useEffect(() => {
    return () => {
      // No audio manager cleanup needed
    };
  }, []);

  const renderReel = ({ item, index }: { item: Reel; index: number }) => {
    const isActive = currentIndex === index && isScreenFocused;

    return (
      <ReelItem
        item={item}
        index={index}
        isActive={isActive}
        onChannelPress={handleChannelPress}
        onVideoComplete={handleVideoComplete}
        onVideoWatched={handleVideoWatched}
        onLikeChange={handleLikeChange}
        onCommentPress={handleCommentPress}
        onShareChange={handleShareChange}
        onSaveChange={handleSaveChange}
        onSupportChange={handleSupportChange}
        onReportPress={handleReportPress}
        likes={likes}
        comments={comments}
        shares={shares}
        starred={starred}
        saved={saved}
        supported={supported}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBarOverlay style="light" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBarOverlay style="light" backgroundColor="#000000" />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: '#000',
          zIndex: 10000,
          elevation: 10000,
        }}
      />
      
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={renderReel}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        bounces={false}
        onScrollBeginDrag={() => {
          safePlayerPause();
        }}
        onMomentumScrollEnd={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const nextIndex = Math.max(0, Math.min(Math.round(offsetY / SCREEN_HEIGHT), reels.length - 1));
          if (nextIndex !== currentIndex) {
            void handleViewChange(nextIndex);
          }
        }}
        getItemLayout={(_, index) => ({
          length: REEL_HEIGHT,
          offset: REEL_HEIGHT * index,
          index,
        })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={5}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />

      {/* MODULAR COMMENT SHEET */}
      <CommentSheet
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        itemId={selectedReel?.id || ''}
        itemTitle={selectedReel?.title || selectedReel?.description}
        initialComments={comments[selectedReel?.id || ''] || []}
        onAddComment={handleAddComment}
      />
    </View>
  );
}

const CIRCLE = 36; // छोटा किया

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#fff',
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: '#aaa',
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  reelContainer: {
    width: SCREEN_WIDTH,
    height: REEL_HEIGHT,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
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
  leftOverlay: {
    position: 'absolute',
    bottom: 90,
    left: 12,
    right: 90,
    zIndex: 3,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leftTitleRow: {
    marginTop: 10,
    width: '100%',
  },
  channelAvatarContainer: {
    marginRight: 10, // Avatar और channel name के बीच थोड़ा space
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: theme.colors.text.primary,
  },
  // Channel name और support button बिल्कुल पास
  channelAndSupport: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelNameTouchable: {
    flex: 1,
    marginRight: 8, // Channel name और support button के बीच बहुत कम space
  },
  channelName: {
    color: theme.colors.text.primary,
    fontSize: 16, // थोड़ा बड़ा font
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    flexShrink: 1, // Text को shrink करने दें
  },
  supportButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: theme.borderRadius.sm,
    minWidth: 72, // Fixed width
    alignItems: 'center',
    flexShrink: 0, // Button का size fixed रहे
  },
  supportText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  // Marquee Container
  marqueeContainer: {
    overflow: 'hidden',
    height: 24,
    marginTop: 6,
  },
  description: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rightActions: {
    alignItems: 'center',
  },
  actionGroup: {
    alignItems: 'center',
    marginBottom: 8, // और कम किया बटनों को पास लाने के लिए
  },
  actionButtonWrap: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  actionText: {
    color: theme.colors.text.primary,
    fontSize: 10, // छोटा किया
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: 3, // कम किया
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

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

  channelProfileContainer: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  channelHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  channelProfileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.md,
  },
  channelProfileName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  channelProfileFollowers: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  channelBioContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  channelBioTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  channelBioText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  followButton: {
    backgroundColor: '#FF3B30',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#34C759',
  },
  followButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
  followingButtonText: {
    color: theme.colors.text.primary,
  },
  earningsButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#FF4444',
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
