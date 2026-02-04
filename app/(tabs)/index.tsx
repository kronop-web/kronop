import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, TextInput, ActivityIndicator, Platform, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { VideoCard, StoryViewer } from '../../components/feature';
import { StorySection } from '../../components/feature/StorySection';
import { useVideo } from '../../hooks/useVideo';
import { theme } from '../../constants/theme';
import { useAlert } from '../../template';
import { Story } from '../../types/story';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { photosApi, storiesApi } from '../../services/api';
import StatusBarOverlay from '../../components/common/StatusBarOverlay';

// Photo categories - TEXT ONLY, HORIZONTAL SCROLL WITH PROPER FILTERING
const PHOTO_CATEGORIES = [
  { id: 'all', name: 'All', keywords: [] },
  { id: 'girls', name: 'Girls', keywords: ['girl', 'girls', 'woman', 'women', 'female', 'lady'] },
  { id: 'boys', name: 'Boys', keywords: ['boy', 'boys', 'man', 'men', 'male', 'guy'] },
  { id: 'children', name: 'Children', keywords: ['child', 'children', 'kid', 'kids', 'baby', 'toddler'] },
  { id: 'family', name: 'Family', keywords: ['family', 'families', 'parents', 'relatives', 'together'] },
  { id: 'house', name: 'House', keywords: ['house', 'home', 'building', 'architecture', 'interior'] },
  { id: 'nature', name: 'Nature', keywords: ['nature', 'forest', 'tree', 'trees', 'landscape', 'outdoor'] },
  { id: 'animals', name: 'Animals', keywords: ['animal', 'animals', 'dog', 'cat', 'bird', 'pet', 'wildlife'] },
  { id: 'flowers', name: 'Flowers', keywords: ['flower', 'flowers', 'rose', 'bloom', 'garden', 'floral'] },
  { id: 'mountains', name: 'Mountains', keywords: ['mountain', 'mountains', 'hill', 'peak', 'summit'] },
  { id: 'food', name: 'Food', keywords: ['food', 'meal', 'dish', 'cuisine', 'cooking', 'restaurant'] },
  { id: 'travel', name: 'Travel', keywords: ['travel', 'vacation', 'trip', 'journey', 'destination'] },
  { id: 'sports', name: 'Sports', keywords: ['sport', 'sports', 'game', 'fitness', 'exercise', 'athlete'] },
  { id: 'fashion', name: 'Fashion', keywords: ['fashion', 'style', 'clothing', 'outfit', 'dress', 'designer'] },
  { id: 'cars', name: 'Cars', keywords: ['car', 'cars', 'vehicle', 'automobile', 'auto', 'driving'] },
  { id: 'technology', name: 'Technology', keywords: ['tech', 'technology', 'computer', 'phone', 'gadget', 'device'] },
];

// Grouped stories by user
interface GroupedStory {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: Story[];
  latestTimestamp: string;
}

