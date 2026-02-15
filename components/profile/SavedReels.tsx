import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';

interface SavedReel {
  id: string;
  thumbnail_url?: string;
  url?: string;
  title?: string;
  duration?: number;
  views_count?: number;
}

interface SavedReelsProps {
  reels: SavedReel[];
  itemWidth: number;
}

const SavedReels: React.FC<SavedReelsProps> = ({ reels, itemWidth }) => {
  const router = useRouter();

  if (reels.length === 0) {
    return (
      <View style={styles.emptyContentContainer}>
        <MaterialIcons name="bookmark-border" size={60} color={theme.colors.text.tertiary} />
        <Text style={styles.emptyContentText}>No saved reels yet</Text>
        <Text style={styles.emptyContentSubtext}>Save reels you want to watch later</Text>
      </View>
    );
  }

  return (
    <View style={styles.savedGrid}>
      {reels.map((reel) => (
        <TouchableOpacity 
          key={reel.id} 
          style={[styles.savedItem, { width: itemWidth }]}
          onPress={() => router.push({
            pathname: '/post/[id]',
            params: { id: reel?.id?.toString() || '' }
          })}
        >
          <Image 
            source={{ uri: reel.thumbnail_url || reel.url || 'https://picsum.photos/400/700' }} 
            style={styles.savedImage} 
            contentFit="cover"
          />
          <View style={styles.savedIcon}>
            <MaterialIcons name="bookmark" size={16} color="#fff" />
          </View>
          <View style={styles.playOverlay}>
            <MaterialIcons name="play-arrow" size={24} color="#fff" />
          </View>
          {reel.views_count && (
            <View style={styles.viewsBadge}>
              <MaterialIcons name="play-arrow" size={12} color="#fff" />
              <Text style={styles.viewsText}>{reel.views_count}</Text>
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
    aspectRatio: 9/16,
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
  viewsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
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

export default SavedReels;
