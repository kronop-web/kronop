import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeScreen } from '../../components/layout';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * (9 / 16);

interface VideoData {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  channelName: string;
  description: string;
  views: number;
  stars: number;
  likes: number;
  comments: number;
  shares: number;
  uploadDate: string;
}

export default function YouTubePlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [userStars, setUserStars] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(video?.videoUrl || '');

  useEffect(() => {
    if (player && video) {
      player.loop = false;
      player.play();
      setIsPlaying(true);
    }
  }, [player, video]);

  useEffect(() => {
    loadVideo();
  }, [id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (showControls) {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [showControls, fadeAnim]);

  const loadVideo = async () => {
    try {
      setLoading(true);
      setError(false);
      
      // Mock video data - replace with actual API call
      const mockVideo: VideoData = {
        id: id as string,
        title: "Amazing Long Video Content - YouTube Style",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnailUrl: "https://picsum.photos/1280x720?random=" + id,
        channelName: "Kronop Creator",
        description: "This is an amazing long video content created for Kronop platform. Experience the best video quality with our new YouTube-style player.",
        views: 125000,
        stars: 4500,
        likes: 8900,
        comments: 234,
        shares: 567,
        uploadDate: "2 days ago"
      };
      
      setVideo(mockVideo);
      setUserStars(Math.floor(Math.random() * 5));
      setUserLiked(Math.random() > 0.5);
    } catch (error) {
      console.error('Error loading video:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = () => {
    if (!showControls) {
      setShowControls(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    }
  };

  const handleShare = async () => {
    if (video) {
      try {
        await Share.share({
          message: `Check out this video: ${video.title}`,
          url: `https://kronop.app/video/${video.id}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleStar = (rating: number) => {
    setUserStars(rating);
    // TODO: Send rating to backend
  };

  const handleLike = () => {
    setUserLiked(!userLiked);
    // TODO: Send like to backend
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <SafeScreen style={{ backgroundColor: '#000' }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (error || !video) {
    return (
      <SafeScreen style={{ backgroundColor: '#000' }}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#FF0000" />
          <Text style={styles.errorText}>Failed to load video</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadVideo}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={{ backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Video Player Section */}
        <View style={styles.videoContainer}>
          <VideoView 
            style={styles.videoPlayer}
            player={player}
            contentFit="contain"
            allowsPictureInPicture
          />
          
          <TouchableOpacity 
            style={styles.videoOverlay}
            activeOpacity={1}
            onPress={handleVideoPress}
          >
            {/* Play/Pause Button */}
            {!showControls && (
              <TouchableOpacity 
                style={styles.playPauseButton}
                onPress={() => {
                  if (isPlaying) {
                    player.pause();
                    setIsPlaying(false);
                  } else {
                    player.play();
                    setIsPlaying(true);
                  }
                }}
              >
                <MaterialIcons 
                  name={isPlaying ? "pause" : "play-arrow"} 
                  size={60} 
                  color="#fff" 
                />
              </TouchableOpacity>
            )}

            {/* Controls Overlay */}
            {showControls && (
              <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]}>
                {/* Back Button */}
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Video Info */}
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <View style={styles.videoStats}>
                    <Text style={styles.statText}>{formatNumber(video.views)} views</Text>
                    <Text style={styles.statDot}>•</Text>
                    <Text style={styles.statText}>{video.uploadDate}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <MaterialIcons name="share" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>

        {/* Video Details Section */}
        <View style={styles.detailsContainer}>
          {/* Title and Stats */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{video.title}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.stats}>{formatNumber(video.views)} views</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.stats}>{video.uploadDate}</Text>
            </View>
          </View>

          {/* Channel Info */}
          <View style={styles.channelSection}>
            <View style={styles.channelInfo}>
              <View style={styles.channelAvatar}>
                <MaterialIcons name="account-circle" size={40} color="#FF0000" />
              </View>
              <View style={styles.channelDetails}>
                <Text style={styles.channelName}>{video.channelName}</Text>
                <Text style={styles.subscriberCount}>1.2M subscribers</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.subscribeButton}>
              <Text style={styles.subscribeButtonText}>Subscribe</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionButtonRow, userLiked && styles.likedButton]}
              onPress={handleLike}
            >
              <MaterialIcons 
                name={userLiked ? "thumb-up" : "thumb-up"} 
                size={20} 
                color={userLiked ? "#FF0000" : "#fff"} 
              />
              <Text style={[styles.actionButtonText, userLiked && styles.likedText]}>
                {formatNumber(video.likes)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonRow}>
              <MaterialIcons name="comment" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{formatNumber(video.comments)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonRow}>
              <MaterialIcons name="share" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{formatNumber(video.shares)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonRow}>
              <MaterialIcons name="download" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>
          </View>

          {/* Stars Rating */}
          <View style={styles.starsSection}>
            <Text style={styles.starsTitle}>Rate this video</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity 
                  key={star}
                  onPress={() => handleStar(star)}
                  style={styles.starButton}
                >
                  <MaterialIcons 
                    name={star <= userStars ? "star" : "star-border"} 
                    size={30} 
                    color={star <= userStars ? "#FFD700" : "#666"} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.starsCount}>{video.stars} stars</Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.description}>{video.description}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeScreen>
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
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#FF0000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    padding: 15,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  statDot: {
    color: '#fff',
    marginHorizontal: 4,
    opacity: 0.8,
  },
  actionButtons: {
    marginLeft: 12,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  detailsContainer: {
    padding: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stats: {
    color: '#aaa',
    fontSize: 14,
  },
  separator: {
    color: '#aaa',
    marginHorizontal: 8,
  },
  channelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelAvatar: {
    marginRight: 12,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subscriberCount: {
    color: '#aaa',
    fontSize: 12,
  },
  subscribeButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  actionButtonRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  likedButton: {
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  likedText: {
    color: '#FF0000',
  },
  starsSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  starsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starButton: {
    marginHorizontal: 4,
  },
  starsCount: {
    color: '#aaa',
    fontSize: 14,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
});
