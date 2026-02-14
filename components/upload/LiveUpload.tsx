import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraType, FlashMode } from 'expo-camera';
import { Audio } from 'expo-av';
import { SafeScreen } from '../layout';
import { liveStreamingService } from '../../services/liveStreamingService';

interface LiveData {
  title: string;
  description: string;
}

interface LiveUploadProps {
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LiveUpload({ onClose }: LiveUploadProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [liveData, setLiveData] = useState<LiveData>({
    title: '',
    description: ''
  });
  const [showPreview, setShowPreview] = useState(true);
  
  const cameraRef = useRef<React.ElementRef<typeof CameraView> | null>(null);

  useEffect(() => {
    requestAudioPermission();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isStreaming && streamId) {
      // Update viewer count every 5 seconds
      interval = setInterval(async () => {
        try {
          const count = await liveStreamingService.getViewerCount(streamId);
          setViewerCount(count);
        } catch (error) {
          console.error('Failed to get viewer count:', error);
        }
      }, 5000);
    }
    
    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [isStreaming, streamId]);

  const requestAudioPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setAudioPermission(status === 'granted');
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeScreen>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={64} color="#6A5ACD" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Please grant camera permission to go live
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  if (audioPermission === false) {
    return (
      <SafeScreen>
        <View style={styles.permissionContainer}>
          <Ionicons name="mic" size={64} color="#6A5ACD" />
          <Text style={styles.permissionTitle}>Microphone Permission Required</Text>
          <Text style={styles.permissionText}>
            Please grant microphone permission to include audio in your live stream
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestAudioPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  const startLiveStream = async () => {
    if (!liveData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your live stream');
      return;
    }

    try {
      setIsStreaming(true);
      setShowPreview(false);
      
      // Set camera reference for streaming service
      if (cameraRef.current) {
        liveStreamingService.setCameraRef(cameraRef.current);
      }
      
      // Start live stream using service
      const result = await liveStreamingService.startLiveStream({
        title: liveData.title.trim(),
        description: liveData.description.trim(),
        userId: 'guest_user' // Using dummy user ID as per bypass system
      });
      
      if (result.success && result.streamId) {
        setStreamId(result.streamId);
        Alert.alert(
          'Live Stream Started!',
          'Your live stream has started successfully.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(result.error || 'Failed to start stream');
      }
    } catch (error) {
      console.error('Failed to start live stream:', error);
      Alert.alert('Error', 'Failed to start live stream');
      setIsStreaming(false);
      setShowPreview(true);
      setStreamId(null);
    }
  };

  const stopLiveStream = async () => {
    try {
      // Stop live stream using service
      if (streamId) {
        const result = await liveStreamingService.stopLiveStream(streamId);
        if (!result.success) {
          console.error('Failed to stop stream via service:', result.error);
        }
      }
      
      setIsStreaming(false);
      setShowPreview(true);
      setStreamId(null);
      
      Alert.alert(
        'Live Stream Ended',
        'Your live stream has ended successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setLiveData({ title: '', description: '' });
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to stop live stream:', error);
      Alert.alert('Error', 'Failed to stop live stream');
    }
  };

  if (showPreview) {
    return (
      <SafeScreen>
        <View style={styles.container}>
          {/* Camera Preview */}
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={'front' satisfies CameraType}
            flash={'off' satisfies FlashMode}
          />

          {/* Live Indicator */}
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>

          {/* Form Overlay */}
          <View style={styles.formOverlay}>
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Stream Title *</Text>
                <TextInput
                  style={styles.input}
                  value={liveData.title}
                  onChangeText={(text) => setLiveData(prev => ({ ...prev, title: text }))}
                  placeholder="Enter live stream title..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  maxLength={100}
                  autoFocus
                />
                <Text style={styles.charCount}>{liveData.title.length}/100</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={liveData.description}
                  onChangeText={(text) => setLiveData(prev => ({ ...prev, description: text }))}
                  placeholder="Describe your live stream..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.charCount}>{liveData.description.length}/500</Text>
              </View>
            </View>
          </View>

          {/* Go Live Button */}
          <View style={styles.bottomControls}>
            <TouchableOpacity 
              style={styles.goLiveButton}
              onPress={startLiveStream}
              disabled={!liveData.title.trim()}
            >
              <MaterialIcons name="live-tv" size={24} color="#6A5ACD" />
              <Text style={styles.goLiveButtonText}>Go Live</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeScreen>
    );
  }

  // Streaming View
  return (
    <SafeScreen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Stream</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Camera View while streaming */}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={'front' satisfies CameraType}
          flash={'off' satisfies FlashMode}
        />

        {/* Streaming Header */}
        <View style={styles.streamingHeader}>
          <View style={styles.streamingInfo}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.streamTitle}>{liveData.title}</Text>
          </View>
          <TouchableOpacity 
            style={styles.stopButton}
            onPress={stopLiveStream}
          >
            <Text style={styles.stopButtonText}>END</Text>
          </TouchableOpacity>
        </View>

        {/* Viewers Count */}
        <View style={styles.viewersContainer}>
          <Ionicons name="eye" size={16} color="#fff" />
          <Text style={styles.viewersText}>{viewerCount} viewers</Text>
        </View>
      </ScrollView>
    </SafeScreen>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  camera: {
    flex: 1,
  },
  liveIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 100,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  formOverlay: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  formContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
    marginTop: 4,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  goLiveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  streamingHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  streamingInfo: {
    flex: 1,
  },
  streamTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  stopButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewersContainer: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    zIndex: 100,
  },
  viewersText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
});
