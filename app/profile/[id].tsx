import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { userProfileApi, reelsApi, videosApi, photosApi, liveApi, savedApi } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TabType = 'reels' | 'video' | 'live' | 'photo' | 'save';

export default function ProfileDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const screenWidth = 400; // fallback width
  const itemWidth = screenWidth / 3;

  const [activeTab, setActiveTab] = useState<TabType>('reels');
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    name: 'Loading...',
    username: '@loading',
    bio: '',
    coverImage: 'https://picsum.photos/seed/cover/1080/400',
    profileImage: 'https://picsum.photos/seed/profile/300/300',
    website: '',
    location: ''
  });

  const [stats, setStats] = useState({
    posts: 0,
    supporters: 0,
    supporting: 0,
  });

  const [photos, setPhotos] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadUserProfile(id);
      loadUserContent(id);
    }
  }, [id]);

  const loadUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      
      // For demo purposes, if id is 'demo', show demo profile
      if (userId === 'demo') {
        setProfileData({
          name: 'Kronop Demo',
          username: '@kronop_demo',
          bio: 'This is a demo profile. Here you can see how app works.',
          coverImage: 'https://picsum.photos/seed/kronop_cover/1080/400',
          profileImage: 'https://picsum.photos/seed/kronop_profile/300/300',
          website: '',
          location: 'India'
        });
        setStats({
          posts: 0,
          supporters: 0,
          supporting: 0,
        });
        setLoading(false);
        return;
      }

      // Try to get user profile (mock for now)
      setProfileData({
        name: 'User Profile',
        username: `@user_${userId}`,
        bio: 'User bio here',
        coverImage: 'https://picsum.photos/seed/cover/1080/400',
        profileImage: 'https://picsum.photos/seed/profile/300/300',
        website: '',
        location: 'Location'
      });
      
      setStats({
        posts: 0,
        supporters: 0,
        supporting: 0,
      });
      
    } catch (error: any) {
      console.error('❌ Profile load error:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadUserContent = async (userId: string) => {
    try {
      // Load content (mock empty for now)
      setPhotos([]);
      setVideos([]);
      setReels([]);
      setLiveSessions([]);
      setSavedItems([]);
    } catch (error: any) {
      console.error('❌ Content load error:', error);
    }
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeScreen>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'reels':
        return reels.length === 0 ? (
          <View style={styles.emptyContentContainer}>
            <MaterialIcons name="movie" size={60} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyContentText}>No reels yet</Text>
            <Text style={styles.emptyContentSubtext}>Create your first reel</Text>
          </View>
        ) : (
          <View style={styles.reelsGrid}>
            {reels.map((reel) => (
              <TouchableOpacity 
                key={reel.id} 
                style={[styles.reelItem, { width: itemWidth }]}
              >
                <Image 
                  source={{ uri: reel.thumbnail_url || 'https://picsum.photos/400/700' }} 
                  style={styles.reelImage} 
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'video':
        return videos.length === 0 ? (
          <View style={styles.emptyContentContainer}>
            <MaterialIcons name="videocam" size={60} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyContentText}>No videos yet</Text>
            <Text style={styles.emptyContentSubtext}>Upload your first video</Text>
          </View>
        ) : (
          <View style={styles.videosGrid}>
            {videos.map((video) => (
              <TouchableOpacity 
                key={video.id} 
                style={[styles.videoItem, { width: itemWidth }]}
              >
                <Image 
                  source={{ uri: video.thumbnail_url || 'https://picsum.photos/400' }} 
                  style={styles.videoImage} 
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'live':
        return liveSessions.length === 0 ? (
          <View style={styles.emptyContentContainer}>
            <MaterialIcons name="live-tv" size={60} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyContentText}>No live sessions yet</Text>
            <Text style={styles.emptyContentSubtext}>Go live to connect with your audience</Text>
          </View>
        ) : (
          <View style={styles.liveGrid}>
            {liveSessions.map((live) => (
              <TouchableOpacity 
                key={live.id} 
                style={[styles.liveItem, { width: itemWidth }]}
              >
                <Image 
                  source={{ uri: live.thumbnail_url || 'https://picsum.photos/400' }} 
                  style={styles.liveImage} 
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'photo':
        return photos.length === 0 ? (
          <View style={styles.emptyContentContainer}>
            <MaterialIcons name="photo-library" size={60} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyContentText}>No photos yet</Text>
            <Text style={styles.emptyContentSubtext}>Upload your first photo to get started</Text>
          </View>
        ) : (
          <View style={styles.photosGrid}>
            {photos.map((photo) => (
              <TouchableOpacity 
                key={photo.id} 
                style={[styles.photoItem, { width: itemWidth }]}
              >
                <Image 
                  source={{ uri: photo.url || 'https://picsum.photos/400' }} 
                  style={styles.photoImage} 
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'save':
        return savedItems.length === 0 ? (
          <View style={styles.emptyContentContainer}>
            <MaterialIcons name="bookmark-border" size={60} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyContentText}>No saved items yet</Text>
            <Text style={styles.emptyContentSubtext}>Save posts you want to revisit later</Text>
          </View>
        ) : (
          <View style={styles.savedGrid}>
            {savedItems.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.savedItem, { width: itemWidth }]}
              >
                <Image 
                  source={{ uri: item.thumbnail_url || item.url || 'https://picsum.photos/400' }} 
                  style={styles.savedImage} 
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeScreen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.username}>{profileData.username}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconButton}>
              <Ionicons name="share-outline" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.coverContainer}>
          <Image source={{ uri: profileData.coverImage }} style={styles.coverImage} contentFit="cover" />
        </View>

        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          {/* Profile Image */}
          <View style={styles.profileImageWrapper}>
            <Image source={{ uri: profileData.profileImage }} style={styles.profileImage} contentFit="cover" />
          </View>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.supporters.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Supporters</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.supporting}</Text>
              <Text style={styles.statLabel}>Supporting</Text>
            </View>
          </View>

          {/* Bio and Info */}
          <Text style={styles.name}>{profileData.name}</Text>
          <Text style={styles.bioText}>{profileData.bio}</Text>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.infoText}>{profileData.location}</Text>
          </View>
          
          {profileData.website && (
            <TouchableOpacity style={styles.infoRow}>
              <MaterialIcons name="link" size={16} color={theme.colors.text.secondary} />
              <Text style={[styles.infoText, styles.websiteText]}>{profileData.website}</Text>
            </TouchableOpacity>
          )}

          {/* Action Button */}
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'reels', icon: 'movie', label: 'Reels' },
            { key: 'video', icon: 'smart-display', label: 'Video' },
            { key: 'live', icon: 'live-tv', label: 'Live' },
            { key: 'photo', icon: 'photo-library', label: 'Photo' },
            { key: 'save', icon: 'bookmark-border', label: 'Save' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as TabType)}
            >
              <MaterialIcons
                name={tab.icon as any}
                size={24}
                color={activeTab === tab.key ? theme.colors.text.primary : theme.colors.text.secondary}
              />
              <View style={activeTab === tab.key && styles.activeTabIndicator} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Grid */}
        {renderContent()}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  username: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerIconButton: {
    padding: theme.spacing.xs,
  },
  coverContainer: {
    height: 200,
    backgroundColor: theme.colors.background.secondary,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  profileSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  profileImageWrapper: {
    alignSelf: 'center',
    marginTop: -50,
    marginBottom: theme.spacing.lg,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: theme.colors.background.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  name: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  bioText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  websiteText: {
    color: theme.colors.primary.main,
  },
  followButton: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'center',
    marginTop: theme.spacing.md,
  },
  followButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary.main,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '50%',
    transform: [{ translateX: -1 }],
    width: 2,
    height: 2,
    backgroundColor: theme.colors.primary.main,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyContentText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptyContentSubtext: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
  },
  reelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.sm,
  },
  reelItem: {
    aspectRatio: 9/16,
    marginBottom: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  reelImage: {
    width: '100%',
    height: '100%',
  },
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.sm,
  },
  videoItem: {
    aspectRatio: 16/9,
    marginBottom: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  videoImage: {
    width: '100%',
    height: '100%',
  },
  liveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.sm,
  },
  liveItem: {
    aspectRatio: 16/9,
    marginBottom: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  liveImage: {
    width: '100%',
    height: '100%',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.sm,
  },
  photoItem: {
    aspectRatio: 1,
    marginBottom: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  savedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.sm,
  },
  savedItem: {
    aspectRatio: 1,
    marginBottom: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  savedImage: {
    width: '100%',
    height: '100%',
  },
});
