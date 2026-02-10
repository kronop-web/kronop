import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeScreen } from '../../components/layout';

interface VideoData {
  id: string;
  title: string;
  videoUrl: string;
  channelName: string;
  description: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * (9 / 16);

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const loadVideo = async () => {
      setLoading(true);
      setError(false);
      setVideoLoaded(false);
      
      try {
        // Mock video data - replace with actual API call
        const mockVideo: VideoData = {
          id: Array.isArray(id) ? id[0] : id,
          title: 'Amazing Video Title',
          videoUrl: process.env.EXPO_PUBLIC_SAMPLE_VIDEO_BIGBUCK || '',
          channelName: 'Channel Name',
          description: 'This is an amazing video description that tells you all about this incredible content.'
        };
        
        // The Fix: Clean URL trim
        const cleanUrl = mockVideo.videoUrl.trim();
        mockVideo.videoUrl = cleanUrl;
        
        setVideo(mockVideo);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [id]);

  const handleRetry = () => {
    loadVideo();
  };

  const loadVideo = async () => {
    setLoading(true);
    setError(false);
    setVideoLoaded(false);
    
    try {
      // Mock video data - replace with actual API call
      const mockVideo: VideoData = {
        id: Array.isArray(id) ? id[0] : id,
        title: 'Amazing Video Title',
        videoUrl: process.env.EXPO_PUBLIC_SAMPLE_VIDEO_BIGBUCK || '',
        channelName: 'Channel Name',
        description: 'This is an amazing video description that tells you all about this incredible content.'
      };
      
      // The Fix: Clean URL trim
      const cleanUrl = mockVideo.videoUrl.trim();
      mockVideo.videoUrl = cleanUrl;
      
      setVideo(mockVideo);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (error || !video) {
    return (
      <SafeScreen>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load video</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        {/* Modern YouTube-style Video Container - Fixed 16:9 */}
        <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
          <VideoPlayer 
            videoUrl={video.videoUrl}
            onVideoLoaded={() => setVideoLoaded(true)}
            onError={() => setError(true)}
          />
        </View>
        
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{video.title}</Text>
        </View>
        
        {/* Channel Info */}
        <View style={styles.channelSection}>
          <View style={styles.channelInfo}>
            <View style={styles.avatar} />
            <View style={styles.channelDetails}>
              <Text style={styles.channelName}>{video.channelName}</Text>
              <Text style={styles.subscriberCount}>1.2M subscribers</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.subscribeButton}>
            <Text style={styles.subscribeText}>Subscribe</Text>
          </TouchableOpacity>
        </View>
        
        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.description}>{video.description}</Text>
        </View>
      </View>
    </SafeScreen>
  );
}

// Clean Video Player Component
function VideoPlayer({ videoUrl, onVideoLoaded, onError }: { 
  videoUrl: string; 
  onVideoLoaded: () => void; 
  onError: () => void;
}) {
  const [loading, setLoading] = useState(true);

  const player = useVideoPlayer({
    uri: videoUrl,
  }, (player) => {
    console.log('Video Player onLoad - URL:', videoUrl);
    player.play();
    setLoading(false);
    onVideoLoaded();
  });

  if (loading) {
    return (
      <View style={styles.videoLoadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <VideoView 
      player={player} 
      style={styles.videoPlayer}
      contentFit="contain"
      nativeControls={true}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#ff0000',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoContainer: {
    width: '100%',
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoLoadingContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 28,
  },
  channelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
    marginRight: 12,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  subscriberCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  subscribeButton: {
    backgroundColor: '#ff0000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  subscribeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  descriptionSection: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});