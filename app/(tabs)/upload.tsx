import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';

import VideoUpload from '../../components/upload/VideoUpload';
import ReelsUpload from '../../components/upload/ReelsUpload';
import PhotoUpload from '../../components/upload/PhotoUpload';
import StoryUpload from '../../components/upload/StoryUpload';
import LiveUpload from '../../components/upload/LiveUpload';
import SongUpload from '../../components/upload/SongUpload';

const { width } = Dimensions.get('window');

// ==================== MAIN UPLOAD SCREEN ====================
export default function UploadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeComponent, setActiveComponent] = useState<'reel' | 'video' | 'photo' | 'story' | 'live' | 'shayari' | 'song' | null>(null);

  // Handle query parameter to auto-select upload type
  useEffect(() => {
    if (params.tab) {
      const tab = params.tab as string;
      if (['reel', 'video', 'photo', 'story', 'live', 'shayari', 'song'].includes(tab)) {
        setActiveComponent(tab as any);
      }
    }
  }, [params.tab]);

  const handleUploadPress = (type: 'reel' | 'video' | 'photo' | 'story' | 'live' | 'shayari' | 'song') => {
    setActiveComponent(type);
  };

  // 7 buttons array - EK KE NICHE EK
  const uploadButtons = [
    {
      id: 'story',
      title: 'Story',
      icon: 'auto-stories',
      description: '24 hours visible',
      type: 'story' as const,
    },
    {
      id: 'photo',
      title: 'Photo',
      icon: 'image',
      description: 'Gallery photos',
      type: 'photo' as const,
    },
    {
      id: 'reel',
      title: 'Reels',
      icon: 'movie',
      description: 'Short videos',
      type: 'reel' as const,
    },
    {
      id: 'live',
      title: 'Live',
      icon: 'live-tv',
      description: 'Go live now',
      type: 'live' as const,
    },
    {
      id: 'video',
      title: 'Video',
      icon: 'videocam',
      description: 'Long videos',
      type: 'video' as const,
    },
    {
      id: 'shayari',
      title: 'Shayari',
      icon: 'format-quote',
      description: 'Poetry & quotes',
      type: 'shayari' as const,
    },
    {
      id: 'song',
      title: 'Song',
      icon: 'music-note',
      description: 'Music files',
      type: 'song' as const,
    },
  ];

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upload Content</Text>
          <Text style={styles.headerSubtitle}>Share your creativity with the world</Text>
        </View>

        {/* 6 Buttons EK KE NICHE EK */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {uploadButtons.map((button) => (
            <TouchableOpacity
              key={button.id}
              style={styles.uploadButtonCard}
              onPress={() => handleUploadPress(button.type)}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainer}>
                <MaterialIcons name={button.icon as any} size={40} color={theme.colors.primary.main} />
              </View>
              
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{button.title}</Text>
                <Text style={styles.cardDescription}>{button.description}</Text>
              </View>

              <MaterialIcons 
                name="chevron-right" 
                size={28} 
                color={theme.colors.primary.main} 
                style={styles.chevronIcon}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Upload Component */}
        {activeComponent && (
          <View style={styles.componentContainer}>
            {activeComponent === 'reel' && (
              <ReelsUpload onClose={() => router.replace('/')} />
            )}
            {activeComponent === 'video' && (
              <VideoUpload onClose={() => router.replace('/')} />
            )}
            {activeComponent === 'photo' && (
              <PhotoUpload onClose={() => router.replace('/')} />
            )}
            {activeComponent === 'story' && (
              <StoryUpload onClose={() => router.replace('/')} />
            )}
            {activeComponent === 'live' && (
              <LiveUpload onClose={() => router.replace('/')} />
            )}
            {activeComponent === 'shayari' && (
              <PhotoUpload onClose={() => router.replace('/')} isShayari={true} />
            )}
            {activeComponent === 'song' && (
              <SongUpload onClose={() => router.replace('/')} />
            )}
          </View>
        )}
      </View>
    </SafeScreen>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  
  // 6 Buttons EK KE NICHE EK Styles
  uploadButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    minHeight: 90,
  },
  
  buttonIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  
  cardDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  
  chevronIcon: {
    marginLeft: theme.spacing.sm,
  },
  
  // Component Container
  componentContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background.primary,
    zIndex: 1000,
  },
});
