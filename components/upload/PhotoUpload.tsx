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
  FlatList,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { bridgeManager } from '../../services/bridges';

interface PhotoData {
  title: string;
  description: string;
  tags: string[];
  category: string;
}

interface PhotoUploadProps {
  onClose: () => void;
  isShayari?: boolean;
}

export default function PhotoUpload({ onClose, isShayari = false }: PhotoUploadProps) {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoData, setPhotoData] = useState<PhotoData>({
    title: '',
    description: '',
    tags: [],
    category: ''
  });
  const [tagInput, setTagInput] = useState('');

  const categories = [
    'Nature', 'Portrait', 'Street', 'Architecture', 'Food', 
    'Travel', 'Fashion', 'Art', 'Animals', 'Sports', 'Other'
  ];

  const pickPhotos = async () => {
    try {
      // Request both media library and camera permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // All media types
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 0, // No limit - user can select unlimited
      });

      if (!result.canceled && result.assets) {
        const validFiles: any[] = [];
        
        for (const asset of result.assets) {
          // Basic file type validation
          const fileName = asset.fileName || '';
          const extension = fileName.split('.').pop()?.toLowerCase();
          const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          
          if (!extension || !allowedExtensions.includes(extension)) {
            Alert.alert('Invalid File', `${asset.fileName} - Please select a valid image file. Allowed: ${allowedExtensions.join(', ')}`);
            continue;
          }

          // Basic file size validation
          const MAX_SIZE = 10 * 1024 * 1024; // 10MB
          if (asset.fileSize && asset.fileSize > MAX_SIZE) {
            Alert.alert('File Too Large', `${asset.fileName} - Image files must be less than 10MB`);
            continue;
          }

          validFiles.push(asset);
        }

        if (validFiles.length > 0) {
          setSelectedFiles(prev => [...prev, ...validFiles]);
          if (validFiles.length === 1 && !photoData.title) {
            setPhotoData(prev => ({
              ...prev,
              title: prev.title || validFiles[0].fileName.split('.')[0]
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'Failed to pick photos');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Basic file type validation
        const fileName = file.fileName || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        if (!extension || !allowedExtensions.includes(extension)) {
          Alert.alert('Invalid File', `Please select a valid image file. Allowed: ${allowedExtensions.join(', ')}`);
          return;
        }

        // Basic file size validation
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.fileSize && file.fileSize > MAX_SIZE) {
          Alert.alert('File Too Large', 'Image files must be less than 10MB');
          return;
        }

        setSelectedFiles(prev => [...prev, file]);
        if (!photoData.title) {
          setPhotoData(prev => ({
            ...prev,
            title: prev.title || `Photo - ${new Date().toLocaleTimeString()}`
          }));
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !photoData.tags.includes(tagInput.trim())) {
      setPhotoData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setPhotoData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Files Selected', `Please select at least one ${isShayari ? 'photo for shayari' : 'photo'}`);
      return;
    }

    if (!photoData.title.trim()) {
      Alert.alert('Missing Content', `Please enter ${isShayari ? 'shayari text' : 'a title'} for your ${isShayari ? 'shayari' : 'photos'}`);
      return;
    }

    if (!photoData.category.trim()) {
      Alert.alert('Missing Category', `Please select a category for your ${isShayari ? 'shayari' : 'photos'}`);
      return;
    }

    router.push('/');

    (async () => {
      try {
        const uploadPromises = selectedFiles.map(async (file) => {
          // Use appropriate bridge based on type
          const bridgeType = isShayari ? 'SHAYARI' : 'PHOTO';
          return await bridgeManager.upload(bridgeType, file, {
            title: photoData.title.trim(),
            description: photoData.description.trim(),
            tags: [...photoData.tags, ...(isShayari ? ['shayari', 'poetry'] : [])],
            category: photoData.category
          });
        });

        const results = await Promise.all(uploadPromises);
        const successCount = results.filter(r => r.success).length;

        if (successCount > 0) {
          Alert.alert('Success', `${isShayari ? 'Shayari' : 'Photo'} Upload Complete`);
        }
      } catch (error: any) {
        console.error('Upload error:', error);
        Alert.alert('Upload Failed', error.message || `Failed to upload ${isShayari ? 'shayari' : 'photos'}`);
      }
    })();
  };

  const renderSelectedFile = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.selectedFileItem}>
      <Image source={{ uri: item.uri }} style={styles.selectedFileImage} />
      <TouchableOpacity
        style={styles.removeFileButton}
        onPress={() => removeFile(index)}
      >
        <MaterialIcons name="close" size={16} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.selectedFileName} numberOfLines={1}>
        {item.fileName}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="arrow-back" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <MaterialIcons name={isShayari ? 'format-quote' : 'photo-library'} size={32} color="#4CAF50" />
        <Text style={styles.title}>{isShayari ? 'Create Shayari' : 'Upload Photos'}</Text>
        <Text style={styles.subtitle}>{isShayari ? 'Share your poetry with a beautiful photo' : 'Share your best moments with the community'}</Text>
      </View>

      <View style={styles.uploadArea}>
        <View style={styles.uploadButtonsRow}>
          <TouchableOpacity 
            style={[styles.uploadButton, styles.galleryButton]}
            onPress={pickPhotos}
            disabled={uploading}
          >
            <MaterialIcons name="photo-library" size={24} color="#4CAF50" />
            <Text style={styles.uploadButtonText}>Gallery</Text>
            <Text style={styles.uploadButtonSubtext}>Choose multiple</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.uploadButton, styles.cameraButton]}
            onPress={takePhoto}
            disabled={uploading}
          >
            <MaterialIcons name="photo-camera" size={24} color="#4CAF50" />
            <Text style={styles.uploadButtonText}>Camera</Text>
            <Text style={styles.uploadButtonSubtext}>Take photo</Text>
          </TouchableOpacity>
        </View>

        {selectedFiles.length > 0 && (
          <View style={styles.selectedFilesContainer}>
            <Text style={styles.selectedFilesTitle}>
              Selected {isShayari ? 'Photo' : 'Photos'} ({selectedFiles.length})
            </Text>
            <FlatList
              data={selectedFiles}
              renderItem={renderSelectedFile}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectedFilesList}
            />
          </View>
        )}
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isShayari ? 'Shayari Text *' : 'Title *'}</Text>
          <TextInput
            style={[styles.input, isShayari && styles.textArea]}
            value={photoData.title}
            onChangeText={(text) => setPhotoData(prev => ({ ...prev, title: text }))}
            placeholder={isShayari ? 'Write your beautiful shayari here...' : 'Enter photo title...'}
            placeholderTextColor="#666"
            maxLength={isShayari ? 500 : 100}
            multiline={isShayari}
            numberOfLines={isShayari ? 6 : 1}
            textAlignVertical={isShayari ? 'top' : 'auto'}
          />
          <Text style={styles.charCount}>{photoData.title.length}/{isShayari ? 500 : 100}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  photoData.category === category && styles.categoryChipSelected
                ]}
                onPress={() => setPhotoData(prev => ({ ...prev, category }))}
              >
                <Text style={[
                  styles.categoryChipText,
                  photoData.category === category && styles.categoryChipTextSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
              <MaterialIcons name="add" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          
          {photoData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {photoData.tags.map((tag, index) => (
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
        disabled={uploading || selectedFiles.length === 0}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.uploadButtonText}>
              Uploading {selectedFiles.length} {isShayari ? 'shayari' : 'photo'}{selectedFiles.length > 1 ? 's' : ''}...
            </Text>
          </>
        ) : (
          <>
            <MaterialIcons name="cloud-upload" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>{isShayari ? 'Upload Shayari' : 'Upload'} {selectedFiles.length} {isShayari ? 'Shayari' : 'Photo'}{selectedFiles.length !== 1 ? 's' : ''}</Text>
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
          <Text style={styles.progressText}>
            {uploadProgress}% - Uploading {selectedFiles.length} {isShayari ? 'shayari' : 'photo'}{selectedFiles.length > 1 ? 's' : ''}
          </Text>
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
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  galleryButton: {
    borderColor: '#4CAF50',
  },
  cameraButton: {
    borderColor: '#4CAF50',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  selectedFilesContainer: {
    marginTop: 16,
  },
  selectedFilesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  selectedFilesList: {
    marginTop: 8,
  },
  selectedFileItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 80,
  },
  selectedFileImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  removeFileButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedFileName: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
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
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
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
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
});