export default function HomeScreen() {
  const { videos, loading } = useVideo();
  const router = useRouter();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets(); // Get safe area insets
  const [searchQuery, setSearchQuery] = useState('');

  // Stories state - Grouped by user
  const [groupedStories, setGroupedStories] = useState<GroupedStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<Story[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  // Photo categories state - Vertical with infinite scroll
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryPhotos, setCategoryPhotos] = useState<any[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);
  
  // Story upload loading state
  const [uploadingStory, setUploadingStory] = useState(false);

  // Load and group stories by user
  const loadStories = async () => {
    setStoriesLoading(true);
    try {
      // Use the new story service for grouped stories
      const { storyService } = await import('../../services/storyService');
      const result = await storyService.getGroupedStories();
      
      
      if (result.success) {
        setGroupedStories(result.data as any);
      } else {
        // Fallback to mock data if API fails
        const mockStories = [
          {
            userId: 'user1',
            userName: 'John Doe',
            userAvatar: 'https://via.placeholder.com/100',
            stories: [
              {
                id: 's1',
                userId: 'user1',
                userName: 'John Doe',
                userAvatar: 'https://via.placeholder.com/100',
                imageUrl: 'https://picsum.photos/1080x1920?random=1',
                timestamp: new Date().toISOString(),
                viewed: false
              }
            ],
            latestTimestamp: new Date().toISOString()
          },
          {
            userId: 'user2',
            userName: 'Jane Smith',
            userAvatar: 'https://via.placeholder.com/100',
            stories: [
              {
                id: 's2',
                userId: 'user2',
                userName: 'Jane Smith',
                userAvatar: 'https://via.placeholder.com/100',
                imageUrl: 'https://picsum.photos/1080x1920?random=2',
                timestamp: new Date().toISOString(),
                viewed: true
              }
            ],
            latestTimestamp: new Date().toISOString()
          }
        ];
        setGroupedStories(mockStories);
      }
    } catch (error) {
      console.error('HomeScreen: Failed to load stories:', error);
      // Silent fail with empty array
      setGroupedStories([]);
    } finally {
      setStoriesLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const handleStoryPress = async (storyGroup: GroupedStory, storyIndex: number = 0) => {
    if (storyGroup.stories[0]?.id === 'add-story') {
      // Add new story
      await handleAddStory();
    } else {
      // View user's stories
      setSelectedStoryGroup(storyGroup.stories);
      setSelectedStoryIndex(storyIndex);
      setStoryViewerVisible(true);
    }
  };

  // Add Story Handler
  const handleAddStory = async () => {
    if (uploadingStory) return;
    
    try {
      setUploadingStory(true);
      
      // Request media library permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showAlert('Permission Required', 'Media library permission is needed to upload stories');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [9, 16], // Story aspect ratio
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // TODO: Upload to backend when ready
        showAlert('Success', 'Story selected! Upload functionality will be available when backend is ready.');
      }
      
    } catch (error: any) {
      console.error('Story upload error:', error);
      showAlert('Error', error.message || 'Failed to upload story');
    } finally {
      setUploadingStory(false);
    }
  };

  const handleImageSearch = () => {
    router.push('/image-search');
  };

  const handleCameraSearch = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showAlert('Permission Required', 'Camera permission is needed for camera search');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        showAlert('Camera Search', 'Searching with camera image...');
      }
    } catch (error: any) {
      console.error('Camera search error:', error);
      showAlert('Error', error.message || 'Failed to open camera');
    }
  };

  const handleTextSearch = () => {
    if (searchQuery.trim()) {
      router.push('/search');
    }
  };

  const handleCategoryPress = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPhotosPage(1);
    setPhotosLoading(true);

    try {
      const result = await photosApi.getPhotos();
      if (result) {
        if (categoryId === 'all') {
          setCategoryPhotos(result);
          setHasMorePhotos(result.length > 20);
        } else {
          // Get keywords for selected category
          const category = PHOTO_CATEGORIES.find(cat => cat.id === categoryId);
          const keywords = category?.keywords || [categoryId];
          
          // Filter by category with keyword matching
          const filtered = result.filter((photo: any) => {
            const categoryMatch = photo.category?.toLowerCase() === categoryId.toLowerCase();
            const tagMatch = photo.tags?.some((tag: string) => 
              keywords.some(keyword => tag.toLowerCase().includes(keyword.toLowerCase()))
            );
            const titleMatch = keywords.some(keyword => 
              photo.title?.toLowerCase().includes(keyword.toLowerCase())
            );
            const descMatch = keywords.some(keyword => 
              photo.description?.toLowerCase().includes(keyword.toLowerCase())
            );
            
            return categoryMatch || tagMatch || titleMatch || descMatch;
          });
          
          setCategoryPhotos(filtered);
          setHasMorePhotos(filtered.length > 20);
        }
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setPhotosLoading(false);
    }
  };

  const loadMorePhotos = async () => {
    if (!hasMorePhotos || photosLoading || !selectedCategory) return;
    
    // Simulated pagination - in real app, would fetch from backend
    setPhotosPage(prev => prev + 1);
  };

  const renderPhotoItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.photoItem} activeOpacity={0.8}>
      <Image 
        source={{ uri: item.photo_url }} 
        style={styles.photoImage}
        contentFit="cover"
      />
      <View style={styles.photoOverlay}>
        <Text style={styles.photoTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.photoMeta}>
          <View style={styles.photoStat}>
            <MaterialIcons name="favorite" size={14} color="#fff" />
            <Text style={styles.photoStatText}>{item.likes_count || 0}</Text>
          </View>
          <Text style={styles.photoUser}>{item.user_profiles?.username || 'Unknown'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBarOverlay style="light" backgroundColor="#000000" />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.logo}>Kronop</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={handleImageSearch}
              hitSlop={theme.hitSlop.md}
              activeOpacity={0.7}
              style={styles.headerButton}
            >
              <MaterialIcons name="image-search" size={theme.iconSize.lg} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/chat')}
              hitSlop={theme.hitSlop.md}
              activeOpacity={0.7}
              style={styles.chatButton}
            >
              <MaterialIcons name="chat-bubble" size={theme.iconSize.lg} color={theme.colors.primary.main} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/notifications')}
              hitSlop={theme.hitSlop.md}
              activeOpacity={0.7}
              style={styles.notificationButton}
            >
              <MaterialIcons name="notifications" size={theme.iconSize.lg} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/upload')} 
              hitSlop={theme.hitSlop.md}
              activeOpacity={0.7}
              style={styles.uploadButton}
            >
              <MaterialIcons name="add-circle" size={theme.iconSize.xl} color={theme.colors.primary.main} />
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={theme.colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos, images..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleTextSearch}
            returnKeyType="search"
          />
          <TouchableOpacity 
            onPress={handleImageSearch}
            hitSlop={theme.hitSlop.sm}
            activeOpacity={0.7}
            style={styles.searchAction}
          >
            <MaterialIcons name="image" size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleCameraSearch}
            hitSlop={theme.hitSlop.sm}
            activeOpacity={0.7}
            style={styles.searchAction}
          >
            <MaterialIcons name="camera-alt" size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={videos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <VideoCard video={item} onPress={() => router.push(`/video/${item.id}`)} />
        )}
        ListHeaderComponent={
          <>
            {/* Stories Section - Simple Horizontal Boxes */}
            <StorySection
              stories={groupedStories}
              loading={storiesLoading}
              onStoryPress={handleStoryPress}
            />

            {/* Photo Categories Section - HORIZONTAL SCROLL, TEXT ONLY */}
            <View style={styles.photoCategoriesContainer}>
              <Text style={styles.sectionTitle}>Photo Categories</Text>
              
              {/* Horizontal Scrollable Text-Only Buttons */}
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={PHOTO_CATEGORIES}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === item.id && styles.categoryButtonActive
                    ]}
                    onPress={() => handleCategoryPress(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === item.id && styles.categoryButtonTextActive
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.categoriesScrollContainer}
              />

              {/* Inline Photos Display - Infinite Scroll */}
              {selectedCategory && (
                <View style={styles.inlinePhotosContainer}>
                  {photosLoading && categoryPhotos.length === 0 ? (
                    <View style={styles.photosLoadingContainer}>
                      <ActivityIndicator size="large" color={theme.colors.primary.main} />
                      <Text style={styles.loadingText}>Loading photos...</Text>
                    </View>
                  ) : categoryPhotos.length === 0 ? (
                    <View style={styles.emptyPhotosContainer}>
                      <MaterialIcons name="photo-library" size={60} color={theme.colors.text.tertiary} />
                      <Text style={styles.emptyPhotosText}>No photos in this category yet</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={categoryPhotos}
                      keyExtractor={(item) => item.id}
                      renderItem={renderPhotoItem}
                      numColumns={2}
                      scrollEnabled={false}
                      columnWrapperStyle={styles.photoRow}
                      contentContainerStyle={styles.photosGrid}
                      onEndReached={loadMorePhotos}
                      onEndReachedThreshold={0.5}
                      ListFooterComponent={
                        photosLoading ? (
                          <ActivityIndicator size="small" color={theme.colors.primary.main} style={{ marginVertical: 20 }} />
                        ) : null
                      }
                    />
                  )}
                </View>
              )}
            </View>
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Story Viewer Modal */}
      <StoryViewer
        visible={storyViewerVisible}
        stories={selectedStoryGroup}
        initialIndex={selectedStoryIndex}
        onClose={() => setStoryViewerVisible(false)}
        onRefresh={loadStories}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  logo: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerButton: {
    padding: theme.spacing.xs,
  },
  chatButton: {
    padding: theme.spacing.xs,
  },
  notificationButton: {
    padding: theme.spacing.xs,
  },
  uploadButton: {
    padding: theme.spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.full,
    height: 40,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
    padding: 0,
  },
  searchAction: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },

  // Photo Categories - HORIZONTAL SCROLL, TEXT ONLY
  photoCategoriesContainer: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  categoriesScrollContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  categoryButtonActive: {
    // No background, only text color will change
  },
  categoryButtonText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  categoryButtonTextActive: {
    color: '#FF4444', // Red color for selected category
    fontWeight: theme.typography.fontWeight.bold,
  },

  inlinePhotosContainer: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  photosLoadingContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  emptyPhotosContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyPhotosText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  photosGrid: {
    paddingBottom: theme.spacing.md,
  },
  photoRow: {
    gap: theme.spacing.sm,
  },
  photoItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: theme.spacing.sm,
  },
  photoTitle: {
    color: '#fff',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: 4,
  },
  photoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoStatText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.xs,
  },
  photoUser: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: theme.typography.fontSize.xs,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
});
