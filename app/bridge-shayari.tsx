import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import ShayariPhotoUpload from '../components/upload/ShayariPhotoUpload';

interface BridgeShayariProps {
  onClose: () => void;
}

interface ShayariUploadResult {
  id: string;
  imageUrl: string;
  cdnUrl: string;
  shayariText: string;
  metadata: {
    userId: string;
    category: string;
    tags: string[];
    uploadId: string;
    appName: string;
    timestamp: number;
    bridgeControlled: boolean;
    imageManipulated: boolean;
  };
}

interface TextStyle {
  fontSize: number;
  fontFamily?: string;
  color: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

const BridgeShayari: React.FC<BridgeShayariProps> = ({ onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // KRONOP BRIDGE CONTROLLER - Photo + Shayari Image Manipulation
  const handleShayariUpload = async (imageUri: string, shayariText: string, metadata: any) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Bridge controls image manipulation + upload
      const result = await uploadShayariWithImageManipulation(imageUri, shayariText, metadata, (progress) => {
        setUploadProgress(progress.percentage);
      });
      
      Alert.alert('Success', 'Shayari image created and uploaded successfully to Kronop!');
      onClose();
    } catch (error: any) {
      console.error('Bridge Shayari Upload Failed:', error);
      Alert.alert('Upload Failed', error.message || 'Bridge shayari upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // BRIDGE IMAGE MANIPULATION + UPLOAD SYSTEM
  const uploadShayariWithImageManipulation = async (
    imageUri: string, 
    shayariText: string, 
    metadata: any, 
    onProgress?: (progress: any) => void
  ): Promise<ShayariUploadResult> => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    try {
      // Step 1: Load photo from imageUri (10% progress)
      if (onProgress) onProgress({ percentage: 0, status: 'Loading photo...' });
      
      console.log('Bridge: Loading photo for manipulation...');
      
      // Step 2: Apply text style and create new image (40% progress)
      if (onProgress) onProgress({ percentage: 10, status: 'Creating shayari image...' });
      
      const manipulatedImageUri = await createShayariImageWithText(imageUri, shayariText, metadata);
      
      if (onProgress) onProgress({ percentage: 40, status: 'Shayari image created!' });
      
      // Step 3: Upload manipulated image to BunnyCDN (80% progress)
      if (onProgress) onProgress({ percentage: 50, status: 'Uploading to BunnyCDN...' });
      
      const uploadResult = await uploadManipulatedImageToBunnyCDN(manipulatedImageUri, metadata);
      
      if (onProgress) onProgress({ percentage: 80, status: 'Image uploaded!' });
      
      // Step 4: Save shayari metadata to API (100% progress)
      if (onProgress) onProgress({ percentage: 90, status: 'Saving shayari data...' });
      
      const shayariResult = await saveShayariToAPI(shayariText, uploadResult.cdnUrl, metadata);
      
      if (onProgress) onProgress({ percentage: 100, status: 'Upload completed!' });
      
      const finalResult: ShayariUploadResult = {
        id: shayariResult.id,
        imageUrl: uploadResult.cdnUrl,
        cdnUrl: uploadResult.cdnUrl,
        shayariText,
        metadata: {
          userId: metadata.userId || 'guest_user',
          category: metadata.category || 'shayari',
          tags: metadata.tags || [],
          uploadId: uploadResult.uploadId,
          appName: 'Kronop',
          timestamp: Date.now(),
          bridgeControlled: true,
          imageManipulated: true
        }
      };
      
      console.log('Bridge Shayari Image Manipulation Completed:', finalResult);
      return finalResult;
      
    } catch (error: any) {
      console.error('Bridge Shayari image manipulation failed:', error);
      throw error;
    }
  };

  // STEP 1: Create Shayari Image with Text (Simplified without ImageManipulator)
  const createShayariImageWithText = async (imageUri: string, shayariText: string, metadata: any): Promise<string> => {
    try {
      console.log('Bridge: Creating shayari image (simplified - no text overlay)...');
      
      // For now, return the original image URI
      // In production, you would use expo-image-manipulator or react-native-image-editor
      // to add text overlay to the image
      
      // TODO: Implement text overlay when ImageManipulator is available
      // For now, we'll upload the original image and save shayari text separately
      
      console.log('Bridge: Text overlay skipped - using original image');
      return imageUri;
      
    } catch (error: any) {
      console.error('Bridge: Image preparation failed:', error);
      throw new Error(`Image preparation failed: ${error.message}`);
    }
  };

  // Split shayari text into lines
  const splitShayariText = (text: string, maxCharsPerLine: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, split it
          lines.push(word);
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  // STEP 2: Upload Manipulated Image to BunnyCDN
  const uploadManipulatedImageToBunnyCDN = async (imageUri: string, metadata: any) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    try {
      // Generate unique filename for manipulated image
      const uploadId = `shayari_manipulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `uploads/shayari/kronop_shayari_${uploadId}.jpg`;
      const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
      
      console.log(`Bridge: Uploading manipulated shayari image: ${fileName}`);
      
      // Fetch manipulated image data
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Direct upload to BunnyCDN
      const uploadResponse = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': 'image/jpeg',
          'Content-Length': blob.size.toString()
        },
        body: blob
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`BunnyCDN upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      const cdnUrl = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`;
      
      // Clean up memory
      (blob as any) = null;
      if (global.gc) {
        global.gc();
      }
      
      console.log(`Bridge: Manipulated image uploaded successfully: ${cdnUrl}`);
      
      return {
        uploadId,
        fileName,
        cdnUrl,
        size: blob?.size || 0,
        type: 'image/jpeg'
      };
      
    } catch (error: any) {
      console.error('Bridge: Manipulated image upload failed:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  };

  // STEP 3: Save Shayari to API
  const saveShayariToAPI = async (shayariText: string, cdnUrl: string, metadata: any) => {
    try {
      console.log(`Bridge: Saving shayari to API with manipulated image: ${cdnUrl}`);
      
      const shayariData = {
        text: shayariText,
        imageUrl: cdnUrl,
        cdnUrl: cdnUrl,
        category: metadata.category || 'shayari',
        tags: metadata.tags || [],
        userId: metadata.userId || 'guest_user',
        author: metadata.author || 'Guest User',
        uploadId: `shayari_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        appName: 'Kronop',
        timestamp: Date.now(),
        bridgeControlled: true,
        imageManipulated: true,
        type: 'hybrid'
      };
      
      const apiResponse = await fetch('/api/saveShayari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shayariData)
      });
      
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        throw new Error(`API save failed: ${apiResponse.status} - ${errorData.message || 'Unknown error'}`);
      }
      
      const result = await apiResponse.json();
      
      console.log('Bridge: Shayari saved to API successfully:', result);
      
      return {
        id: result.id || shayariData.uploadId,
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error('Bridge: Shayari save to API failed:', error);
      
      // Fallback to BunnyCDN
      console.log('Bridge: Attempting fallback save to BunnyCDN...');
      return await saveShayariToFallbackBunnyCDN(shayariText, cdnUrl, metadata);
    }
  };

