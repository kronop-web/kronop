import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';

interface SavedVideo {
  id: string;
  thumbnail_url?: string;
  url?: string;
  title?: string;
  duration?: number;
  views_count?: number;
}

interface SavedVideosProps {
  videos: SavedVideo[];
  itemWidth: number;
}

const SavedVideos: React.FC<SavedVideosProps> = ({ videos, itemWidth }) => {
  const router = useRouter();

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContentContainer}>
        <MaterialIcons name="bookmark-border" size={60} color={theme.colors.text.tertiary} />
        <Text style={styles.emptyContentText}>No saved videos yet</Text>
        <Text style={styles.emptyContentSubtext}>Save videos you want to watch later</Text>
      </View>
    );
  }

  return (
    <View style={styles.savedGrid}>
      {videos.map((video) => (
        <TouchableOpacity 
          key={video.id} 
          style={[styles.savedItem, { width: itemWidth }]}
          onPress={() => router.push({
            pathname: '/post/[id]',
            params: { id: video?.id?.toString() || '' }
          })}
        >
          <Image 
            source={{ uri: video.thumbnail_url || video.url || 'https://picsum.photos/400' }} 
            style={styles.savedImage} 
            contentFit="cover"
          />
          <View style={styles.savedIcon}>
            <MaterialIcons name="bookmark" size={16} color="#fff" />
          </View>
          {video.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
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
});

export default SavedVideos;
