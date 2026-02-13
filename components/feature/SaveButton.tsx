import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { savedApi } from '../../services/api';
import { theme } from '../../constants/theme';

interface SaveButtonProps {
  itemId: string;
  itemType?: string;
  isInitiallySaved?: boolean;
  onSaveChange?: (itemId: string, isSaved: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  layout?: 'horizontal' | 'vertical'; // TIKTOK STYLE
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  itemId,
  itemType = 'reel',
  isInitiallySaved = false,
  onSaveChange,
  size = 'medium',
  showCount = true,
  layout = 'vertical' // TIKTOK STYLE
}) => {
  const [isSaved, setIsSaved] = useState(isInitiallySaved);
  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = new Animated.Value(1);

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { iconSize: 18, fontSize: 10, circleSize: 28 };
      case 'large':
        return { iconSize: 28, fontSize: 14, circleSize: 48 };
      default:
        return { iconSize: 24, fontSize: 12, circleSize: 36 };
    }
  };

  const { iconSize, fontSize, circleSize } = getSizeConfig();

  useEffect(() => {
    setIsSaved(isInitiallySaved);
  }, [isInitiallySaved]);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSave = async () => {
    if (isLoading) return;

    setIsLoading(true);
    animateButton();

    try {
      if (isSaved) {
        // Unsave the item
        await savedApi.unsaveItem(itemId);
        setIsSaved(false);
        onSaveChange?.(itemId, false);
      } else {
        // Save the item
        await savedApi.saveItem(itemId, itemType);
        setIsSaved(true);
        onSaveChange?.(itemId, true);
      }
    } catch (error) {
      console.error('Save/Unsave error:', error);
      // Revert state on error
      setIsSaved(!isSaved);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
          }
        ]}
        onPress={handleSave}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <MaterialIcons
            name={isSaved ? 'bookmark' : 'bookmark-border'}
            size={iconSize}
            color={isSaved ? theme.colors.primary.main : theme.colors.text.primary}
          />
        </Animated.View>
      </TouchableOpacity>
      
      {showCount && (
        <Text style={[styles.countText, { fontSize }]}>
          {isSaved ? 'Saved' : 'Save'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  countText: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
