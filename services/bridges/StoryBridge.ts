// ==================== STORY BRIDGE ====================
// Storage: storiy - BunnyCDN Storage API
// Dedicated service for Story content upload and management

// DIRECT ENV ACCESS: No centralized config, use environment variables directly
const STORY_STORAGE_NAME = process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_STORY || 'storiy';

export interface StoryUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  size?: number;
  storageZone?: string;
  error?: string;
}

export interface StoryMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  userId?: string;
  duration?: number;
  type?: 'image' | 'video';
  expiresAt?: Date;
}

// BYPASS LOGIN: Default user ID for testing
const DEFAULT_USER_ID = 'guest_user';

/**
 * Story Bridge - Handles all Story content operations
 * Uses BunnyCDN Storage API with Storage Zone: storiy
 */
export class StoryBridge {
  private readonly config = BUNNY_CONFIG.story;
  private readonly storageZoneName = process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_STORY || 'storiy'; // Use from env

  /**
   * Upload story content to BunnyCDN Storage
   * @param file - Story file (image or video) to upload
   * @param metadata - Additional story metadata
   * @returns Promise<StoryUploadResult>
   */
  async uploadStory(file: any, metadata?: StoryMetadata): Promise<StoryUploadResult> {
    try {
      console.log('📖 StoryBridge: Starting story upload...');
      
      if (!file) {
        throw new Error('No file provided for story upload');
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
          'AccessKey': (this.config as any).storageKey || this.config.apiKey,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: fileBlob
      });

      if (!uploadResponse.ok) {
        throw new Error(`Story: Storage upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('📖 StoryBridge: Story uploaded successfully:', fileName);

      return {
        success: true,
        url: `https://${this.config.host}/${this.storageZoneName}/${fileName}`,
        fileName: fileName,
        size: fileSize,
        storageZone: this.storageZoneName
      };

    } catch (error) {
      console.error('📖❌ StoryBridge: Upload failed:', error);
      return {
        success: false,
        error: `Story upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Upload multiple story files (batch upload)
   * @param files - Array of story files
   * @param metadata - Common metadata for all stories
   * @returns Promise<StoryUploadResult[]>
   */
  async uploadMultipleStories(files: any[], metadata?: StoryMetadata): Promise<StoryUploadResult[]> {
    console.log('📖 StoryBridge: Starting batch upload of', files.length, 'stories');
    
    const uploadPromises = files.map((file, index) => {
      const fileMetadata = {
        ...metadata,
        title: metadata?.title ? `${metadata.title} - ${index + 1}` : undefined
      };
      return this.uploadStory(file, fileMetadata);
    });

    try {
      const results = await Promise.allSettled(uploadPromises);
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`📖❌ Story ${index + 1} upload failed:`, result.reason);
          return {
            success: false,
            error: `Story ${index + 1} upload failed: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`
          };
        }
      });
    } catch (error) {
      console.error('📖❌ StoryBridge: Batch upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete story content
   * @param fileName - File name to delete
   * @returns Promise<{ success: boolean; error?: string }>
   */
  async deleteStory(fileName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteUrl = `https://${this.config.host}/${this.storageZoneName}/${fileName}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Story: Failed to delete story: ${response.status}`);
      }

      console.log('📖 StoryBridge: Story deleted successfully:', fileName);
      return { success: true };

    } catch (error) {
      console.error('📖❌ StoryBridge: Delete failed:', error);
      return {
        success: false,
        error: `Story delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get story file info
   * @param fileName - File name to get info for
   * @returns Promise<any>
   */
  async getStoryInfo(fileName: string): Promise<any> {
    try {
      const getUrl = `https://${this.config.host}/${this.storageZoneName}/${fileName}`;
      
      const response = await fetch(getUrl, {
        method: 'HEAD',
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Story: Failed to get story info: ${response.status}`);
      }

      return {
        fileName: fileName,
        size: response.headers.get('Content-Length'),
        type: response.headers.get('Content-Type'),
        lastModified: response.headers.get('Last-Modified')
      };

    } catch (error) {
      console.error('📖❌ StoryBridge: Get info failed:', error);
      throw error;
    }
  }

  /**
   * List all stories in storage zone
   * @returns Promise<any[]>
   */
  async listStories(): Promise<any[]> {
    try {
      const listUrl = `https://${this.config.host}/${this.storageZoneName}/`;
      
      const response = await fetch(listUrl, {
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Story: Failed to list stories: ${response.status}`);
      }

      const data = await response.json();
      return data.ArrayOfFileInfo?.FileInfo || [];

    } catch (error) {
      console.error('📖❌ StoryBridge: List stories failed:', error);
      throw error;
    }
  }

  /**
   * Generate unique filename for story
   */
  private generateFileName(file: any, metadata?: StoryMetadata): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = this.getFileExtension(file);
    
    let baseName = 'story';
    if (metadata?.title) {
      baseName = metadata.title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
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
        'video/mp4': '.mp4',
        'video/mov': '.mov',
        'video/avi': '.avi'
      };
      return extensions[file.type] || '.jpg';
    }
    return '.jpg'; // Default extension
  }

  /**
   * Check if story exists
   * @param fileName - File name to check
   * @returns Promise<boolean>
   */
  async storyExists(fileName: string): Promise<boolean> {
    try {
      await this.getStoryInfo(fileName);
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
        throw new Error(`Story: Failed to get storage stats: ${response.status}`);
      }

      // Note: BunnyCDN Storage doesn't provide detailed stats in the response
      // You might need to implement custom tracking or use their API dashboard
      return {
        storageZone: this.storageZoneName,
        status: 'active'
      };

    } catch (error) {
      console.error('📖❌ StoryBridge: Get storage stats failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storyBridge = new StoryBridge();
export default storyBridge;
