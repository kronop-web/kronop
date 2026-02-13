import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { useState, useEffect } from 'react';
import { theme } from '../../constants/theme';
import { getLongVideoById, LongVideo } from '../../services/longVideoService';
import StatusBarOverlay from '../../components/common/StatusBarOverlay';
import VideoButtons from '../../components/feature/VideoButtons';

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [video, setVideo] = useState<LongVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Always call useVideoPlayer (hooks order). Use empty string when URL not yet available.
  const videoUri = video?.videoUrl ?? '';
  const player = useVideoPlayer({
    uri: videoUri,
    headers: {
      'User-Agent': 'KronopApp',
      'Referer': 'https://kronop.app',
      'Origin': 'https://kronop.app',
      'Accept': 'video/*',
    }
  }, (player) => {
    player.loop = false;
    if (videoUri) player.play();
  });

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
  const handleDownload = () => console.log('Download pressed');
  const handleSupport = () => setIsSupported(!isSupported);

  // Loading State (after all hooks)
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBarOverlay style="light" backgroundColor="transparent" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </View>
    );
  }

  // Error State (after all hooks)
  if (error || !video) {
    return (
      <View style={styles.container}>
        <StatusBarOverlay style="light" backgroundColor="transparent" />
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
      <StatusBarOverlay style="light" backgroundColor="transparent" />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player - Full Width with CDN Optimization */}
        <View style={styles.videoContainer}>
          <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen
            allowsPictureInPicture
            contentFit="contain"
            nativeControls
          />
        </View>

        {/* Video Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{video.title}</Text>
        </View>

        {/* Action Buttons - 6 Buttons */}
        <VideoButtons
          isStarred={isStarred}
          commentsCount={video.comments}
          sharesCount={0}
          isSaved={isSaved}
          onStarPress={handleStar}
          onCommentPress={handleComment}
          onSharePress={handleShare}
          onSavePress={handleSave}
          onReportPress={handleReport}
          onDownloadPress={handleDownload}
        />

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
          <TouchableOpacity 
            style={[styles.supportButton, isSupported && styles.supportButtonActive]}
            onPress={handleSupport}
            activeOpacity={0.7}
          >
            <Text style={[styles.supportButtonText, isSupported && styles.supportButtonTextActive]}>
              {isSupported ? 'Unsupport' : 'Support'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{video.description}</Text>
        </View>
      </ScrollView>

      {/* Close Button */}
      <Pressable 
        style={[styles.closeButton, { top: insets.top + theme.spacing.md }]}
        onPress={() => router.back()}
      >
        <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.background.tertiary,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    lineHeight: 24,
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
  supportButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  supportButtonActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  supportButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  supportButtonTextActive: {
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
  closeButton: {
    position: 'absolute',
    right: theme.spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
