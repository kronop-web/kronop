import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';

interface SavedLive {
  id: string;
  thumbnail_url?: string;
  url?: string;
  title?: string;
  viewers_count?: number;
  is_live?: boolean;
}

interface SavedLiveProps {
  liveSessions: SavedLive[];
  itemWidth: number;
}

const SavedLive: React.FC<SavedLiveProps> = ({ liveSessions, itemWidth }) => {
  const router = useRouter();

  if (liveSessions.length === 0) {
    return (
      <View style={styles.emptyContentContainer}>
        <MaterialIcons name="bookmark-border" size={60} color={theme.colors.text.tertiary} />
        <Text style={styles.emptyContentText}>No saved live sessions yet</Text>
        <Text style={styles.emptyContentSubtext}>Save live sessions you want to watch later</Text>
      </View>
    );
  }

  return (
    <View style={styles.savedGrid}>
      {liveSessions.map((live) => (
        <TouchableOpacity 
          key={live.id} 
          style={[styles.savedItem, { width: itemWidth }]}
          onPress={() => router.push({
            pathname: '/post/[id]',
            params: { id: live?.id?.toString() || '' }
          })}
        >
          <Image 
            source={{ uri: live.thumbnail_url || live.url || 'https://picsum.photos/400' }} 
            style={styles.savedImage} 
            contentFit="cover"
          />
          <View style={styles.savedIcon}>
            <MaterialIcons name="bookmark" size={16} color="#fff" />
          </View>
          {live.is_live && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          {live.viewers_count && (
            <View style={styles.viewersBadge}>
              <Text style={styles.viewersText}>{live.viewers_count} watching</Text>
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
  viewersBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  viewersText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textAlign: 'center',
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

export default SavedLive;
