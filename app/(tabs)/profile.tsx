import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Alert, ActivityIndicator, ActionSheetIOS, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { API_BASE_URL } from '../../constants/network';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { userProfileApi, reelsApi, videosApi, photosApi, liveApi, savedApi } from '../../services/api';
import userContentService, { ContentType } from '../../services/userContentService';

type TabType = 'reels' | 'video' | 'live' | 'photo' | 'save';

// Google Maps सेवा फ़ंक्शन
const googleMapsService = {
  async getUserLocation(): Promise<{ address: string } | null> {
    try {
      const BACKEND_URL = API_BASE_URL;
      const token = await AsyncStorage.getItem('supabase_token') || await AsyncStorage.getItem('user_token');
      const response = await fetch(`${BACKEND_URL}/maps/location`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  },

  async updateLocation(address: string): Promise<{ success: boolean }> {
    try {
      const BACKEND_URL = API_BASE_URL;
      const token = await AsyncStorage.getItem('supabase_token') || await AsyncStorage.getItem('user_token');
      
      const response = await fetch(`${BACKEND_URL}/maps/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update location error:', error);
      return { success: false };
    }
  }
};

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('reels');
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = screenWidth / 3;

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('Loading...');

  const [profileData, setProfileData] = useState({
    name: 'Simran Kumari',
    username: '@simran_kumari_964_',
    bio: 'Hello Friend Follow For Amazing Dance Video 😍❤️',
    coverImage: 'https://picsum.photos/seed/cover/1080/400',
    profileImage: 'https://picsum.photos/seed/profile/300/300',
    website: 'https://www.instagram.com/simran_kumari_964_?igsh=MWpnd3llanlqejBqZQ==',
    location: 'Auraiya'
  });

  const [stats, setStats] = useState({
    posts: 1400,
    supporters: 117000,
    supporting: 13,
  });

  const [supportersModalVisible, setSupportersModalVisible] = useState(false);
  const [supportingModalVisible, setSupportingModalVisible] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showUserDataModal, setShowUserDataModal] = useState(false);
  const [supportersList, setSupportersList] = useState<any[]>([]);
  const [supportingList, setSupportingList] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);

  const loadStoredCoverPhoto = async () => {
    try {
      const storedCoverImage = await AsyncStorage.getItem('user_cover_image');
      if (storedCoverImage) {
        setProfileData(prev => ({...prev, coverImage: storedCoverImage}));
      }
    } catch (error) {
      console.error('Error loading cover photo:', error);
    }
  };

  const saveCoverPhoto = async (url: string) => {
    try {
      await AsyncStorage.setItem('user_cover_image', url);
    } catch (error) {
      console.error('Error saving cover photo:', error);
    }
  };

  const loadUserLocation = async () => {
    try {
      const locationData = await googleMapsService.getUserLocation();
      if (locationData && locationData.address) {
        setUserLocation(locationData.address);
        setProfileData(prev => ({
          ...prev,
          location: locationData.address
        }));
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  useEffect(() => {
    loadUserProfile();
    loadUserContent();
    loadStoredCoverPhoto();
    loadUserLocation();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      const result = await userProfileApi.getCurrentProfile();
      
      if (result.error) {
        console.error('❌ Profile load error:', result.error);
        Alert.alert('Error', result.error);
        return;
      }
      
      if (result.data) {
        setProfileData({
          name: result.data.full_name || 'Simran Kumari',
          username: result.data.username ? `@${result.data.username}` : '@simran_kumari_964_',
          bio: result.data.bio || 'Hello Friend Follow For Amazing Dance Video 😍❤️',
          coverImage: result.data.cover_image || 'https://picsum.photos/seed/cover/1080/400',
          profileImage: result.data.avatar_url || 'https://via.placeholder.com/100',
          website: result.data.website || 'https://www.instagram.com/simran_kumari_964_?igsh=MWpnd3llanlqejBqZQ==',
          location: result.data.location || 'Auraiya'
        });
        
        if (result.data.cover_image) {
          await saveCoverPhoto(result.data.cover_image);
        }
      } else {
        console.warn('⚠️ No profile data returned');
        Alert.alert('Warning', 'Profile data not found. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Profile load exception:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadUserContent = async () => {
    try {
      
      // Load PUBLIC content
      const photosResult = await photosApi.getPhotos();
      if (photosResult && photosResult.length > 0) {
        setPhotos(photosResult);
      } else {
        setPhotos([]);
      }

      const videosResult = await videosApi.getVideos();
      if (videosResult && videosResult.length > 0) {
        setVideos(videosResult);
      } else {
        setVideos([]);
      }

      const reelsResult = await reelsApi.getReels();
      if (reelsResult && reelsResult.length > 0) {
        setReels(reelsResult);
      } else {
        setReels([]);
      }

      // Load live sessions
      try {
        const liveResult = await liveApi.getLive();
        if (liveResult && liveResult.length > 0) {
          setLiveSessions(liveResult);
        } else {
          setLiveSessions([]);
        }
      } catch (liveError) {
        setLiveSessions([]);
      }

      // Load saved items
      try {
        const savedResult = await savedApi.getSaved();
        if (savedResult && savedResult.length > 0) {
          setSavedItems(savedResult);
        }
      } catch (error) {
        setSavedItems([]);
      }

      // Load supporters and supporting stats
      await loadSupportStats();
    } catch (error: any) {
      console.error('❌ Public content load error:', error);
    }
  };

  const loadSupportStats = async () => {
    try {
      // Mock data for supporters/supporting
      const mockSupporters = [
        { id: 1, username: 'ghansyam_sharma', name: 'Ghansyam Sharma', avatar_url: 'https://picsum.photos/seed/ghansyam/50/50' },
        { id: 2, username: 'user2', name: 'User Two', avatar_url: 'https://picsum.photos/seed/user2/50/50' },
        { id: 3, username: 'user3', name: 'User Three', avatar_url: 'https://picsum.photos/seed/user3/50/50' },
      ];
      
      const mockSupporting = [
        { id: 1, username: 'celebrity1', name: 'Celebrity One', avatar_url: 'https://picsum.photos/seed/celeb1/50/50' },
        { id: 2, username: 'celebrity2', name: 'Celebrity Two', avatar_url: 'https://picsum.photos/seed/celeb2/50/50' },
      ];

      setSupportersList(mockSupporters);
      setSupportingList(mockSupporting);
    } catch (error) {
      console.error('Failed to load support stats:', error);
    }
  };

  const pickImage = async (type: 'profile' | 'cover') => {
    if (pickingImage || saving) return;
    
    try {
      setPickingImage(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos.');
        setPickingImage(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [3, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        setPickingImage(false);
        return;
      }

      if (result.assets[0]) {
        setSaving(true);
        
        const formData = new FormData();
        const asset = result.assets[0];
        
        const localUri = asset.uri;
        const filename = localUri.split('/').pop() || `${type}_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('image', {
          uri: localUri,
          name: filename,
          type: fileType,
        } as any);
        
        formData.append('userId', 'current');
        
        const uploadResult = await userProfileApi.uploadProfileImage(formData, type);

        if (uploadResult.data) {
          if (type === 'profile') {
            const updateResult = await userProfileApi.updateProfile({
              avatar_url: uploadResult.data,
            });
            
            if (updateResult.data) {
              setProfileData(prev => ({...prev, profileImage: uploadResult.data}));
              Alert.alert('Success', 'Profile image updated successfully!');
            }
          } else {
            const updateResult = await userProfileApi.updateProfile({
              cover_image: uploadResult.data,
            });
            
            if (updateResult.data) {
              setProfileData(prev => ({...prev, coverImage: uploadResult.data}));
              await saveCoverPhoto(uploadResult.data);
              Alert.alert('Success', 'Cover image updated successfully!');
            }
          }
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload image');
        }
        
        setSaving(false);
        setPickingImage(false);
      }
    } catch (error: any) {
      console.error('Image pick error:', error);
      setSaving(false);
      setPickingImage(false);
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      if (profileData.location) {
        await googleMapsService.updateLocation(profileData.location);
      }
      
      const result = await userProfileApi.updateProfile({
        username: profileData.username.replace('@', ''),
        full_name: profileData.name,
        bio: profileData.bio,
        website: profileData.website,
        cover_image: profileData.coverImage,
        location: profileData.location
      });

      if (result.error) {
        console.error('❌ Save error:', result.error);
        Alert.alert('Error', result.error || 'Failed to update profile');
        return;
      }

      if (result.data) {
        await saveCoverPhoto(profileData.coverImage);
        Alert.alert('Success', 'Profile updated successfully!');
        setEditModalVisible(false);
        
        await loadUserProfile();
        await loadUserContent();
      } else {
        console.warn('⚠️ No data returned after save');
        Alert.alert('Warning', 'Profile may not have been saved');
      }
    } catch (error: any) {
      console.error('❌ Save exception:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeScreen edges={['top']}>
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
                onPress={() => router.push({
                  pathname: '/profile/[contentType]',
                  params: { contentType: 'reels' }
                })}
              >
                <Image 
                  source={{ uri: reel.thumbnail_url || 'https://picsum.photos/400/700' }} 
                  style={styles.reelImage} 
                  contentFit="cover"
                />
                <View style={styles.reelOverlay}>
                  <MaterialIcons name="play-arrow" size={24} color="#fff" />
                </View>
                <View style={styles.reelStats}>
                  <View style={styles.reelStat}>
                    <MaterialIcons name="play-arrow" size={12} color="#fff" />
                    <Text style={styles.reelStatText}>{reel.views_count || 0}</Text>
                  </View>
                </View>
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
                onPress={() => router.push({
                  pathname: '/profile/[contentType]',
                  params: { contentType: 'videos' }
                })}
              >
                <Image 
                  source={{ uri: video.thumbnail_url || 'https://picsum.photos/400' }} 
                  style={styles.videoImage} 
                  contentFit="cover"
                />
                <View style={styles.videoOverlay}>
                  <MaterialIcons name="play-arrow" size={20} color="#fff" />
                  <Text style={styles.videoDuration}>
                    {Math.floor((video?.duration || 0) / 60)}:{((video?.duration || 0) % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
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
                onPress={() => router.push({
                  pathname: '/profile/[contentType]',
                  params: { contentType: 'live' }
                })}
              >
                <Image 
                  source={{ uri: live.thumbnail_url || 'https://picsum.photos/400' }} 
                  style={styles.liveImage} 
                  contentFit="cover"
                />
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
                <View style={styles.liveInfo}>
                  <Text style={styles.liveViewers}>{live.viewers_count || 0} watching</Text>
                </View>
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
                onPress={() => router.push({
                  pathname: '/profile/[contentType]',
                  params: { contentType: 'photos' }
                })}
              >
                <Image 
                  source={{ uri: photo.url || 'https://picsum.photos/400' }} 
                  style={styles.photoImage} 
                  contentFit="cover"
                />
                {photo.likes_count > 0 && (
                  <View style={styles.photoLikes}>
                    <MaterialIcons name="favorite" size={12} color="#fff" />
                    <Text style={styles.photoLikesText}>{photo.likes_count}</Text>
                  </View>
                )}
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
                onPress={() => router.push({
                  pathname: '/post/[id]',
                  params: { id: item?.id?.toString() || '' }
                })}
              >
                <Image 
                  source={{ uri: item.thumbnail_url || item.url || 'https://picsum.photos/400' }} 
                  style={styles.savedImage} 
                  contentFit="cover"
                />
                <View style={styles.savedIcon}>
                  <MaterialIcons name="bookmark" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeScreen edges={['top']}>
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editForm}>
            {/* Cover Photo Section - Added in Edit Modal */}
            <View style={styles.editSection}>
              <Text style={styles.sectionLabel}>Cover Photo</Text>
              <TouchableOpacity 
                style={styles.coverEdit} 
                onPress={() => pickImage('cover')}
                disabled={pickingImage || saving}
              >
                <Image source={{ uri: profileData.coverImage }} style={styles.coverPreview} contentFit="cover" />
                <View style={styles.editOverlay}>
                  <MaterialIcons name="edit" size={24} color="#fff" />
                  <Text style={styles.editText}>Change Cover</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.sectionLabel}>Profile Photo</Text>
              <View style={styles.profileImageEdit}>
                <TouchableOpacity 
                  onPress={() => pickImage('profile')}
                  disabled={pickingImage || saving}
                >
                  <Image source={{ uri: profileData.profileImage }} style={styles.profilePreview} contentFit="cover" />
                  <View style={styles.cameraIcon}>
                    <MaterialIcons name="camera-alt" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={profileData.name}
                onChangeText={(text) => setProfileData(prev => ({...prev, name: text}))}
                placeholder="Enter your full name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={profileData.username}
                onChangeText={(text) => setProfileData(prev => ({...prev, username: text}))}
                placeholder="@username"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={profileData.bio}
                onChangeText={(text) => setProfileData(prev => ({...prev, bio: text}))}
                placeholder="Tell about yourself..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={profileData.location}
                onChangeText={(text) => setProfileData(prev => ({...prev, location: text}))}
                placeholder="Enter your location"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={profileData.website}
                onChangeText={(text) => setProfileData(prev => ({...prev, website: text}))}
                placeholder="www.example.com"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setEditModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.username}>{profileData.username}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push('/help-center')}>
              <Ionicons name="help-circle-outline" size={26} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.coverContainer}>
          <Image source={{ uri: profileData.coverImage }} style={styles.coverImage} contentFit="cover" />
          <TouchableOpacity 
            style={styles.editCoverButton} 
            onPress={() => pickImage('cover')}
            disabled={pickingImage || saving}
          >
            <MaterialIcons name="edit" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          {/* Profile Image - Separated from stats row */}
          <View style={styles.profileImageWrapper}>
            <Image source={{ uri: profileData.profileImage }} style={styles.profileImage} contentFit="cover" />
            <TouchableOpacity 
              style={styles.editProfileImageButton} 
              onPress={() => pickImage('profile')}
              disabled={pickingImage || saving}
            >
              <MaterialIcons name="camera-alt" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Stats Row - BELOW Profile Image */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setSupportersModalVisible(true)}
            >
              <Text style={styles.statNumber}>{stats.supporters.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Supporters</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setSupportingModalVisible(true)}
            >
              <Text style={styles.statNumber}>{stats.supporting}</Text>
              <Text style={styles.statLabel}>Supporting</Text>
            </TouchableOpacity>
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

          {/* Action Button - Only Edit Profile */}
          <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs - Instagram Style */}
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

      {/* Supporters Modal */}
      <Modal visible={supportersModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Supporters</Text>
            <TouchableOpacity onPress={() => setSupportersModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.supportListScroll} showsVerticalScrollIndicator={false}>
            {supportersList.length === 0 ? (
              <View style={styles.emptySupport}>
                <MaterialIcons name="people-outline" size={60} color={theme.colors.text.tertiary} />
                <Text style={styles.emptySupportText}>No supporters yet</Text>
              </View>
            ) : (
              supportersList.map((supporter) => (
                <View key={supporter.id} style={styles.supportItem}>
                  <Image 
                    source={{ uri: supporter.avatar_url || 'https://via.placeholder.com/50' }} 
                    style={styles.supportAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.supportInfo}>
                    <Text style={styles.supportName}>{supporter.username}</Text>
                    <Text style={styles.supportBio}>{supporter.name}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Supporting Modal */}
      <Modal visible={supportingModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Supporting</Text>
            <TouchableOpacity onPress={() => setSupportingModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.supportListScroll} showsVerticalScrollIndicator={false}>
            {supportingList.length === 0 ? (
              <View style={styles.emptySupport}>
                <MaterialIcons name="people-outline" size={60} color={theme.colors.text.tertiary} />
                <Text style={styles.emptySupportText}>Not supporting anyone yet</Text>
              </View>
            ) : (
              supportingList.map((supporting) => (
                <View key={supporting.id} style={styles.supportItem}>
                  <Image 
                    source={{ uri: supporting.avatar_url || 'https://via.placeholder.com/50' }} 
                    style={styles.supportAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.supportInfo}>
                    <Text style={styles.supportName}>{supporting.username}</Text>
                    <Text style={styles.supportBio}>{supporting.name}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Analytics Modal */}
      <Modal visible={showAnalyticsModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User Analytics</Text>
            <TouchableOpacity onPress={() => setShowAnalyticsModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.analyticsScroll} showsVerticalScrollIndicator={false}>
            {/* Days Active */}
            <View style={styles.analyticsSection}>
              <View style={styles.analyticsHeader}>
                <MaterialIcons name="calendar-today" size={24} color={theme.colors.primary.main} />
                <Text style={styles.analyticsSectionTitle}>Days Active</Text>
              </View>
              <Text style={styles.analyticsValue}>347 Days</Text>
              <Text style={styles.analyticsSubtext}>Since January 2025</Text>
            </View>

            {/* Total Stars */}
            <View style={styles.analyticsSection}>
              <View style={styles.analyticsHeader}>
                <MaterialIcons name="star" size={24} color="#FFD700" />
                <Text style={styles.analyticsSectionTitle}>Total Stars</Text>
              </View>
              <Text style={styles.analyticsValue}>25,847 Stars</Text>
              <Text style={styles.analyticsSubtext}>From all content</Text>
            </View>

            {/* Total Count */}
            <View style={styles.analyticsSection}>
              <View style={styles.analyticsHeader}>
                <MaterialIcons name="content-cut" size={24} color={theme.colors.primary.main} />
                <Text style={styles.analyticsSectionTitle}>Total Content Created</Text>
              </View>
              <View style={styles.contentCount}>
                <View style={styles.countItem}>
                  <Text style={styles.countNumber}>{reels.length}</Text>
                  <Text style={styles.countLabel}>Reels</Text>
                </View>
                <View style={styles.countItem}>
                  <Text style={styles.countNumber}>{videos.length}</Text>
                  <Text style={styles.countLabel}>Videos</Text>
                </View>
                <View style={styles.countItem}>
                  <Text style={styles.countNumber}>{photos.length}</Text>
                  <Text style={styles.countLabel}>Photos</Text>
                </View>
              </View>
            </View>

          </ScrollView>
        </View>
      </Modal>

      {/* User Data Modal */}
      <Modal visible={showUserDataModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Content Data</Text>
            <TouchableOpacity onPress={() => setShowUserDataModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.userDataContent}>
            <View style={styles.userDataHeader}>
              <MaterialIcons name="analytics" size={28} color="#FF0000" />
              <Text style={styles.userDataTitle}>Grand Total</Text>
            </View>
            
            <View style={styles.userDataStats}>
              <View style={styles.userDataStat}>
                <Ionicons name="star" size={24} color="#FFD700" />
                <Text style={styles.userDataNumber}>25,847</Text>
                <Text style={styles.userDataLabel}>Total Stars</Text>
              </View>
              
              <View style={styles.userDataStat}>
                <MaterialIcons name="comment" size={24} color="#4CAF50" />
                <Text style={styles.userDataNumber}>3,456</Text>
                <Text style={styles.userDataLabel}>Total Comments</Text>
              </View>
              
              <View style={styles.userDataStat}>
                <MaterialIcons name="share" size={24} color="#2196F3" />
                <Text style={styles.userDataNumber}>1,234</Text>
                <Text style={styles.userDataLabel}>Total Shares</Text>
              </View>
            </View>
            
            <View style={styles.userDataFooter}>
              <Text style={styles.userDataContentText}>1,400 Total Content</Text>
              <Text style={styles.userDataViewsText}>45,678 Total Views</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  // ... rest of the code remains the same ...
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.primary,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Cover Photo - FIXED: Separate section
  coverContainer: {
    width: '100%',
    height: 200, // Increased height for better visibility
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  editCoverButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center', // Center align everything
  },
  // Profile Image - Centered and above stats
  profileImageWrapper: {
    marginTop: -50, // This pulls the profile image up over the cover
    marginBottom: 16,
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.background.primary,
  },
  editProfileImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary.main,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background.primary,
  },
  // Stats Container - Below profile image
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  bioText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: 6,
  },
  websiteText: {
    color: theme.colors.primary.main,
  },
  // Edit Button - Centered
  editButton: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
    backgroundColor: theme.colors.background.primary,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    position: 'relative',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 2,
    backgroundColor: theme.colors.text.primary,
  },
  reelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reelItem: {
    aspectRatio: 9/16,
    padding: 1,
    position: 'relative',
  },
  reelImage: {
    width: '100%',
    height: '100%',
  },
  reelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  reelStats: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reelStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reelStatText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  videoItem: {
    aspectRatio: 1,
    padding: 1,
    position: 'relative',
  },
  videoImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  liveItem: {
    aspectRatio: 1,
    padding: 1,
    position: 'relative',
  },
  liveImage: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  liveInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  liveViewers: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoItem: {
    aspectRatio: 1,
    padding: 1,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoLikes: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoLikesText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  savedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  savedItem: {
    aspectRatio: 1,
    padding: 1,
    position: 'relative',
  },
  savedImage: {
    width: '100%',
    height: '100%',
  },
  savedIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  emptyContentContainer: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContentText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 12,
  },
  emptyContentSubtext: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  editForm: {
    flex: 1,
  },
  editSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  coverEdit: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  editText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileImageEdit: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  profilePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 16,
    backgroundColor: theme.colors.primary.main,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  bioInput: {
    minHeight: 80,
    paddingTop: 10,
  },
  formActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary.main,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  supportListScroll: {
    flex: 1,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  supportAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  supportInfo: {
    flex: 1,
  },
  supportName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  supportBio: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  emptySupport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptySupportText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 12,
  },
  userDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0000',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
    width: '100%',
  },
  userDataButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  analyticsScroll: {
    flex: 1,
  },
  analyticsSection: {
    backgroundColor: theme.colors.background.secondary,
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 12,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  analyticsSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  contentCount: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  countItem: {
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  countLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  userDataContent: {
    backgroundColor: theme.colors.background.secondary,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  userDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userDataTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF0000',
    marginLeft: 12,
  },
  userDataStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  userDataStat: {
    alignItems: 'center',
  },
  userDataNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 4,
    marginBottom: 2,
  },
  userDataLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  userDataFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  userDataContentText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  userDataViewsText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
});
