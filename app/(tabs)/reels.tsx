
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useSWRContent } from '../../hooks/swr';
import { videoFeedService } from '../../services/videoFeedService';
import { hlsOptimizerService } from '../../services/hlsOptimizer';
import { uniqueViewTracker } from '../../services/uniqueViewTracker';
import { videoChunkingService } from '../../services/videoChunkingService';
import { CommentSheet } from '../../components/feature/CommentSheet';
import StatusBarOverlay from '../../components/common/StatusBarOverlay';
import AudioController from '../../services/AudioController';
import RightButtons from '../../components/feature/RightButtons';
import RunningTitle from '../../components/feature/RunningTitle';
import SupportSection from '../../components/feature/SupportSection';
import ChannelInfo from '../../components/feature/ChannelInfo';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

// Reel Item Component
function ReelItem({ 
  item, 
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
  const lastTap = useRef(0);
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef(false);

  useEffect(() => {
    if (isActive) setIsPaused(false);
  }, [isActive]);

  const getVideoSource = () => {
    let videoUrl = item.video_url;
    videoUrl = hlsOptimizerService.optimizeForBunnyCDN(videoUrl);
    videoUrl = hlsOptimizerService.convertToOptimizedHLS(videoUrl);
    return videoUrl;
  };

  const safePlayerPlay = useCallback(async () => {
    try {
      if (playerRef.current && isPlayerReadyRef.current) {
        await playerRef.current.play();
      }
    } catch (error) {
      console.warn('Error playing video:', error);
    }
  }, []);

  const safePlayerPause = useCallback(() => {
    try {
      if (playerRef.current && isPlayerReadyRef.current) {
        playerRef.current.pause();
      }
    } catch (error) {
      console.warn('Error pausing video:', error);
    }
  }, []);

  const cleanupPlayer = useCallback(() => {
    try {
      isPlayerReadyRef.current = false;
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current = null;
      }
    } catch (error) {
      console.warn('Error cleaning up player:', error);
    }
  }, []);

  const videoSource = getVideoSource();

  const player = useVideoPlayer({
    uri: videoSource,
    headers: {
      'User-Agent': 'KronopApp',
      'Referer': 'https://kronop.app',
      'Origin': 'https://kronop.app'
    }
  }, (playerInstance) => {
    playerRef.current = playerInstance;
    playerInstance.loop = false;
    AudioController.applyToPlayer(playerInstance, isActive);
    isPlayerReadyRef.current = true;
    setIsVideoReady(true);

    if (isActive) {
      onVideoWatched(item.id);
      videoChunkingService.getChunk(item.id, 0)
        .then(chunk => {
          if (chunk && chunk.loaded) {
            playerInstance.play();
            playerInstance.currentTime = 0;
          } else {
            setTimeout(() => safePlayerPlay(), 200);
          }
        })
        .catch(() => setTimeout(() => safePlayerPlay(), 200));
    }
  });

  useEffect(() => {
    return () => cleanupPlayer();
  }, []);

  useEffect(() => {
    if (!isActive || !isVideoReady || !isPlayerReadyRef.current) return;

    const checkCompletion = setInterval(() => {
      try {
        if (playerRef.current && playerRef.current.currentTime > 0 && playerRef.current.duration > 0) {
          const progress = (playerRef.current.currentTime / playerRef.current.duration) * 100;
          if (progress >= 95) {
            onVideoComplete();
            onVideoWatched(item.id, true);
            clearInterval(checkCompletion);
          }
        }
      } catch (error: any) {
        if (error?.message?.includes('already released')) {
          clearInterval(checkCompletion);
        }
      }
    }, 500);

    return () => clearInterval(checkCompletion);
  }, [isActive, isVideoReady, item.id, onVideoComplete, onVideoWatched]);

  useEffect(() => {
    if (playerRef.current && isPlayerReadyRef.current) {
      AudioController.applyToPlayer(playerRef.current, isActive);
    }
    if (isActive && !isPaused) {
      safePlayerPlay();
    } else if (!isActive) {
      safePlayerPause();
    }
  }, [isActive, isPaused, safePlayerPlay, safePlayerPause]);

  const handleVideoTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
      setIsPaused(prev => !prev);
    }
    lastTap.current = now;
  };

  const channelName = item.user_profiles?.username || 'Unknown User';
  const channelAvatar = item.user_profiles?.avatar_url || 'https://via.placeholder.com/100';

  return (
    <View style={styles.reelContainer} key={item.id}>
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
  );
}

