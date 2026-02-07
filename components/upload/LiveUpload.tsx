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

interface LiveData {
  title: string;
  description: string;
  scheduledTime: string;
  isPrivate: boolean;
}

interface LiveUploadProps {
  onClose: () => void;
}

export default function LiveUpload({ onClose }: LiveUploadProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [liveData, setLiveData] = useState<LiveData>({
    title: '',
    description: '',
    scheduledTime: '',
    isPrivate: false
  });

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

        // File size validation (basic check)
        const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
        if (file.size > MAX_SIZE) {
          Alert.alert('File Too Large', 'Live stream files must be less than 2GB');
          return;
        }

        setSelectedFile(file);
        setLiveData(prev => ({
          ...prev,
          title: prev.title || `Live Stream - ${new Date().toLocaleDateString()}`
        }));
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a video file first');
      return;
    }

    if (!liveData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your live stream');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const result = await bridgeManager.upload('LIVE', selectedFile, {
        title: liveData.title.trim(),
        description: liveData.description.trim(),
        scheduledTime: liveData.scheduledTime,
        isPrivate: liveData.isPrivate
      });

      if (result.success) {
        Alert.alert(
          'Live Stream Scheduled!',
          'Your live stream has been scheduled successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setSelectedFile(null);
                setLiveData({ title: '', description: '', scheduledTime: '', isPrivate: false });
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
      Alert.alert('Upload Failed', error.message || 'Failed to schedule live stream');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FF5722" />
        </TouchableOpacity>
        <MaterialIcons name="live-tv" size={32} color="#FF5722" />
        <Text style={styles.title}>Go Live</Text>
        <Text style={styles.subtitle}>Schedule your live stream</Text>
      </View>

      <View style={styles.uploadArea}>
        <TouchableOpacity 
          style={[styles.uploadButton, selectedFile && styles.uploadButtonSelected]}
          onPress={pickFile}
          disabled={uploading}
        >
          <MaterialIcons 
            name="radio" 
            size={48} 
            color={selectedFile ? "#FF5722" : "#666"} 
          />
          <Text style={[styles.uploadText, selectedFile && styles.uploadTextSelected]}>
            {selectedFile ? selectedFile.name : 'Choose Stream Setup File'}
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
          <Text style={styles.label}>Stream Title *</Text>
          <TextInput
            style={styles.input}
            value={liveData.title}
            onChangeText={(text) => setLiveData(prev => ({ ...prev, title: text }))}
            placeholder="Enter live stream title..."
            placeholderTextColor="#666"
            maxLength={100}
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
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{liveData.description.length}/500</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Scheduled Time</Text>
          <TextInput
            style={styles.input}
            value={liveData.scheduledTime}
            onChangeText={(text) => setLiveData(prev => ({ ...prev, scheduledTime: text }))}
            placeholder="YYYY-MM-DD HH:MM"
            placeholderTextColor="#666"
          />
          <Text style={styles.helpText}>
            Schedule your stream for later (optional)
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Stream Settings</Text>
          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setLiveData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
            >
              <View style={styles.settingLeft}>
                <MaterialIcons 
                  name={liveData.isPrivate ? "lock" : "public"} 
                  size={20} 
                  color={liveData.isPrivate ? "#FF5722" : "#4CAF50"} 
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Privacy</Text>
                  <Text style={styles.settingDescription}>
                    {liveData.isPrivate ? 'Private stream' : 'Public stream'}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.toggle, 
                liveData.isPrivate && styles.toggleActive
              ]}>
                <View style={[
                  styles.toggleDot,
                  liveData.isPrivate && styles.toggleDotActive
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={20} color="#FF5722" />
          <Text style={styles.infoText}>
            Live streams will be available to your followers and can be discovered by other users based on your privacy settings.
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
            <Text style={styles.uploadButtonText}>Scheduling...</Text>
          </>
        ) : (
          <>
            <MaterialIcons name="live-tv" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>Schedule Live Stream</Text>
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
    borderColor: '#FF5722',
    backgroundColor: '#fff3f0',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  uploadTextSelected: {
    color: '#FF5722',
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
    backgroundColor: '#FF5722',
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
    backgroundColor: '#fff3f0',
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
    backgroundColor: '#FF5722',
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
    backgroundColor: '#FF5722',
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
});
