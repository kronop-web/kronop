import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList, TextInput, Share, Alert, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as Video from 'expo-video';

interface LiveStream {
  id: string;
  creator: string;
  title: string;
  viewers: string;
  duration: string;
  category: string;
  creatorId: string;
  isLive: boolean;
  isSupported: boolean;
  isStarred: boolean;
  starsCount: number;
}

const mockLiveStreams: LiveStream[] = [
  {
    id: '1',
    creator: 'Gaming Pro',
    title: 'Epic Battle Royale - Join Now!',
    viewers: '12.5K',
    duration: '2:45',
    category: 'Gaming',
    creatorId: 'user1',
    isLive: true,
    isSupported: false,
    isStarred: false,
    starsCount: 4800,
  },
  {
    id: '2',
    creator: 'Music Vibes',
    title: 'Live Concert Performance',
    viewers: '8.2K',
    duration: '1:30',
    category: 'Music',
    creatorId: 'user2',
    isLive: true,
    isSupported: true,
    isStarred: true,
    starsCount: 8200,
  },
  {
    id: '3',
    creator: 'Tech Review',
    title: 'Latest Gadgets Unboxing Live',
    viewers: '15.3K',
    duration: '3:15',
    category: 'Technology',
    creatorId: 'user3',
    isLive: false,
    isSupported: false,
    isStarred: false,
    starsCount: 15300,
  },
  {
    id: '4',
    creator: 'Cooking Master',
    title: 'Making Delicious Recipes',
    viewers: '5.7K',
    duration: '1:45',
    category: 'Food',
    creatorId: 'user4',
    isLive: true,
    isSupported: false,
    isStarred: false,
    starsCount: 5700,
  },
];

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Simple Dot Animation component - NO STAR VISIBLE
const DotAnimation = ({ isActive }: { isActive: boolean }) => {
  const dotsAnim = useRef(new Animated.Value(0)).current;
  const [animationActive, setAnimationActive] = useState(false);

  const startAnimation = React.useCallback(() => {
    setAnimationActive(true);
    dotsAnim.setValue(0);

    // Simple dots animation only
    Animated.timing(dotsAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      // Fade out after animation
      setTimeout(() => {
        setAnimationActive(false);
      }, 300);
    });
  }, [dotsAnim]);

  React.useEffect(() => {
    if (isActive) {
      startAnimation();
    }
  }, [isActive, startAnimation]);

  if (!animationActive) return null;

  return (
    <View style={styles.dotAnimationContainer}>
      {/* Multiple dots coming from all directions */}
      {Array.from({ length: 200 }).map((_, i) => {
        const angle = (i * 1.8) * (Math.PI / 180); // 200 dots
        const distance = 250 + Math.random() * 150;
        const size = 1 + Math.random() * 2; // 1-3px
        
        return (
          <Animated.View 
            key={`dot-${i}`}
            style={[
              styles.tinyRedDot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: dotsAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1, 0]
                }),
                transform: [
                  {
                    translateX: dotsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Math.cos(angle) * distance, 0]
                    })
                  },
                  {
                    translateY: dotsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Math.sin(angle) * distance, 0]
                    })
                  },
                  {
                    scale: dotsAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 1.2, 0.8]
                    })
                  }
                ]
              }
            ]}
          />
        );
      })}
    </View>
  );
};

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'supporter' | 'supporting' | 'international'>('all');
  const [message, setMessage] = useState('');
  const [streams, setStreams] = useState<LiveStream[]>(mockLiveStreams);
  const [activeAnimations, setActiveAnimations] = useState<Record<string, boolean>>({});

  // Filter streams based on active tab
  const getFilteredStreams = () => {
    switch (activeTab) {
      case 'supporter':
        return streams.filter(stream => stream.isSupported);
      case 'supporting':
        return streams.filter(stream => stream.isStarred);
      case 'international':
        return streams.filter(stream => stream.category === 'Gaming' || stream.category === 'Music' || stream.category === 'Technology');
      default:
        return streams;
    }
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / (SCREEN_HEIGHT * 0.85));
    setCurrentIndex(index);
  };

  const toggleSupport = (streamId: string) => {
    setStreams(prev =>
      prev.map(s =>
        s.id === streamId ? { ...s, isSupported: !s.isSupported } : s
      )
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const triggerStarAnimation = (streamId: string) => {
    setActiveAnimations(prev => ({
      ...prev,
      [streamId]: true
    }));
    
    setTimeout(() => {
      setActiveAnimations(prev => ({
        ...prev,
        [streamId]: false
      }));
    }, 2000);
  };

  const toggleStar = (streamId: string) => {
    setStreams(prev => {
      const updatedStreams = prev.map(s => {
        if (s.id === streamId) {
          const newIsStarred = !s.isStarred;
          const newStarsCount = newIsStarred ? s.starsCount + 1 : Math.max(0, s.starsCount - 1);
          if (newIsStarred) {
            triggerStarAnimation(streamId);
          }
          return { ...s, isStarred: newIsStarred, starsCount: newStarsCount };
        }
        return s;
      });
      return updatedStreams;
    });
  };

  const handleShare = async (streamTitle: string) => {
    try {
      const result = await Share.share({
        message: `Check out this live stream: "${streamTitle}" on [Your App Name]!`,
        url: 'https://example.com/livestream/123'
      });
      if (result.action === Share.sharedAction) {
      } else if (result.action === Share.dismissedAction) {
      }
    } catch (error: any) {
      Alert.alert('Share Error', error.message);
    }
  };

  const renderLiveItem = ({ item: stream }: { item: LiveStream }) => (
    <View style={[styles.liveContainer, { height: SCREEN_HEIGHT * 0.85 }]}>
      {/* Dot Animation Only - NO STAR VISIBLE */}
      <DotAnimation isActive={activeAnimations[stream.id] || false} />
      
      <View style={styles.liveVideo}>
        {/* Video Placeholder */}
        <View style={styles.videoPlaceholder}>
          <View style={styles.videoGradient} />
        </View>

        {/* Channel Info + Support */}
        <View style={[styles.channelInfo, { bottom: insets.bottom + 90 }]}>
          <View style={styles.creatorInfoRow}>
            <View style={styles.creatorAvatar}>
              <View style={styles.avatarPlaceholder} />
            </View>

            {/* Name + Support button */}
            <View style={styles.creatorNameContainer}>
              <Text style={styles.creatorName}>{stream.creator}</Text>

              <TouchableOpacity
                style={[
                  styles.supportButton,
                  stream.isSupported ? styles.supportedButton : styles.supportButtonActive,
                ]}
                onPress={() => toggleSupport(stream.id)}
              >
                <Text
                  style={[
                    styles.supportButtonText,
                    stream.isSupported ? styles.supportedButtonText : styles.supportButtonTextActive,
                  ]}
                >
                  {stream.isSupported ? 'Supported' : 'Support'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Comment input */}
        <View style={[styles.commentBar, { bottom: insets.bottom + 40 }]}>
          <View style={styles.commentSection}>
            <TextInput
              style={styles.commentInputText}
              placeholder="Add a comment..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={message}
              onChangeText={setMessage}
            />
            <TouchableOpacity style={styles.sendButton}>
              <Ionicons name="send" size={16} color="#6A5ACD" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { bottom: insets.bottom + 90 }]}>
          {/* Star Button */}
          <TouchableOpacity style={styles.actionButton} onPress={() => toggleStar(stream.id)}>
            <View style={styles.actionIconContainer}>
              <Ionicons 
                name={stream.isStarred ? "star" : "star-outline"} 
                size={24} 
                color={stream.isStarred ? "#6A5ACD" : "white"}
              />
            </View>
            <Text style={styles.actionText}>{formatNumber(stream.starsCount)}</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(stream.title)}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="share-social" size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with 4 Filter Tabs */}
      <View style={styles.header}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text 
              style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'supporter' && styles.tabActive]}
            onPress={() => setActiveTab('supporter')}
          >
            <Text 
              style={[styles.tabText, activeTab === 'supporter' && styles.tabTextActive]}
            >
              Supporter
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'supporting' && styles.tabActive]}
            onPress={() => setActiveTab('supporting')}
          >
            <Text 
              style={[styles.tabText, activeTab === 'supporting' && styles.tabTextActive]}
            >
              Supporting
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'international' && styles.tabActive]}
            onPress={() => setActiveTab('international')}
          >
            <Text 
              style={[styles.tabText, activeTab === 'international' && styles.tabTextActive]}
            >
              International
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Live Streams Section */}
      <FlatList
        data={getFilteredStreams()}
        renderItem={renderLiveItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT * 0.85}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        style={styles.streamsList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    zIndex: 100,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Left align buttons
    paddingLeft: 8, // Start closer to left edge
    paddingRight: 16,
    gap: 8, // Tight spacing between buttons
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 8, // Reduced padding
    alignItems: 'center',
    // Remove minWidth to allow natural width
  },
  tabActive: {
    borderBottomWidth: 1,
    borderBottomColor: '#6A5ACD',
  },
  tabText: {
    color: '#666666',
    fontSize: 15, // Uniform font size for all buttons
    fontWeight: '400',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#6A5ACD',
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 15, // Same size for active state
  },
  streamsList: {
    flex: 1,
  },
  liveContainer: {
    position: 'relative',
  },
  // Dot Animation Styles (NO STAR)
  dotAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tinyRedDot: {
    position: 'absolute',
    backgroundColor: '#6A5ACD',
    top: '50%',
    left: '50%',
    zIndex: 1000,
  },
  liveVideo: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoGradient: {
    flex: 1,
    backgroundColor: '#000000',
  },
  channelInfo: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    gap: 8,
  },
  creatorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6A5ACD',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#444444',
  },
  creatorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  supportButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6A5ACD',
  },
  supportButtonActive: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  supportedButton: {
    backgroundColor: 'rgba(106, 90, 205, 0.15)',
  },
  supportButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  supportButtonTextActive: {
    color: '#FFFFFF',
  },
  supportedButtonText: {
    color: '#6A5ACD',
  },
  commentBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  commentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 36,
  },
  commentInputText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    padding: 0,
    margin: 0,
  },
  sendButton: {
    padding: 2,
  },
  actions: {
    position: 'absolute',
    right: 12,
    gap: 12,
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
});