export default function ReelsScreen() {
  const router = useRouter();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const hasInitializedRef = useRef(false);

  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [supported, setSupported] = useState<Record<string, boolean>>({});
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [shares, setShares] = useState<Record<string, number>>({});
  
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);

  const { data: swrReels, loading: swrLoading, refresh } = useSWRContent('Reel', 1, 50);

  // Combined initialization and cleanup effect
  useEffect(() => {
    AudioController.initialize().catch(() => {});
    
    const initializeViewTracker = async () => {
      try {
        const userId = await AsyncStorage.getItem('user_id') || 'demo_user';
        await uniqueViewTracker.initialize(userId);
        await uniqueViewTracker.syncPendingViews();
      } catch (error) {
        console.error('❌ Error initializing view tracker:', error);
      }
    };

    initializeViewTracker();

    return () => {
      videoChunkingService.cleanupAllStreams();
    };
  }, []);

  // Combined data and index management effect
  useEffect(() => {
    setLoading(swrLoading);
    const result = Array.isArray(swrReels) ? swrReels : [];
    setReels(result);

    if (!hasInitializedRef.current && result.length > 0) {
      hasInitializedRef.current = true;
      const validReels = result.filter(reel => reel?.id && reel?.video_url);
      if (validReels.length > 0) {
        const videoIds = validReels.map(reel => reel.id);
        videoFeedService.initializeVideoPool(videoIds);
        setCurrentIndex(0);
        flatListRef.current?.scrollToIndex({ index: 0, animated: false });
      }
    }

    // Preload next reel
    if (result.length > 0) {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < result.length && result[nextIndex]) {
        videoChunkingService.getChunk(result[nextIndex].id, 0).catch(() => {});
      }
    }
  }, [swrReels, swrLoading, currentIndex]);

  // Combined interaction handlers
  const handleVideoComplete = useCallback(async () => {
    await uniqueViewTracker.endView();
    const nextIndex = videoFeedService.getNextUnwatchedVideo(currentIndex);
    if (nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      }, 100);
    }
  }, [currentIndex]);

  const handleVideoWatched = useCallback(async (videoId: string, completed: boolean = false) => {
    videoFeedService.markVideoWatched(videoId, completed);
    if (completed) {
      await uniqueViewTracker.endView();
    }
  }, []);

  const handleViewChange = useCallback(async (newIndex: number) => {
    if (newIndex === currentIndex) return;
    setCurrentIndex(newIndex);
  }, [currentIndex]);

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

  const handleChannelPress = useCallback((reel: Reel) => {}, []);

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

  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      const cleanupInvalidReels = async () => {
        try {
          const invalidReelsStr = await AsyncStorage.getItem('invalidReels');
          const invalidReels = invalidReelsStr ? JSON.parse(invalidReelsStr) : [];
          
          if (invalidReels.length > 0) {
            setReels(prevReels => {
              const validReels = prevReels.filter(reel => {
                const isInvalid = invalidReels.some((invalid: any) => 
                  invalid.videoUrl === reel.video_url || invalid.thumbnailUrl === reel.thumbnail_url
                );
                return !isInvalid;
              });
              return validReels;
            });
            await AsyncStorage.removeItem('invalidReels');
          }
        } catch (error) {
          console.error('❌ Error cleaning invalid reels:', error);
        }
      };

      cleanupInvalidReels();
    }, [])
  );

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
        keyExtractor={(item) => item?.id || `reel-${Math.random()}`}
        renderItem={renderReel}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        bounces={false}
        onMomentumScrollEnd={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const nextIndex = Math.max(0, Math.min(Math.round(offsetY / SCREEN_HEIGHT), reels.length - 1));
          if (nextIndex !== currentIndex) {
            handleViewChange(nextIndex);
          }
        }}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="transparent" 
            colors={['transparent']}
            progressBackgroundColor="transparent"
          />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />

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
  reelContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
});
