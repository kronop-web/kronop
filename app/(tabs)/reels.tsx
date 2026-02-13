
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
import VideoPlayer from '../../components/feature/VideoPlayer';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { ultraFastPreloader } from '../../services/ultraFastPreloader';
import { bunnySyncCleanup } from '../../services/bunnySyncCleanup';
import { SupporterButton } from '../../components/feature/SupporterButton';
import { InteractionBar } from '../../components/feature/InteractionBar';
import { CommentSheet } from '../../components/feature/CommentSheet';
import StatusBarOverlay from '../../components/common/StatusBarOverlay';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const REEL_HEIGHT = SCREEN_HEIGHT;

interface Reel {
  id: string;
  _id?: string; // Optional MongoDB _id for unique key
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
  likes,
  comments,
  shares,
  starred,
  saved,
  supported
}: any) {
  const [isPaused, setIsPaused] = useState(false);

  // Data-Centric: Get optimized video source
  const getVideoSource = () => {
    let videoUrl = item.video_url;
    
    // Optimize for Bunny CDN
    videoUrl = hlsOptimizerService.optimizeForBunnyCDN(videoUrl);
    
    // Convert to HLS if needed
    videoUrl = hlsOptimizerService.convertToOptimizedHLS(videoUrl);
    
    return videoUrl;
  };

  const videoSource = getVideoSource();

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
        
        {/* Optimized Video Player with Instant Chunk Playback */}
        <VideoPlayer
          videoUrl={videoSource}
          thumbnail={item.thumbnail_url || undefined}
          title={item.title}
          autoPlay={true}
          isActive={isActive} // AUDIO CONTROL: Only active video plays
        />

        {/* Bottom Content - MODULAR DESIGN */}
        <View style={styles.bottomContainer}>
          <View style={styles.bottomInfo}>
            {/* Channel Info with Support Button */}
            <View style={styles.channelInfoContainer}>
              <View style={styles.channelLeftSide}>
              </View>
            </View>
          </View>
          
          {/* WORKING MARQUEE TEXT */}
          <MarqueeText text={item.description} />
        </View>

        {/* Right Actions - VERTICAL LAYOUT */}
        <View style={styles.rightActions}>
          <InteractionBar
            itemId={item.id}
            likes={likes[item.id] || item.likes_count || 0}
            comments={comments[item.id] || []}
            shares={shares[item.id] || 0}
            isLiked={starred[item.id]}
            isSaved={saved[item.id]}
            onLikeChange={onLikeChange}
            onCommentPress={onCommentPress}
            onShareChange={onShareChange}
            onSaveChange={onSaveChange}
            size="medium"
            showCounts={true}
            layout="vertical" // Vertical layout for right side
          />
        </View>
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
  const flatListRef = useRef<FlatList>(null);
  
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

  // Smart feed handlers with view tracking - AUTO-ADVANCE DISABLED
  const handleVideoComplete = useCallback(async () => {
    // AUTO-ADVANCE DISABLED: Let video loop instead of advancing
    // Only end view tracking, don't move to next video
    await uniqueViewTracker.endView();
    
    // NO AUTO-ADVANCE: User must swipe manually to see next reel
    console.log('🔁 Video completed - looping instead of auto-advancing');
  }, []);

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
    
    // Preload next reels with ULTRA FAST system
    slidingWindowManager.preloadNext(reels, newIndex);
    
    // ULTRA FAST PRELOADING: Preload next 3 reels with 5 chunks each
    ultraFastPreloader.preloadNextReels(newIndex, reels);
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
    if (reels.length > 0) {
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
      
      // BUNNY SYNC & CLEANUP: Check and remove deleted videos
      bunnySyncCleanup.syncReels(reels)
        .then(({ cleanedReels, stats }) => {
          if (stats.deletedFound > 0) {
            console.log(`🧹 Cleaned ${stats.deletedFound} deleted reels from ${stats.totalChecked} checked`);
            // Update reels state with cleaned list
            // Note: You might want to update the reels state here
          }
        })
        .catch(error => console.error('❌ Bunny sync failed:', error));
      
      const optimalIndex = videoFeedService.getOptimalStartingIndex();
      setCurrentIndex(optimalIndex);
      memoryManagerService.setCurrentIndex(optimalIndex);
      
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: optimalIndex,
          animated: false
        });
      }, 100);
    }
  }, [reels.length]);

  // Auto-preload videos around current index with LIMITED memory management
  useEffect(() => {
    if (reels.length > 0) {
      // LIMITED PRELOAD: Only preload current and next video (3 total)
      const preloadIndexes = [currentIndex - 1, currentIndex, currentIndex + 1].filter(i => i >= 0 && i < reels.length);
      
      preloadIndexes.forEach(index => {
        if (reels[index]) {
          videoPreloaderService.forcePreload(reels[index].id, reels[index].video_url);
        }
      });
      
      // Aggressive cleanup for old videos
      memoryManagerService.aggressiveCleanup(currentIndex, 3); // Keep only 3 videos
    }
  }, [currentIndex, reels.length]);

  // BACKGROUND BUNNY SYNC: Run cleanup every 2 minutes
  useEffect(() => {
    if (reels.length === 0) return;

    const syncInterval = setInterval(() => {
      console.log('🔄 Running background Bunny sync & cleanup...');
      bunnySyncCleanup.backgroundSync(reels, [])
        .then(() => console.log('✅ Background sync complete'))
        .catch(error => console.error('❌ Background sync failed:', error));
    }, 2 * 60 * 1000); // Every 2 minutes

    return () => clearInterval(syncInterval);
  }, [reels]);

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
      if (resumeIndex !== currentIndex && resumeIndex >= 0) {
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
        memoryManagerService.setCurrentIndex(currentIndex);
      };
    }, [currentIndex])
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
      
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item) => item._id || item.id} // UNIQUE KEY: Use _id if available
        renderItem={renderReel}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        // AUDIO MANAGEMENT: Viewability config for proper play/pause
        viewabilityConfig={{
          itemVisiblePercentThreshold: 80, // 80% visible = active
          minimumViewTime: 100,
          waitForInteraction: false,
        }}
        onViewableItemsChanged={({ viewableItems, changed }) => {
          // Find the most visible item (center screen)
          const mostVisible = viewableItems.find(item => 
            item.isViewable && item.index !== undefined && item.index !== null
          );
          
          if (mostVisible && mostVisible.index !== undefined && mostVisible.index !== null) {
            const newIndex = mostVisible.index;
            
            // ONLY FRONT VIDEO PLAYS: Update active index
            if (newIndex !== currentIndex) {
              console.log(`🔇 Audio Control: Active video changed to index ${newIndex}`);
              handleIndexChange(newIndex);
            }
          }
        }}
        onMomentumScrollEnd={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const newIndex = Math.round(offsetY / SCREEN_HEIGHT);
          
          // Auto-play on scroll - SYNCED WITH AUDIO
          if (newIndex !== currentIndex) {
            handleIndexChange(newIndex);
          }
        }}
        onScrollBeginDrag={() => {
          // Pause current video when user starts scrolling
          safePlayerPause();
        }}
        onScrollEndDrag={(event) => {
          // Auto-play new video after scroll ends
          const offsetY = event.nativeEvent.contentOffset.y;
          const newIndex = Math.round(offsetY / SCREEN_HEIGHT);
          
          setTimeout(() => {
            setCurrentIndex(newIndex);
          }, 100);
        }}
        getItemLayout={(_, index) => ({
          length: REEL_HEIGHT,
          offset: REEL_HEIGHT * index,
          index,
        })}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={true}
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
  bottomContainer: {
    position: 'absolute',
    bottom: 70, // और ऊपर लाया बटनों को दिखाने के लिए
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row', // Horizontal layout
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
  },
  bottomInfo: {
    flex: 1, // Left side takes available space
    paddingRight: theme.spacing.xl, // Right actions के लिए space
  },
  // Channel Info Container
  channelInfoContainer: {
    marginBottom: 8, // कम किया
  },
  channelLeftSide: {
    flexDirection: 'row',
    alignItems: 'center',
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
    position: 'absolute',
    right: 15, // RIGHT SIDE POSITION
    bottom: 100, // Above bottom text
    alignItems: 'center',
    zIndex: 10,
    flexDirection: 'column', // Vertical stack
    gap: 20, // Proper spacing between buttons
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
