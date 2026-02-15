import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';

interface SavedSong {
  id: string;
  thumbnail_url?: string;
  url?: string;
  title?: string;
  artist?: string;
  duration?: number;
  likes_count?: number;
}

interface SavedSongsProps {
  songs: SavedSong[];
  itemWidth: number;
}

const SavedSongs: React.FC<SavedSongsProps> = ({ songs, itemWidth }) => {
  const router = useRouter();

  if (songs.length === 0) {
    return (
      <View style={styles.emptyContentContainer}>
        <MaterialIcons name="bookmark-border" size={60} color={theme.colors.text.tertiary} />
        <Text style={styles.emptyContentText}>No saved songs yet</Text>
        <Text style={styles.emptyContentSubtext}>Save songs you want to listen later</Text>
      </View>
    );
  }

  return (
    <View style={styles.savedGrid}>
      {songs.map((song) => (
        <TouchableOpacity 
          key={song.id} 
          style={[styles.savedItem, { width: itemWidth }]}
          onPress={() => router.push({
            pathname: '/post/[id]',
            params: { id: song?.id?.toString() || '' }
          })}
        >
          <Image 
            source={{ uri: song.thumbnail_url || song.url || 'https://picsum.photos/400' }} 
            style={styles.savedImage} 
            contentFit="cover"
          />
          <View style={styles.savedIcon}>
            <MaterialIcons name="bookmark" size={16} color="#fff" />
          </View>
          <View style={styles.musicOverlay}>
            <MaterialIcons name="music-note" size={24} color="#fff" />
          </View>
          {song.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          )}
          {song.likes_count && song.likes_count > 0 && (
            <View style={styles.likesBadge}>
              <MaterialIcons name="favorite" size={12} color="#fff" />
              <Text style={styles.likesText}>{song.likes_count}</Text>
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
  musicOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
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
  likesBadge: {
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
  likesText: {
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

export default SavedSongs;
