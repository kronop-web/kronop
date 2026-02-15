import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';

const screenWidth = Dimensions.get('window').width;
const itemWidth = screenWidth / 3;

interface SavedVideoProps {
  videos: any[];
}

export default function SavedVideo({ videos }: SavedVideoProps) {
  const router = useRouter();

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="videocam" size={60} color={theme.colors.text.tertiary} />
        <Text style={styles.emptyText}>No saved videos yet</Text>
        <Text style={styles.emptySubtext}>Save videos you want to watch later</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={videos}
      numColumns={3}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={[styles.videoItem, { width: itemWidth }]}
          onPress={() => router.push({
            pathname: '/post/[id]',
            params: { id: item?.id?.toString() || '' }
          })}
        >
          <Image 
            source={{ uri: item.thumbnail_url || item.url || 'https://picsum.photos/400' }} 
            style={styles.videoImage} 
            contentFit="cover"
          />
          <View style={styles.savedIcon}>
            <MaterialIcons name="bookmark" size={16} color="#fff" />
          </View>
          <View style={styles.videoOverlay}>
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
            <Text style={styles.videoDuration}>
              {Math.floor((item?.duration || 0) / 60)}:{((item?.duration || 0) % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  videoItem: {
    aspectRatio: 1,
    margin: 1,
    position: 'relative',
  },
  videoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  savedIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  videoOverlay: {
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
  videoDuration: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
});
