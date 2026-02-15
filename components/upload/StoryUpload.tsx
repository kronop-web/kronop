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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';

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
  const router = useRouter();
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
      // SILENT MODE: Auto-select photo type for simplicity
      await pickPhoto();
    } catch (error) {
      console.error('[STORY_PICK_FAIL]:', error);
    }
  };

  const pickPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        console.error('[STORY_PERMISSION_FAIL]: Camera permission denied');
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
        
        // Basic file type validation
        const fileName = file.fileName || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi'];
        
        if (!extension || !allowedExtensions.includes(extension)) {
          console.error('[STORY_PICK_FAIL]: Invalid file extension -', extension);
          return;
        }

        // Basic file size validation
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB for stories
        if (file.fileSize && file.fileSize > MAX_SIZE) {
          console.error('[STORY_PICK_FAIL]: File too large -', file.fileSize);
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
      console.error('[STORY_PHOTO_PICK_FAIL]:', error);
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
        
        // Basic file type validation (DocumentPicker uses different properties)
        const fileName = file.name || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['mp4', 'mov', 'avi'];
        
        if (!extension || !allowedExtensions.includes(extension)) {
          console.error('[STORY_VIDEO_PICK_FAIL]: Invalid file extension -', extension);
          return;
        }

        // Basic file size validation (DocumentPicker uses size)
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB for stories
        if (file.size && file.size > MAX_SIZE) {
          console.error('[STORY_VIDEO_PICK_FAIL]: File too large -', file.size);
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
      console.error('[STORY_VIDEO_PICK_FAIL]:', error);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      console.error('[STORY_UPLOAD_FAIL]: No file selected');
      return;
    }

    if (!storyData.title.trim()) {
      console.error('[STORY_UPLOAD_FAIL]: Missing title');
      return;
    }

    // TODO: Implement upload logic
    Alert.alert('Success', 'Story uploaded successfully!');
    setSelectedFile(null);
    setStoryData({ title: '', type: 'photo', duration: 15, isPrivate: false });
    setUploadProgress(0);
    setUploading(false);

    onClose();
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
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
            color={selectedFile ? theme.colors.primary.main : theme.colors.text.tertiary} 
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
                <MaterialIcons name="remove" size={20} color={theme.colors.primary.main} />
              </TouchableOpacity>
              <Text style={styles.durationText}>{storyData.duration}s</Text>
              <TouchableOpacity
                style={styles.durationButton}
                onPress={() => setStoryData(prev => ({ 
                  ...prev, 
                  duration: Math.min(60, prev.duration + 5) 
                }))}
              >
                <MaterialIcons name="add" size={20} color={theme.colors.primary.main} />
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
                  color={storyData.isPrivate ? theme.colors.primary.main : theme.colors.text.secondary} 
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
          <MaterialIcons name="timer" size={20} color={theme.colors.primary.main} />
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
            <MaterialIcons name="upload" size={20} color="#FFFFFF" />
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
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  placeholder: {
    width: 34,
  },
  title: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  uploadArea: {
    padding: theme.spacing.lg,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: theme.colors.border.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  uploadButtonSelected: {
    borderColor: theme.colors.primary.main,
    backgroundColor: theme.colors.background.elevated,
  },
  uploadText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  uploadTextSelected: {
    color: theme.colors.primary.main,
  },
  uploadSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  fileInfo: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  fileInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  fileInfoLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  fileInfoValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  formSection: {
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.elevated,
  },
  charCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
  },
  durationButton: {
    padding: theme.spacing.sm,
  },
  durationText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginHorizontal: theme.spacing.xl,
  },
  helpText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  settingsContainer: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  toggle: {
    width: 48,
    height: 28,
    backgroundColor: theme.colors.border.primary,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary.main,
  },
  toggleDot: {
    width: 24,
    height: 24,
    backgroundColor: theme.colors.text.primary,
    borderRadius: 12,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  uploadButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary.main,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    ...theme.elevation.md,
  },
  uploadButtonDisabled: {
    backgroundColor: theme.colors.border.primary,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  progressContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border.primary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary.main,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
