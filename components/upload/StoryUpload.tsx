import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadToBunny, validateFileType, validateFileSize } from '../../services/api';

interface StoryData {
  title: string;
  type: 'video' | 'photo';
  duration: number;
  isPrivate: boolean;
}

interface StoryUploadProps {
  onClose: () => void;
}

export default function StoryUpload({ onClose }: StoryUploadProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storyData, setStoryData] = useState<StoryData>({
    title: '',
    type: 'photo',
    duration: 15,
    isPrivate: false
  });

  const pickFile = async () => {
    try {
      // Show action sheet for media type selection
      Alert.alert(
        'Select Media Type',
        'Choose what type of story you want to upload',
        [
          {
            text: 'Photo',
            onPress: () => pickPhoto(),
          },
          {
            text: 'Video',
            onPress: () => pickVideo(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const pickPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // All media types
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Validate file type
        const typeValidation = validateFileType(file, 'story');
        if (!typeValidation.valid) {
          Alert.alert('Invalid File', typeValidation.error || 'Invalid file type');
          return;
        }

        // Validate file size
        const sizeValidation = validateFileSize(file, 'story');
        if (!sizeValidation.valid) {
          Alert.alert('File Too Large', sizeValidation.error || 'File too large');
          return;
        }

        setSelectedFile(file);
        setStoryData(prev => ({
          ...prev,
          type: 'photo',
          title: prev.title || `Story - ${new Date().toLocaleTimeString()}`
        }));
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Validate file type
        const typeValidation = validateFileType(file, 'story');
        if (!typeValidation.valid) {
          Alert.alert('Invalid File', typeValidation.error || 'Invalid file type');
          return;
        }

        // Validate file size
        const sizeValidation = validateFileSize(file, 'story');
        if (!sizeValidation.valid) {
          Alert.alert('File Too Large', sizeValidation.error || 'File too large');
          return;
        }

        setSelectedFile(file);
        setStoryData(prev => ({
          ...prev,
          type: 'video',
          title: prev.title || `Story - ${new Date().toLocaleTimeString()}`
        }));
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a photo or video first');
      return;
    }

    if (!storyData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your story');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const result = await uploadToBunny(selectedFile, 'story', {
        title: storyData.title.trim(),
        type: storyData.type,
        duration: storyData.duration,
        isPrivate: storyData.isPrivate
      });

      if (result.success) {
        Alert.alert(
          'Story Uploaded!',
          'Your story has been uploaded successfully and will be available for 24 hours.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setSelectedFile(null);
                setStoryData({ title: '', type: 'photo', duration: 15, isPrivate: false });
                setUploadProgress(0);
              }
            }
          ]
        );
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="arrow-back" size={24} color="#9C27B0" />
        </TouchableOpacity>
        <MaterialIcons name="auto-stories" size={32} color="#9C27B0" />
        <Text style={styles.title}>Upload Story</Text>
        <Text style={styles.subtitle}>Share moments that disappear in 24 hours</Text>
      </View>

      <View style={styles.uploadArea}>
        <TouchableOpacity 
          style={[styles.uploadButton, selectedFile && styles.uploadButtonSelected]}
          onPress={pickFile}
          disabled={uploading}
        >
          <MaterialIcons 
            name={storyData.type === 'video' ? "videocam" : "photo-camera"} 
            size={48} 
            color={selectedFile ? "#9C27B0" : "#666"} 
          />
          <Text style={[styles.uploadText, selectedFile && styles.uploadTextSelected]}>
            {selectedFile ? selectedFile.name : 'Choose Photo or Video'}
          </Text>
          <Text style={styles.uploadSubtext}>
            Photos (10MB) or Videos (100MB)
          </Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <View style={styles.fileInfoItem}>
              <Text style={styles.fileInfoLabel}>Type:</Text>
              <Text style={styles.fileInfoValue}>
                {storyData.type === 'video' ? 'Video Story' : 'Photo Story'}
              </Text>
            </View>
            <View style={styles.fileInfoItem}>
              <Text style={styles.fileInfoLabel}>Size:</Text>
              <Text style={styles.fileInfoValue}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </Text>
            </View>
            {storyData.type === 'video' && (
              <View style={styles.fileInfoItem}>
                <Text style={styles.fileInfoLabel}>Duration:</Text>
                <Text style={styles.fileInfoValue}>{storyData.duration}s</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Story Title *</Text>
          <TextInput
            style={styles.input}
            value={storyData.title}
            onChangeText={(text) => setStoryData(prev => ({ ...prev, title: text }))}
            placeholder="Enter story title..."
            placeholderTextColor="#666"
            maxLength={50}
          />
          <Text style={styles.charCount}>{storyData.title.length}/50</Text>
        </View>

        {storyData.type === 'video' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duration (seconds)</Text>
            <View style={styles.durationContainer}>
              <TouchableOpacity
                style={styles.durationButton}
                onPress={() => setStoryData(prev => ({ 
                  ...prev, 
                  duration: Math.max(1, prev.duration - 5) 
                }))}
              >
                <MaterialIcons name="remove" size={20} color="#9C27B0" />
              </TouchableOpacity>
              <Text style={styles.durationText}>{storyData.duration}s</Text>
              <TouchableOpacity
                style={styles.durationButton}
                onPress={() => setStoryData(prev => ({ 
                  ...prev, 
                  duration: Math.min(60, prev.duration + 5) 
                }))}
              >
                <MaterialIcons name="add" size={20} color="#9C27B0" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helpText}>
              Story duration: 1-60 seconds
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Story Settings</Text>
          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setStoryData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
            >
              <View style={styles.settingLeft}>
                <MaterialIcons 
                  name={storyData.isPrivate ? "visibility-off" : "visibility"} 
                  size={20} 
                  color={storyData.isPrivate ? "#9C27B0" : "#4CAF50"} 
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Visibility</Text>
                  <Text style={styles.settingDescription}>
                    {storyData.isPrivate ? 'Only close friends' : 'All followers'}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.toggle, 
                storyData.isPrivate && styles.toggleActive
              ]}>
                <View style={[
                  styles.toggleDot,
                  storyData.isPrivate && styles.toggleDotActive
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <MaterialIcons name="timer" size={20} color="#9C27B0" />
          <Text style={styles.infoText}>
            Stories automatically disappear after 24 hours. They&apos;re perfect for sharing casual moments and behind-the-scenes content.
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.uploadButtonMain, uploading && styles.uploadButtonDisabled]}
        onPress={handleUpload}
        disabled={uploading || !selectedFile}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.uploadButtonText}>Uploading...</Text>
          </>
        ) : (
          <>
            <MaterialIcons name="upload" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>Upload Story</Text>
          </>
        )}
      </TouchableOpacity>

      {uploading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${uploadProgress}%` }]} 
            />
          </View>
          <Text style={styles.progressText}>{uploadProgress}%</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    top: 24,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  uploadArea: {
    padding: 16,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  uploadButtonSelected: {
    borderColor: '#9C27B0',
    backgroundColor: '#f3e5f5',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  uploadTextSelected: {
    color: '#9C27B0',
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  fileInfo: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  fileInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fileInfoLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  fileInfoValue: {
    fontSize: 12,
    color: '#212529',
    fontWeight: '600',
  },
  formSection: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#212529',
  },
  charCount: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 12,
  },
  durationButton: {
    padding: 8,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginHorizontal: 24,
  },
  helpText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    fontStyle: 'italic',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  toggle: {
    width: 48,
    height: 28,
    backgroundColor: '#ccc',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#9C27B0',
  },
  toggleDot: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f3e5f5',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  uploadButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
});
