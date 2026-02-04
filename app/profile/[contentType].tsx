import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import userContentService, { ContentType, UserContent, PaginationParams, PaginatedResponse } from '../../services/userContentService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

// Skeleton component for loading states
const SkeletonItem = () => (
  <View style={[styles.contentItem, { width: ITEM_WIDTH }]}>
    <View style={[styles.contentCard, styles.skeletonCard]}>
      <View style={[styles.thumbnailContainer, styles.skeleton]} />
      <View style={styles.contentInfo}>
        <View style={[styles.skeletonTitle, styles.skeleton]} />
        <View style={styles.contentStats}>
          <View style={[styles.skeletonStat, styles.skeleton]} />
          <View style={[styles.skeletonStat, styles.skeleton]} />
          <View style={[styles.skeletonStat, styles.skeleton]} />
        </View>
      </View>
    </View>
  </View>
);

// Content type configuration
const CONTENT_CONFIG = {
  [ContentType.REELS]: {
    title: 'My Reels',
    icon: 'film',
    color: '#FF6B6B',
    showDuration: true,
    aspectRatio: '9:16'
  },
  [ContentType.VIDEOS]: {
    title: 'My Videos',
    icon: 'play-circle',
    color: '#4ECDC4',
    showDuration: true,
    aspectRatio: '16:9'
  },
  [ContentType.PHOTOS]: {
    title: 'My Photos',
    icon: 'image',
    color: '#45B7D1',
    showDuration: false,
    aspectRatio: '4:3'
  },
  [ContentType.STORIES]: {
    title: 'My Stories',
    icon: 'book',
    color: '#96CEB4',
    showDuration: true,
    aspectRatio: '9:16'
  },
  [ContentType.LIVE]: {
    title: 'My Live Streams',
    icon: 'radio',
    color: '#FECA57',
    showDuration: false,
    aspectRatio: '16:9'
  },
  [ContentType.SHAYARI]: {
    title: 'My Shayari',
    icon: 'format-quote',
    color: '#DDA0DD',
    showDuration: false,
    aspectRatio: '1:1'
  }
};

