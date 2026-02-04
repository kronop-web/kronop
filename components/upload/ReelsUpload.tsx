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
import { uploadToBunny, validateFileType, validateFileSize } from '../../services/api';

interface ReelData {
  title: string;
  description: string;
  tags: string[];
}

interface ReelsUploadProps {
  onClose: () => void;
}

export default function ReelsUpload({ onClose }: ReelsUploadProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reelData, setReelData] = useState<ReelData>({
    title: '',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

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

        // Validate file size
        const sizeValidation = validateFileSize(file, 'reels');
        if (!sizeValidation.valid) {
          Alert.alert('File Too Large', sizeValidation.error || 'File too large');
          return;
        }

        setSelectedFile(file);
        setReelData(prev => ({
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
    if (tagInput.trim() && !reelData.tags.includes(tagInput.trim())) {
      setReelData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setReelData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a video file first');
      return;
    }

    if (!reelData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your reel');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const result = await uploadToBunny(selectedFile, 'reels', {
        title: reelData.title.trim(),
        description: reelData.description.trim(),
        tags: reelData.tags
      });

      if (result.success) {
        Alert.alert(
          'Upload Successful!',
          'Your reel has been uploaded successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setSelectedFile(null);
                setReelData({ title: '', description: '', tags: [] });
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
      Alert.alert('Upload Failed', error.message || 'Failed to upload reel');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FF4444" />
        </TouchableOpacity>
        <MaterialIcons name="movie" size={32} color="#FF4444" />
        <Text style={styles.title}>Upload Reel</Text>
        <Text style={styles.subtitle}>Share your short videos with the world</Text>
      </View>

      <View style={styles.uploadArea}>
        <TouchableOpacity 
          style={[styles.uploadButton, selectedFile && styles.uploadButtonSelected]}
          onPress={pickFile}
          disabled={uploading}
        >
          <MaterialIcons 
            name="video-library" 
            size={48} 
            color={selectedFile ? "#FF4444" : "#666"} 
          />
          <Text style={[styles.uploadText, selectedFile && styles.uploadTextSelected]}>
            {selectedFile ? selectedFile.name : 'Choose Video File'}
          </Text>
          <Text style={styles.uploadSubtext}>
            MP4, MOV, AVI (Max 100MB)
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
            value={reelData.title}
            onChangeText={(text) => setReelData(prev => ({ ...prev, title: text }))}
            placeholder="Enter reel title..."
            placeholderTextColor="#666"
            maxLength={100}
          />
          <Text style={styles.charCount}>{reelData.title.length}/100</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reelData.description}
            onChangeText={(text) => setReelData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your reel..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{reelData.description.length}/500</Text>
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
              <MaterialIcons name="add" size={20} color="#FF4444" />
            </TouchableOpacity>
          </View>
          
          {reelData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {reelData.tags.map((tag, index) => (
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
            <Text style={styles.uploadButtonText}>Upload Reel</Text>
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
    borderColor: '#FF4444',
    backgroundColor: '#fff5f5',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  uploadTextSelected: {
    color: '#FF4444',
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
    backgroundColor: '#FF4444',
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
    backgroundColor: '#FF4444',
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
});
