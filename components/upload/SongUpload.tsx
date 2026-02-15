import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';

interface SongData {
  title: string;
  artist: string;
  description: string;
  tags: string[];
  genre: string;
}

interface SongUploadProps {
  onClose: () => void;
}

export default function SongUpload({ onClose }: SongUploadProps) {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [songData, setSongData] = useState<SongData>({
    title: '',
    artist: '',
    description: '',
    tags: [],
    genre: ''
  });
  const [tagInput, setTagInput] = useState('');

  const genres = [
    'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Electronic', 
    'Classical', 'Jazz', 'Blues', 'Reggae', 'Folk', 'Metal', 'Other'
  ];

  const pickSongs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'audio/*',
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/flac',
          'audio/aac',
          'audio/ogg'
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const validFiles = result.assets.filter(file => 
          file.mimeType && file.mimeType.startsWith('audio/')
        );
        
        if (validFiles.length === 0) {
          Alert.alert('Invalid Files', 'Please select valid audio files');
          return;
        }

        if (selectedFiles.length + validFiles.length > 10) {
          Alert.alert('Limit Exceeded', 'You can upload maximum 10 songs at once');
          return;
        }

        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    } catch (error) {
      console.error('Error picking songs:', error);
      Alert.alert('Error', 'Failed to pick songs');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !songData.tags.includes(trimmedTag)) {
      setSongData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSongData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateAndUpload = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Songs', 'Please select at least one song');
      return;
    }

    if (!songData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your songs');
      return;
    }

    if (!songData.artist.trim()) {
      Alert.alert('Missing Artist', 'Please enter the artist name');
      return;
    }

    if (!songData.genre) {
      Alert.alert('Missing Genre', 'Please select a genre');
      return;
    }

    uploadSongs();
  };

  const uploadSongs = async () => {
    // TODO: Implement upload logic
    Alert.alert('Success', 'Songs uploaded successfully!');
    setSelectedFiles([]);
    setUploading(false);
    setUploadProgress(0);
    onClose();
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
      </View>

      {/* File Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Songs</Text>
        <TouchableOpacity style={styles.selectButton} onPress={pickSongs}>
          <MaterialIcons name="music-note" size={24} color="#6A5ACD" />
          <Text style={styles.selectButtonText}>Choose Audio Files</Text>
        </TouchableOpacity>
        
        {selectedFiles.length > 0 && (
          <View style={styles.filesList}>
            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <MaterialIcons name="audio-file" size={20} color="#6A5ACD" />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <TouchableOpacity onPress={() => removeFile(index)}>
                  <MaterialIcons name="remove-circle" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Song Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Song Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            value={songData.title}
            onChangeText={(text) => setSongData(prev => ({ ...prev, title: text }))}
            placeholder="Enter song title"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Artist *</Text>
          <TextInput
            style={styles.input}
            value={songData.artist}
            onChangeText={(text) => setSongData(prev => ({ ...prev, artist: text }))}
            placeholder="Enter artist name"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Genre *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.genreContainer}>
              {genres.map(genre => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreChip,
                    songData.genre === genre && styles.genreChipSelected
                  ]}
                  onPress={() => setSongData(prev => ({ ...prev, genre }))}
                >
                  <Text style={[
                    styles.genreText,
                    songData.genre === genre && styles.genreTextSelected
                  ]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={songData.description}
            onChangeText={(text) => setSongData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your songs (optional)"
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add tags (press Enter)"
              placeholderTextColor="#666"
              onSubmitEditing={addTag}
            />
            <TouchableOpacity onPress={addTag} style={styles.addTagButton}>
              <MaterialIcons name="add" size={20} color="#6A5ACD" />
            </TouchableOpacity>
          </View>
          {songData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {songData.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Upload Button */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={validateAndUpload}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.uploadButtonText}>
                Uploading... {Math.round(uploadProgress)}%
              </Text>
            </View>
          ) : (
            <Text style={styles.uploadButtonText}>
              Upload {selectedFiles.length} Song{selectedFiles.length !== 1 ? 's' : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#6A5ACD',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 10,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6A5ACD',
  },
  filesList: {
    marginTop: 15,
    gap: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  genreContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genreChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  genreChipSelected: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  genreText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  genreTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  addTagButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 8,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  uploadButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#444444',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
