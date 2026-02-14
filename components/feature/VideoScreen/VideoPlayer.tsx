import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

interface VideoPlayerProps {
  videoUrl: string;
  onProgress: (progress: number, duration: number) => void;
}

export default function VideoPlayer({ videoUrl, onProgress }: VideoPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const player = useVideoPlayer({
    uri: videoUrl,
    headers: {
      'User-Agent': 'KronopApp',
      'Referer': 'https://kronop.app',
      'Origin': 'https://kronop.app',
      'Accept': 'video/*',
    }
  }, (player) => {
    player.loop = false;
    if (videoUrl) player.play();
    
    // Track progress with proper event listener
    const updateProgress = () => {
      if (player.currentTime && player.duration) {
        const currentProgress = player.currentTime;
        const totalDuration = player.duration;
        setProgress(currentProgress);
        setDuration(totalDuration);
        onProgress(currentProgress, totalDuration);
      }
    };
    
    // Update progress every 100ms
    const interval = setInterval(updateProgress, 100);
    
    return () => clearInterval(interval);
  });

  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        style={styles.video}
        allowsFullscreen={true}
        allowsPictureInPicture
        contentFit="contain"
        nativeControls={false} // No native controls for clean view
      />
      
      {/* Progress Line */}
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar, 
            { width: `${progressPercentage}%` }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    marginTop: 0,
    paddingTop: 0,
    marginLeft: 0,
    marginRight: 0,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  progressContainer: {
    height: 2, // Thin progress line
    backgroundColor: '#333333', // Dark gray background
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF0000', // Red progress bar
  },
});
