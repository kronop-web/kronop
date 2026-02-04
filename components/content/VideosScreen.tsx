import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideos } from '../../hooks/useContent';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2; // 2 columns with spacing

export default function VideosScreen() {
  const { data, loading, error, pagination, loadMore, refresh } = useVideos();
  const router = useRouter();

  const renderVideo = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.videoItem}
      onPress={() => router.push(`/video/${item._id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: item.thumbnail || `https://picsum.photos/seed/${item._id}/400/225` }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.playOverlay}>
          <MaterialIcons name="play-circle-filled" size={48} color="#fff" />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.channelInfo}>
          <Image 
            source={{ uri: item.channelAvatar || `https://picsum.photos/seed/${item.channelId}/40/40` }}
            style={styles.channelAvatar}
            contentFit="cover"
          />
          <Text style={styles.channelName} numberOfLines={1}>{item.channelName}</Text>
        </View>
        <View style={styles.videoStats}>
          <Text style={styles.statText}>{formatViews(item.views)}</Text>
          <Text style={styles.statText}>•</Text>
          <Text style={styles.statText}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return <ActivityIndicator size="small" color={theme.colors.primary.main} style={styles.loader} />;
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="video-library" size={64} color={theme.colors.text.tertiary} />
      <Text style={styles.emptyText}>No long videos found</Text>
      <Text style={styles.emptySubText}>Upload your first long video to get started</Text>
    </View>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to load videos</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Long Videos</Text>
        <Text style={styles.headerSubtitle}>Professional content</Text>
      </View>
      <FlatList
        data={data}
        renderItem={renderVideo}
        keyExtractor={(item) => item._id}
        numColumns={2}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const formatDuration = (seconds: number) => {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatViews = (views: number) => {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  row: {
    justifyContent: 'space-between',
  },
  videoItem: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    width: ITEM_WIDTH,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: ITEM_WIDTH * 0.5625, // 16:9 ratio
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
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
    bottom: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  durationText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  videoInfo: {
    padding: theme.spacing.sm,
  },
  videoTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    lineHeight: 16,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  channelAvatar: {
    width: 20,
    height: 20,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.xs,
  },
  channelName: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginHorizontal: 2,
  },
  loader: {
    marginVertical: theme.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  emptySubText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
