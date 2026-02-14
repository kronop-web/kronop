import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { theme } from '../../../constants/theme';
import { getLongVideoById, LongVideo } from '../../../services/longVideoService';

import Title from './Title';
import Star from './Star';
import Comment from './Comment';
import Share from './Share';
import Save from './Save';
import Report from './Report';
import Support from './Support';
import Unsupport from './Unsupport';
import Setting from './Setting';
import Horizontal from './Horizontal';
import VideoPlayer from './VideoPlayer';

export default function MainScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [video, setVideo] = useState<LongVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const loadVideo = async () => {
      if (!id) {
        setError('Video ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const fetchedVideo = await getLongVideoById(id);

        if (fetchedVideo) {
          setVideo(fetchedVideo);
          setIsSupported(fetchedVideo.user.isSupported || false);
        } else {
          setError('Video not found');
        }
      } catch (err) {
        console.error('Error loading video:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [id]);

  const handleStar = () => setIsStarred(!isStarred);
  const handleComment = () => console.log('Comment pressed');
  const handleShare = () => console.log('Share pressed');
  const handleSave = () => setIsSaved(!isSaved);
  const handleReport = () => console.log('Report pressed');
  const handleSupport = () => setIsSupported(!isSupported);
  const handleSettings = () => console.log('Settings pressed');
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    console.log('Fullscreen toggled');
  };

  const handleTitlePress = () => {
    setShowFullTitle(!showFullTitle);
  };

  const handleVideoProgress = (progress: number, duration: number) => {
    // Progress tracking handled by VideoPlayer component
  };

  // Loading State
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle="light-content" 
          translucent={true}
          backgroundColor="transparent"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </View>
    );
  }

  // Error State
  if (error || !video) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle="light-content" 
          translucent={true}
          backgroundColor="transparent"
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorText}>{error || 'Video not found'}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        translucent={true}
        backgroundColor="transparent"
        hidden={false}
      />
      
      {/* Video Title - Professional Box with Border */}
      <Title 
        title={showFullTitle ? video.title : video.title}
        onPress={handleTitlePress}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player - Clean with No Controls */}
        <VideoPlayer 
          videoUrl={video.videoUrl}
          onProgress={handleVideoProgress}
        />

        {/* Bottom Buttons - Full Width (Setting + Horizontal) */}
        <View style={styles.bottomButtonsContainer}>
          <Setting onPress={handleSettings} />
          <Horizontal isFullscreen={isFullscreen} onPress={handleFullscreen} />
        </View>

        {/* Action Buttons - Star, Comment, Share, Save, Report */}
        <View style={styles.actionButtonsContainer}>
          <Star isStarred={isStarred} onPress={handleStar} />
          <Comment onPress={handleComment} />
          <Share onPress={handleShare} />
          <Save isSaved={isSaved} onPress={handleSave} />
          <Report onPress={handleReport} />
        </View>

        {/* Channel Section */}
        <View style={styles.channelContainer}>
          <View style={styles.channelInfo}>
            <Image 
              source={{ uri: video.user.avatar }} 
              style={styles.avatar}
              contentFit="cover"
            />
            <Text style={styles.channelName}>{video.user.name}</Text>
          </View>
          <Support isSupported={isSupported} onPress={handleSupport} />
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{video.description}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black - forces dark mode
    marginTop: 0,
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: theme.spacing.md,
    marginHorizontal: 0,
    gap: theme.spacing.sm,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginHorizontal: 0,
  },
  channelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
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
    marginRight: theme.spacing.md,
  },
  channelName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  descriptionContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  errorText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.error,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
