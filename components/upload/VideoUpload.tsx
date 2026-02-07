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
import { bridgeManager } from '../../services/bridges';

interface VideoData {
  title: string;
  description: string;
  tags: string[];
  category: string;
}

interface VideoUploadProps {
  onClose: () => void;
}

export default function VideoUpload({ onClose }: VideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoData, setVideoData] = useState<VideoData>({
    title: '',
    description: '',
    tags: [],
    category: ''
  });
  const [tagInput, setTagInput] = useState('');

  const categories = [
    'Entertainment', 'Education', 'Gaming', 'Music', 'Sports', 
    'News', 'Technology', 'Travel', 'Food', 'Fashion', 'Other'
  ];

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'], // Allow all video types
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // More lenient validation - just check if it is a video file
        const fileName = file.name || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['mp4', 'mov', 'avi', 'webm', '3gp', 'mkv'];
        
        if (!extension || !allowedExtensions.includes(extension)) {
          Alert.alert('Invalid File', `Please select a valid video file. Allowed: ${allowedExtensions.join(', ')}`);
          return;
        }

        // Basic file size validation
        const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB for videos
        if (file.size && file.size > MAX_SIZE) {
          Alert.alert('File Too Large', 'Video files must be less than 2GB');
          return;
        }

        setSelectedFile(file);
        setVideoData(prev => ({
          ...prev,
          title: prev.title || file.name.split('.')[0]
        }));
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !videoData.tags.includes(tagInput.trim())) {
      setVideoData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setVideoData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a video file first');
      return;
    }

    if (!videoData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your video');
      return;
    }

    if (!videoData.category.trim()) {
      Alert.alert('Missing Category', 'Please select a category for your video');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const result = await bridgeManager.upload('VIDEO', selectedFile, {
        title: videoData.title.trim(),
        description: videoData.description.trim(),
        tags: videoData.tags,
        category: videoData.category
      });

      if (result.success) {
        Alert.alert(
          'Upload Successful!',
          'Your video has been uploaded successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setSelectedFile(null);
                setVideoData({ title: '', description: '', tags: [], category: '' });
                setTagInput('');
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
      Alert.alert('Upload Failed', error.message || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        <MaterialIcons name="play-circle-filled" size={32} color="#2196F3" />
        <Text style={styles.title}>Upload Video</Text>
        <Text style={styles.subtitle}>Share your videos with the community</Text>
      </View>

      <View style={styles.uploadArea}>
        <TouchableOpacity 
          style={[styles.uploadButton, selectedFile && styles.uploadButtonSelected]}
          onPress={pickFile}
          disabled={uploading}
        >
          <MaterialIcons 
            name="videocam" 
            size={48} 
            color={selectedFile ? "#2196F3" : "#666"} 
          />
          <Text style={[styles.uploadText, selectedFile && styles.uploadTextSelected]}>
            {selectedFile ? selectedFile.name : 'Choose Video File'}
          </Text>
          <Text style={styles.uploadSubtext}>
            MP4, MOV, AVI, WebM (Max 100MB)
          </Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <View style={styles.fileInfoItem}>
              <Text style={styles.fileInfoLabel}>Size:</Text>
              <Text style={styles.fileInfoValue}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </Text>
            </View>
            <View style={styles.fileInfoItem}>
              <Text style={styles.fileInfoLabel}>Type:</Text>
              <Text style={styles.fileInfoValue}>{selectedFile.mimeType}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={videoData.title}
            onChangeText={(text) => setVideoData(prev => ({ ...prev, title: text }))}
            placeholder="Enter video title..."
            placeholderTextColor="#666"
            maxLength={100}
          />
          <Text style={styles.charCount}>{videoData.title.length}/100</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  videoData.category === category && styles.categoryChipSelected
                ]}
                onPress={() => setVideoData(prev => ({ ...prev, category }))}
              >
                <Text style={[
                  styles.categoryChipText,
                  videoData.category === category && styles.categoryChipTextSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={videoData.description}
            onChangeText={(text) => setVideoData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your video..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{videoData.description.length}/500</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add tags..."
              placeholderTextColor="#666"
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <MaterialIcons name="add" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
          
          {videoData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {videoData.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <MaterialIcons name="close" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
            <Text style={styles.uploadButtonText}>Upload Video</Text>
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
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  uploadTextSelected: {
    color: '#2196F3',
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
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 4,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: '#e9ecef',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  tagInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#212529',
  },
  addTagButton: {
    padding: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  uploadButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
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
    backgroundColor: '#2196F3',
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
});
