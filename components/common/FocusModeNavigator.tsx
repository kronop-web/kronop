
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import FocusModeService from '../../services/focusModeService';
import BackgroundManager from '../../services/backgroundManager';
import ScreenMemoryManager from '../../services/screenMemoryManager';

interface Props {
  children: React.ReactNode;
  currentScreen?: string;
}

const FocusModeNavigator: React.FC<Props> = ({ children, currentScreen }) => {
  const [focusMode, setFocusMode] = useState(false);
  const [focusedScreen, setFocusedScreen] = useState(currentScreen || '');

  useEffect(() => {
    // Subscribe to focus mode changes
    const focusService = FocusModeService.getInstance();
    if (focusService) {
      const unsubscribe = focusService.subscribe((state: any) => {
        if (state) {
          setFocusMode(state.isFocused);
          setFocusedScreen(state.currentScreen || '');
        }
      });

      return unsubscribe;
    }
  }, []);

  useEffect(() => {
    // Update focus mode when current screen changes
    if (currentScreen) {
      const focusService = FocusModeService.getInstance();
      if (focusService) {
        focusService.setFocusMode(currentScreen);
      }
    }
  }, [currentScreen]);

  const handleScreenPress = (screenType: string, contentType?: string) => {
    console.log(`🎯 Entering Focus Mode: ${screenType}`);
    
    // Set focus mode
    const focusService = FocusModeService.getInstance();
    if (focusService) {
      focusService.setFocusMode(screenType, contentType);
    }
    
    // Pause all background processes
    const bgManager = BackgroundManager.getInstance();
    if (bgManager) {
      bgManager.pauseAllProcesses();
    }
    
    // Allocate memory for this screen
    const memoryManager = ScreenMemoryManager.getInstance();
    if (memoryManager) {
      memoryManager.allocateMemory(screenType, 100); // 100MB per screen
    }
    
    // Clear other screens' cache
    const allScreens = ['reels', 'videos', 'photos', 'live', 'shayari', 'songs', 'saved', 'profile', 'chat'];
    allScreens.forEach((screen: string) => {
      if (screen !== screenType && memoryManager) {
        memoryManager.clearScreenCache(screen);
      }
    });
  };

  const handleExitFocus = () => {
    console.log('🔓 Exiting Focus Mode');
    
    // Clear focus mode
    const focusService = FocusModeService.getInstance();
    if (focusService) {
      focusService.clearFocusMode();
    }
    
    // Resume all background processes
    const bgManager = BackgroundManager.getInstance();
    if (bgManager) {
      bgManager.resumeAllProcesses();
    }
  };

  const getScreenIcon = (screenType: string): string => {
    const icons: Record<string, string> = {
      reels: 'movie',
      videos: 'smart-display',
      photos: 'photo-library',
      live: 'live-tv',
      shayari: 'format-quote',
      songs: 'music-note',
      saved: 'bookmark',
      profile: 'person',
      chat: 'chat'
    };
    return icons[screenType] || 'home';
  };

  const getScreenLabel = (screenType: string): string => {
    const labels: Record<string, string> = {
      reels: 'Reels',
      videos: 'Videos',
      photos: 'Photos',
      live: 'Live',
      shayari: 'Shayari',
      songs: 'Songs',
      saved: 'Saved',
      profile: 'Profile',
      chat: 'Chat'
    };
    return labels[screenType] || 'Home';
  };

  if (focusMode) {
    return (
      <View style={styles.focusModeContainer}>
        <View style={styles.focusHeader}>
          <MaterialIcons 
            name="center-focus-strong" 
            size={24} 
            color={theme.colors.primary.main} 
          />
          <Text style={styles.focusTitle}>Focus Mode</Text>
          <TouchableOpacity 
            style={styles.exitButton}
            onPress={handleExitFocus}
          >
            <MaterialIcons name="close" size={20} color="#fff" />
            <Text style={styles.exitButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.focusContent}>
          <View style={styles.currentScreen}>
            <MaterialIcons 
              name={getScreenIcon(focusedScreen) as any} 
              size={32} 
              color={theme.colors.primary.main} 
            />
            <Text style={styles.currentScreenText}>{getScreenLabel(focusedScreen)}</Text>
          </View>
          
          <View style={styles.focusInstructions}>
            <Text style={styles.instructionText}>🎯 Full Focus Active</Text>
            <Text style={styles.instructionSubtext}>Only {getScreenLabel(focusedScreen)} is loaded</Text>
            <Text style={styles.instructionSubtext}>Background processes paused</Text>
            <Text style={styles.instructionSubtext}>Memory optimized for this screen</Text>
          </View>
        </View>
        
        <View style={styles.screenGrid}>
          {(['reels', 'videos', 'photos', 'live', 'shayari', 'songs', 'saved', 'profile', 'chat'] as const).map((screen: string) => (
            <TouchableOpacity
              key={screen}
              style={[
                styles.screenButton,
                focusedScreen === screen && styles.activeScreenButton
              ]}
              onPress={() => handleScreenPress(screen)}
            >
              <MaterialIcons 
                name={getScreenIcon(screen) as any} 
                size={24} 
                color={focusedScreen === screen ? theme.colors.primary.main : theme.colors.text.secondary} 
              />
              <Text style={[
                styles.screenButtonText,
                focusedScreen === screen && styles.activeScreenButtonText
              ]}>
                {getScreenLabel(screen)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.normalContainer}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  focusModeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  focusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginLeft: 10,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  focusContent: {
    flex: 1,
    padding: 20,
  },
  currentScreen: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 15,
  },
  currentScreenText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary.main,
    marginTop: 10,
  },
  focusInstructions: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 5,
  },
  instructionSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  screenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
  },
  screenButton: {
    width: 80,
    height: 80,
    margin: 5,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  activeScreenButton: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  screenButtonText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 5,
  },
  activeScreenButtonText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
  },
  normalContainer: {
    flex: 1,
  },
});

export default FocusModeNavigator;