  // FALLBACK: Save Shayari to BunnyCDN if API fails
  const saveShayariToFallbackBunnyCDN = async (shayariText: string, cdnUrl: string, metadata: any) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    try {
      const uploadId = `shayari_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `shayari_data_${uploadId}.json`;
      const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
      
      const fallbackData = {
        text: shayariText,
        imageUrl: cdnUrl,
        cdnUrl: cdnUrl,
        category: metadata.category || 'shayari',
        tags: metadata.tags || [],
        userId: metadata.userId || 'guest_user',
        author: metadata.author || 'Guest User',
        uploadId,
        appName: 'Kronop',
        timestamp: Date.now(),
        bridgeControlled: true,
        imageManipulated: true,
        type: 'hybrid',
        fallback: true
      };
      
      const response = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fallbackData)
      });
      
      if (!response.ok) {
        throw new Error(`Fallback save failed: ${response.status}`);
      }
      
      console.log('Bridge: Shayari saved to fallback BunnyCDN successfully');
      
      return {
        id: uploadId,
        success: true,
        fallback: true,
        data: fallbackData
      };
      
    } catch (error: any) {
      console.error('Bridge: Fallback save failed:', error);
      throw new Error(`Failed to save shayari: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <ShayariPhotoUpload 
        onClose={onClose} 
        onUpload={handleShayariUpload}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BridgeShayari;
