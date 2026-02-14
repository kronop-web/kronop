import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface HorizontalProps {
  isFullscreen: boolean;
  onPress: () => void;
}

export default function Horizontal({ isFullscreen, onPress }: HorizontalProps) {
  return (
    <TouchableOpacity 
      style={styles.bottomButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
        size={20} 
        color="#FFFFFF" 
      />
      <Text style={styles.bottomButtonText}>
        {isFullscreen ? "Exit" : "Full Screen"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: theme.spacing.sm,
  },
  bottomButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
});
