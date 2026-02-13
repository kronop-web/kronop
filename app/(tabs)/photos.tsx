import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { useSWRContent } from '../../hooks/swr';
import { useRouter } from 'expo-router';
import ShayariCard from '../../components/feature/Shayari';
import UrlValidationService from '../../services/urlValidationService';

interface Photo {
  id: string;
  user_id: string;
  title: string;
  description: string;
  photo_url: string;
  category: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  user_profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface ShayariPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  shayari_text: string;
  shayari_author: string;
  category: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  user_profiles?: {
    username: string;
    avatar_url: string;
  };
}

export default function PhotosScreen() {
  const router = useRouter();
  const { data: swrPhotos, loading, refresh } = useSWRContent('Photo', 1, 50);
  const { data: swrShayariPhotos, loading: shayariLoading, refresh: refreshShayari } = useSWRContent('ShayariPhoto', 1, 50);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'nature', 'people', 'food', 'travel', 'architecture', 'animals', 'love', 'sad', 'romantic', 'motivation'];

  const photos: Photo[] = Array.isArray(swrPhotos) ? swrPhotos : [];
  const shayariPhotos: ShayariPhoto[] = Array.isArray(swrShayariPhotos) ? swrShayariPhotos : [];

  // Mixed Feed Logic: 4 photos + 1 shayari
  const createMixedFeed = () => {
    const mixedFeed: any[] = [];
    const filteredPhotos = selectedCategory === 'all' 
      ? photos 
      : photos.filter(p => p.category === selectedCategory);
    const filteredShayariPhotos = selectedCategory === 'all' 
      ? shayariPhotos 
      : shayariPhotos.filter(p => p.category === selectedCategory);

    let photoIndex = 0;
    let shayariIndex = 0;

    while (photoIndex < filteredPhotos.length || shayariIndex < filteredShayariPhotos.length) {
      // Add 4 photos
      for (let i = 0; i < 4 && photoIndex < filteredPhotos.length; i++) {
        mixedFeed.push({
          type: 'photo',
          data: filteredPhotos[photoIndex]
        });
        photoIndex++;
      }

      // Add 1 shayari if available
      if (shayariIndex < filteredShayariPhotos.length) {
        mixedFeed.push({
          type: 'shayari',
          data: filteredShayariPhotos[shayariIndex]
        });
        shayariIndex++;
      }
    }

    return mixedFeed;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshShayari()]);
    setRefreshing(false);
  };

  const mixedFeed = createMixedFeed();

  const renderMixedItem = ({ item, index }: { item: any; index: number }) => {
    // Fix URLs in content data
    const fixedItem = UrlValidationService.fixContentUrls(item.data);
    
    if (item.type === 'photo') {
      return (
        <TouchableOpacity style={styles.photoCard} activeOpacity={0.9}>
          <Image 
            source={{ uri: fixedItem.photo_url || 'https://via.placeholder.com/40' }} 
            style={styles.photoImage} 
            contentFit="cover"
            onLoad={() => console.log('[PHOTOS_SCREEN]: Photo image loaded:', fixedItem.photo_url)}
            onError={(error) => console.error('[PHOTOS_SCREEN]: Photo image failed to load:', error)}
          />
          <View style={styles.photoInfo}>
            <Text style={styles.photoTitle} numberOfLines={1}>{fixedItem.title}</Text>
            {fixedItem.user_profiles && (
              <View style={styles.photoMeta}>
                <Image 
                  source={{ uri: fixedItem.user_profiles.avatar_url || 'https://via.placeholder.com/40' }} 
                  style={styles.userAvatar} 
                  contentFit="cover"
                />
                <Text style={styles.username}>{fixedItem.user_profiles.username}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    } else {
      return (
        <ShayariCard
          shayari_text={item.data.shayari_text}
          shayari_author={item.data.shayari_author}
          background_image={item.data.photo_url}
          isPhotoFeed={true}
          onPress={() => router.push({
            pathname: '/photos/[id]',
            params: { id: item.data?.id?.toString() || '' }
          })}
        />
      );
    }
  };

  if (loading) {
    return (
      <SafeScreen edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (mixedFeed.length === 0) {
    return (
      <SafeScreen edges={['top']}>
        <View style={styles.listEmptyContainer}>
          <MaterialIcons name="photo-library" size={80} color={theme.colors.text.tertiary} />
          <Text style={styles.listEmptyTitle}>No Photos Yet</Text>
          <Text style={styles.listEmptyText}>Be the first to share your moments</Text>
          <TouchableOpacity 
            style={styles.listEmptyUploadButton}
            onPress={() => router.push('/upload')}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.listEmptyUploadButtonText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Photos</Text>
        <TouchableOpacity 
          onPress={() => router.push('/upload')}
          style={styles.uploadButton}
        >
          <MaterialIcons name="add-circle" size={28} color={theme.colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipActive
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === cat && styles.categoryTextActive
            ]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={mixedFeed}
        renderItem={renderMixedItem}
        keyExtractor={(item, index) => `${item.type}-${item.data.id}-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.listEmptyContainer}>
            <MaterialIcons name="photo-library" size={80} color={theme.colors.text.tertiary} />
            <Text style={styles.listEmptyTitle}>No Photos Yet</Text>
            <Text style={styles.listEmptyText}>Upload your first photo to get started</Text>
            <TouchableOpacity 
              style={styles.listEmptyUploadButton}
              onPress={() => router.push('/upload')}
            >
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.listEmptyUploadButtonText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>
        }
      />

    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  uploadButton: {
    padding: theme.spacing.xs,
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  categoriesContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
    marginRight: theme.spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary.main,
  },
  categoryText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  categoryTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: theme.spacing.xs,
  },
  row: {
    justifyContent: 'space-between',
  },
  photoCard: {
    width: '49%',
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.secondary,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: 200,
  },
  photoInfo: {
    padding: theme.spacing.sm,
  },
  photoTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  photoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: theme.borderRadius.full,
  },
  username: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
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
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  uploadEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.borderRadius.full,
  },
  uploadEmptyText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#fff',
  },
  
  // Tabs for Photos and Shayari Photos
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary.main,
  },
  tabText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  activeTabText: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // Shayari Photo Card Styles
  shayariPhotoCard: {
    width: '49%',
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.secondary,
    overflow: 'hidden',
  },
  shayariPhotoImage: {
    width: '100%',
    height: 200,
  },
  shayariOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  shayariBracket: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    width: '90%',
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shayariText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // ListEmptyComponent Styles
  listEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  listEmptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
  },
  listEmptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  listEmptyUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  listEmptyUploadButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#fff',
  },
  shayariAuthor: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  shayariPhotoInfo: {
    padding: theme.spacing.sm,
  },
  shayariPhotoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
});