export default function ContentDetailScreen() {
  const router = useRouter();
  const { contentType } = useLocalSearchParams<{ contentType: string }>();
  const [userContent, setUserContent] = useState<UserContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  // Pagination constants
  const PAGE_SIZE = 10;

  // Validate content type
  const validContentType = Object.values(ContentType).includes(contentType as ContentType) 
    ? contentType as ContentType 
    : ContentType.REELS;

  const config = CONTENT_CONFIG[validContentType];

  // Load current user
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        const user = JSON.parse(stored);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // Load user content with pagination
  const loadContent = useCallback(async (reset = false) => {
    if (!currentUser) return;

    try {
      const currentOffset = reset ? 0 : offset;
      
      if (reset) {
        setLoading(true);
        setOffset(0);
        setUserContent([]);
      } else {
        setLoadingMore(true);
      }

      const response = await userContentService.getUserContentPaginated(
        currentUser._id || currentUser.id, 
        validContentType, 
        { limit: PAGE_SIZE, offset: currentOffset }
      );
      
      if (response.success && response.data) {
        const { data, hasMore: moreData, total: totalCount } = response.data;
        
        if (reset) {
          setUserContent(data);
        } else {
          setUserContent(prev => [...prev, ...data]);
        }
        
        setHasMore(moreData);
        setTotal(totalCount);
        setOffset(currentOffset + PAGE_SIZE);
      } else {
        console.error('Error loading content:', response.error);
        if (reset) {
          setUserContent([]);
        }
      }

      // Load stats only on initial load
      if (reset) {
        const statsResponse = await userContentService.getUserStats(currentUser._id || currentUser.id);
        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data[validContentType]);
        }
      }
    } catch (error) {
      console.error('Error in loadContent:', error);
      if (reset) {
        setUserContent([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [currentUser, validContentType, offset]);

  // Load more data on scroll end
  const loadMoreContent = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      loadContent(false);
    }
  }, [loadingMore, hasMore, loading, loadContent]);

  // Handle content press navigation
  const handleContentPress = useCallback((content: UserContent) => {
    // Navigate to content viewer based on type
    if (validContentType === ContentType.VIDEOS || validContentType === ContentType.REELS) {
      router.push({
        pathname: '/video/[id]',
        params: {
          id: content.id,
          title: content.title
        }
      });
    } else if (validContentType === ContentType.PHOTOS) {
      router.push({
        pathname: '/photos/[id]',
        params: {
          id: content.id,
          title: content.title
        }
      });
    } else {
      // For other content types, show a simple modal or navigate to a generic viewer
      Alert.alert('Content', `Viewing ${content.title}\n\nType: ${content.contentType}\nViews: ${content.views}\nLikes: ${content.likes}`);
    }
  }, [validContentType, router]);

  // Handle content deletion
  const handleDeleteContent = useCallback((content: UserContent) => {
    Alert.alert(
      'Delete Content',
      `Are you sure you want to delete "${content.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await userContentService.deleteContent(content.id);
              if (response.success) {
                Alert.alert('Success', 'Content deleted successfully');
                loadContent(true); // Refresh the list
              } else {
                Alert.alert('Error', response.error || 'Failed to delete content');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete content');
            }
          }
        }
      ]
    );
  }, [loadContent]);

  // Memoized key extractor for better performance
  const keyExtractor = useCallback((item: UserContent) => item.id, []);

  // Memoized render item for better performance
  const renderItem = useCallback(({ item }: { item: UserContent }) => (
    <TouchableOpacity
      style={styles.contentItem}
      onPress={() => handleContentPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.contentCard}>
        {/* Thumbnail/Image with basic caching */}
        <View style={styles.thumbnailContainer}>
          {validContentType === ContentType.PHOTOS ? (
            <Image 
              source={{ uri: item.url }} 
              style={styles.thumbnail} 
            />
          ) : validContentType === ContentType.SHAYARI ? (
            <View style={[styles.thumbnail, styles.shayariThumbnail]}>
              <MaterialIcons name={config.icon as any} size={40} color={config.color} />
              <Text style={styles.shayariTitle}>{item.title}</Text>
            </View>
          ) : (
            <Image 
              source={{ uri: item.thumbnailUrl || item.url }} 
              style={styles.thumbnail} 
            />
          )}
          
          {/* Duration badge for video content */}
          {config.showDuration && item.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          )}

          {/* Live indicator for live content */}
          {validContentType === ContentType.LIVE && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* Content Info */}
        <View style={styles.contentInfo}>
          <Text style={styles.contentTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          <View style={styles.contentStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="visibility" size={14} color="#666" />
              <Text style={styles.statText}>{item.views}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="favorite" size={14} color="#666" />
              <Text style={styles.statText}>{item.likes}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="comment" size={14} color="#666" />
              <Text style={styles.statText}>{item.comments}</Text>
            </View>
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteContent(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="delete" size={18} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [validContentType, config, handleContentPress, handleDeleteContent]);

  // Memoized footer for loading more indicator
  const ListFooterComponent = useMemo(() => (
    <View style={styles.footerContainer}>
      {loadingMore && (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      )}
      {!hasMore && userContent.length > 0 && (
        <Text style={styles.endOfListText}>
          {total > 0 ? `Showing all ${total} items` : 'End of list'}
        </Text>
      )}
    </View>
  ), [loadingMore, hasMore, userContent.length, total]);

  useEffect(() => {
    if (currentUser) {
      loadContent();
    }
  }, [currentUser, loadContent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent(true); // Reset pagination on refresh
  };

  // Memoized skeleton list for initial loading
  const SkeletonList = useMemo(() => (
    <View style={styles.contentList}>
      {[...Array(6)].map((_, index) => (
        <SkeletonItem key={`skeleton-${index}`} />
      ))}
    </View>
  ), []);

  if (loading) {
    return (
      <SafeScreen edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading your {config.title.toLowerCase()}...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <MaterialIcons name={config.icon as any} size={24} color={config.color} />
            <Text style={styles.headerTitle}>{config.title}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Stats Bar */}
        {stats && (
          <View style={styles.statsBar}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.count}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalViews.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalLikes.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalComments.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
          </View>
        )}

        {/* Content List */}
        {userContent.length > 0 ? (
          <FlatList
            data={userContent}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            contentContainerStyle={styles.contentList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary.main]}
                tintColor={theme.colors.primary.main}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name={config.icon as any} size={80} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No {config.title.toLowerCase()} yet</Text>
            <Text style={styles.emptySubtitle}>
              Start creating {config.title.toLowerCase()} to see them here
            </Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => router.push('/upload')}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>Create {config.title.slice(0, -1)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  statNumber: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  contentList: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  contentItem: {
    width: ITEM_WIDTH,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  contentCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: ITEM_WIDTH * 1.2, // Adjust based on aspect ratio
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shayariThumbnail: {
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shayariTitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contentInfo: {
    padding: theme.spacing.sm,
  },
  contentTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  contentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 10,
    color: theme.colors.text.secondary,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 6,
  },
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  // Skeleton styles for loading states
  skeletonCard: {
    backgroundColor: theme.colors.background.tertiary,
  },
  skeleton: {
    backgroundColor: '#333333',
    opacity: 0.3,
  },
  skeletonTitle: {
    height: 16,
    width: '80%',
    marginBottom: 8,
    borderRadius: 4,
  },
  skeletonStat: {
    height: 12,
    width: 30,
    borderRadius: 2,
  },
  footerContainer: {
    paddingVertical: theme.spacing.md,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingMoreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  endOfListText: {
    textAlign: 'center',
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    paddingVertical: theme.spacing.sm,
  },
});
