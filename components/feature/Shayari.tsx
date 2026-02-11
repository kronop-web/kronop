import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - theme.spacing.md * 2 - theme.spacing.sm) / 2;

interface ShayariCardProps {
  shayari_text: string;
  shayari_author?: string;
  background_image?: string;
  onPress?: () => void;
  isPhotoFeed?: boolean;
}

export default function ShayariCard({
  shayari_text,
  shayari_author,
  background_image,
  onPress,
  isPhotoFeed = true,
}: ShayariCardProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.shayariCard,
        isPhotoFeed && styles.photoFeedCard
      ] as ViewStyle[]} 
      onPress={onPress} 
      activeOpacity={0.9}
    >
      {/* Background Image or Gradient */}
      {background_image ? (
        <ExpoImage 
          source={{ uri: background_image }} 
          style={styles.backgroundImage} 
          contentFit="cover"
          onLoad={() => console.log('[SHAYARI]: Background image loaded successfully:', background_image)}
          onError={(error) => console.error('[SHAYARI]: Background image failed to load:', error)}
        />
      ) : (
        <View style={[styles.backgroundImage, styles.gradientBackground]} />
      )}
      
      {/* Shayari Content Overlay */}
      <View style={styles.contentOverlay}>
        <View style={styles.shayariContainer}>
          {/* Decorative Quote Icons */}
          <MaterialIcons 
            name="format-quote" 
            size={20} 
            color="#fff" 
            style={styles.quoteIconTop}
            onLoad={() => console.log('[SHAYARI]: Quote icon loaded successfully')}
            onError={(error: any) => console.error('[SHAYARI]: Quote icon failed to load:', error)}
          />
          
          <Text style={styles.shayariText} numberOfLines={4}>
            {shayari_text}
          </Text>
          
          {shayari_author && (
            <Text style={styles.shayariAuthor}>- {shayari_author}</Text>
          )}
          
          <MaterialIcons 
            name="format-quote" 
            size={20} 
            color="#fff" 
            style={styles.quoteIconBottom}
          />
        </View>
      </View>
      
      {/* Shayari Type Badge */}
      <View style={styles.shayariBadge}>
        <Text style={styles.badgeText}>शायरी</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shayariCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    position: 'relative',
  } as ViewStyle,
  
  photoFeedCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.2,
    marginBottom: theme.spacing.sm,
  } as ViewStyle,
  
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  
  gradientBackground: {
    backgroundColor: '#667eea',
  },
  
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  
  shayariContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    width: '90%',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  quoteIconTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    opacity: 0.7,
  },
  
  quoteIconBottom: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    opacity: 0.7,
    transform: [{ rotate: '180deg' }],
  },
  
  shayariText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginHorizontal: theme.spacing.sm,
  },
  
  shayariAuthor: {
    fontSize: theme.typography.fontSize.sm,
    color: '#fff',
    textAlign: 'right',
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
    opacity: 0.9,
    width: '100%',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  shayariBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 50,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
  },
  
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '700',
    color: '#FF0000',
  },
});
