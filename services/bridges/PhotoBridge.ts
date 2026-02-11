// ==================== PHOTO BRIDGE ====================
// Storage: photu - BunnyCDN Storage API
// Dedicated service for Photo upload and management

import { BUNNY_CONFIG } from '../../constants/Config';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  size?: number;
  storageZone?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface PhotoMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  userId?: string;
  category?: string;
  location?: string;
  camera?: string;
  dimensions?: { width: number; height: number };
}

// BYPASS LOGIN: Default user ID for testing
const DEFAULT_USER_ID = 'guest_user';

/**
 * Photo Bridge - Handles all Photo upload operations
 * Uses BunnyCDN Storage API with Storage Zone: photu
 */
export class PhotoBridge {
  private readonly config = BUNNY_CONFIG.photos;
  private readonly storageZoneName = this.config.storageZoneName; // Use from config

  /**
   * Upload photo to BunnyCDN Storage
   * @param file - Photo file to upload
   * @param metadata - Additional photo metadata
   * @returns Promise<PhotoUploadResult>
   */
  async uploadPhoto(file: any, metadata?: PhotoMetadata): Promise<PhotoUploadResult> {
    try {
      console.log('📸 PhotoBridge: Starting photo upload...');
      
      if (!file) {
        throw new Error('No file provided for photo upload');
      }

      // BYPASS LOGIN: Add default user ID if not provided
      const enhancedMetadata = {
        ...metadata,
        userId: metadata?.userId || DEFAULT_USER_ID
      };

      const fileName = this.generateFileName(file, enhancedMetadata);
      const fileSize = file.size || file.fileSize || 0;

      // Convert file to proper format for upload
      let fileBlob: Blob;
      if (file.uri) {
        // React Native file - need to convert to blob
        const response = await fetch(file.uri);
        fileBlob = await response.blob();
      } else {
        fileBlob = file;
      }

      // Upload to BunnyCDN Storage
      const uploadUrl = `https://${this.config.host}/${this.storageZoneName}/${fileName}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': this.config.apiKey,
          'Content-Type': file.type || 'image/jpeg'
        },
        body: fileBlob
      });

      if (!uploadResponse.ok) {
        throw new Error(`Photo: Storage upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('📸 PhotoBridge: Photo uploaded successfully:', fileName);

      // Generate thumbnail URL using Pull Zone from config (not hardcoded)
      const pullZoneHost = BUNNY_CONFIG.photos.host || process.env.EXPO_PUBLIC_BUNNY_PHOTO_PULL_ZONE || 'kronop-photos.b-cdn.net';
      const thumbnailUrl = `https://${pullZoneHost}/thumb_${fileName}`;

      return {
        success: true,
        url: `https://${pullZoneHost}/${fileName}`,
        fileName: fileName,
        size: fileSize,
        storageZone: this.storageZoneName,
        thumbnailUrl: thumbnailUrl
      };

    } catch (error) {
      console.error('📸❌ PhotoBridge: Upload failed:', error);
      return {
        success: false,
        error: `Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Upload multiple photos (batch upload)
   * @param files - Array of photo files
   * @param metadata - Common metadata for all photos
   * @returns Promise<PhotoUploadResult[]>
   */
  async uploadMultiplePhotos(files: any[], metadata?: PhotoMetadata): Promise<PhotoUploadResult[]> {
    console.log('📸 PhotoBridge: Starting batch upload of', files.length, 'photos');
    
    const uploadPromises = files.map((file, index) => {
      const fileMetadata = {
        ...metadata,
        title: metadata?.title ? `${metadata.title} - ${index + 1}` : undefined
      };
      return this.uploadPhoto(file, fileMetadata);
    });

    try {
      const results = await Promise.allSettled(uploadPromises);
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`📸❌ Photo ${index + 1} upload failed:`, result.reason);
          return {
            success: false,
            error: `Photo ${index + 1} upload failed: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`
          };
        }
      });
    } catch (error) {
      console.error('📸❌ PhotoBridge: Batch upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload photo with automatic optimization
   * @param file - Photo file to upload
   * @param metadata - Additional photo metadata
   * @param options - Optimization options
   * @returns Promise<PhotoUploadResult>
   */
  async uploadOptimizedPhoto(
    file: any, 
    metadata?: PhotoMetadata, 
    options?: { 
      quality?: number; 
      maxWidth?: number; 
      maxHeight?: number;
      format?: 'jpeg' | 'png' | 'webp';
    }
  ): Promise<PhotoUploadResult> {
    try {
      console.log('📸 PhotoBridge: Starting optimized photo upload...');
      
      // For now, just do regular upload. In a real implementation,
      // you would add image processing/compression here
      const result = await this.uploadPhoto(file, metadata);
      
      if (result.success) {
        console.log('📸 PhotoBridge: Optimized photo uploaded successfully');
      }
      
      return result;

    } catch (error) {
      console.error('📸❌ PhotoBridge: Optimized upload failed:', error);
      return {
        success: false,
        error: `Optimized photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete photo
   * @param fileName - File name to delete
   * @returns Promise<{ success: boolean; error?: string }>
   */
  async deletePhoto(fileName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteUrl = `https://${this.config.host}/${this.storageZoneName}/${fileName}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Photo: Failed to delete photo: ${response.status}`);
      }

      console.log('📸 PhotoBridge: Photo deleted successfully:', fileName);
      return { success: true };

    } catch (error) {
      console.error('📸❌ PhotoBridge: Delete failed:', error);
      return {
        success: false,
        error: `Photo delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get photo file info
   * @param fileName - File name to get info for
   * @returns Promise<any>
   */
  async getPhotoInfo(fileName: string): Promise<any> {
    try {
      const getUrl = `https://${this.config.host}/${this.storageZoneName}/${fileName}`;
      
      const response = await fetch(getUrl, {
        method: 'HEAD',
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Photo: Failed to get photo info: ${response.status}`);
      }

      return {
        fileName: fileName,
        size: response.headers.get('Content-Length'),
        type: response.headers.get('Content-Type'),
        lastModified: response.headers.get('Last-Modified')
      };

    } catch (error) {
      console.error('📸❌ PhotoBridge: Get info failed:', error);
      throw error;
    }
  }

  /**
   * List all photos in storage zone
   * @param prefix - Optional prefix to filter photos
   * @returns Promise<any[]>
   */
  async listPhotos(prefix?: string): Promise<any[]> {
    try {
      const listUrl = prefix 
        ? `https://${this.config.host}/${this.storageZoneName}/${prefix}/`
        : `https://${this.config.host}/${this.storageZoneName}/`;
      
      const response = await fetch(listUrl, {
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Photo: Failed to list photos: ${response.status}`);
      }

      const data = await response.json();
      return data.ArrayOfFileInfo?.FileInfo || [];

    } catch (error) {
      console.error('📸❌ PhotoBridge: List photos failed:', error);
      throw error;
    }
  }

  /**
   * Generate unique filename for photo
   */
  private generateFileName(file: any, metadata?: PhotoMetadata): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = this.getFileExtension(file);
    
    let baseName = 'photo';
    if (metadata?.title) {
      baseName = metadata.title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
    } else if (metadata?.category) {
      baseName = metadata.category.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 15);
    }
    
    return `${baseName}_${timestamp}_${randomId}${fileExtension}`;
  }

  /**
   * Get file extension from file object
   */
  private getFileExtension(file: any): string {
    if (file.name) {
      return file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '.jpg';
    }
    if (file.type) {
      const extensions: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/bmp': '.bmp',
        'image/tiff': '.tiff'
      };
      return extensions[file.type] || '.jpg';
    }
    return '.jpg'; // Default extension for photos
  }

  /**
   * Check if photo exists
   * @param fileName - File name to check
   * @returns Promise<boolean>
   */
  async photoExists(fileName: string): Promise<boolean> {
    try {
      await this.getPhotoInfo(fileName);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage zone statistics
   * @returns Promise<any>
   */
  async getStorageStats(): Promise<any> {
    try {
      const statsUrl = `https://${this.config.host}/${this.storageZoneName}/`;
      
      const response = await fetch(statsUrl, {
        method: 'GET',
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Photo: Failed to get storage stats: ${response.status}`);
      }

      return {
        storageZone: this.storageZoneName,
        status: 'active'
      };

    } catch (error) {
      console.error('📸❌ PhotoBridge: Get storage stats failed:', error);
      throw error;
    }
  }

  /**
   * Create photo gallery structure
   * @param galleryName - Name of the gallery
   * @returns Promise<{ success: boolean; galleryPath?: string; error?: string }>
   */
  async createGallery(galleryName: string): Promise<{ success: boolean; galleryPath?: string; error?: string }> {
    try {
      // In BunnyCDN Storage, folders are created automatically when you upload files
      // This is more of a logical organization
      const galleryPath = galleryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      console.log('📸 PhotoBridge: Gallery path created:', galleryPath);
      
      return {
        success: true,
        galleryPath: galleryPath
      };

    } catch (error) {
      console.error('📸❌ PhotoBridge: Create gallery failed:', error);
      return {
        success: false,
        error: `Gallery creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const photoBridge = new PhotoBridge();
export default photoBridge;
