import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { videosApi, reelsApi, photosApi } from '../../services/api';

interface SearchResult {
  id: string;
  type: 'video' | 'reel' | 'photo';
  title: string;
  description: string;
  thumbnail_url: string | null;
  video_url?: string;
  photo_url?: string;
  views_count?: number;
  created_at: string;
  user_profiles?: {
    username: string;
    avatar_url: string;
  };
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'videos' | 'reels' | 'photos'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async () => {
    setLoading(true);
    
    try {
      let allResults: SearchResult[] = [];

      // Search Videos
      if (activeFilter === 'all' || activeFilter === 'videos') {
        const videosResult = await videosApi.getVideos();
        if (videosResult.data) {
          const filtered = videosResult.data.filter((video: any) => 
            video.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            video.user_profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            video.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          allResults = [...allResults, ...filtered.map((v: any) => ({ ...v, type: 'video' as const }))];
        }
      }

      // Search Reels
      if (activeFilter === 'all' || activeFilter === 'reels') {
        const reelsResult = await reelsApi.getReels();
        if (reelsResult.data) {
          const filtered = reelsResult.data.filter((reel: any) => 
            reel.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reel.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reel.user_profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reel.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          allResults = [...allResults, ...filtered.map((r: any) => ({ ...r, type: 'reel' as const }))];
        }
      }

      // Search Photos
      if (activeFilter === 'all' || activeFilter === 'photos') {
        const photosResult = await photosApi.getPhotos();
        if (photosResult.data) {
          const filtered = photosResult.data.filter((photo: any) => 
            photo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            photo.user_profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            photo.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          allResults = [...allResults, ...filtered.map((p: any) => ({ ...p, type: 'photo' as const }))];
        }
      }

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, activeFilter, performSearch]);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'videos', label: 'Videos' },
    { id: 'reels', label: 'Reels' },
    { id: 'photos', label: 'Photos' },
  ];

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => {
        if (item.type === 'video') {
          router.push(`/video/${item.id}`);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.resultThumbnail}>
        {item.thumbnail_url || item.photo_url ? (
          <Image 
            source={{ uri: item.thumbnail_url || item.photo_url || '' }} 
            style={styles.thumbnailImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <MaterialIcons 
              name={item.type === 'photo' ? 'image' : 'play-circle-filled'} 
              size={48} 
              color={theme.colors.text.tertiary} 
            />
          </View>
        )}
        {item.type !== 'photo' && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {item.type === 'reel' ? 'Reel' : 'Video'}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        {item.user_profiles && (
          <View style={styles.channelInfo}>
            <Image 
              source={{ uri: item.user_profiles.avatar_url || 'https://via.placeholder.com/30' }} 
              style={styles.channelAvatar}
              contentFit="cover"
            />
            <Text style={styles.channelName} numberOfLines={1}>
              {item.user_profiles.username}
            </Text>
          </View>
        )}
        
        {item.views_count !== undefined && (
          <Text style={styles.resultMeta}>
            {item.views_count.toLocaleString()} views
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color={theme.colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos, channels, keywords..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                activeFilter === filter.id && styles.filterButtonActive,
              ]}
              onPress={() => setActiveFilter(filter.id as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.id && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchQuery.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search" size={80} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyText}>Search for videos, channels, and more</Text>
            <Text style={styles.emptySubtext}>Find content by keywords, titles, or creators</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={80} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>Try different keywords or filters</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={renderResult}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  backButton: {
    marginRight: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    padding: 0,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  filterText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  filterTextActive: {
    color: '#fff',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  resultsList: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  resultItem: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  resultThumbnail: {
    width: 140,
    height: 80,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: 6,
  },
  channelAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  channelName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  resultMeta: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
});
