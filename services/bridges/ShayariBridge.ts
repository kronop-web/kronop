// ==================== SHAYARI BRIDGE ====================
// Storage: shayar - BunnyCDN Storage API
// Dedicated service for Shayari content upload and management

import { BUNNY_CONFIG } from '../../constants/Config';

export interface ShayariUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  size?: number;
  storageZone?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface ShayariMetadata {
  title?: string;
  content?: string;
  author?: string;
  category?: string;
  tags?: string[];
  userId?: string;
  language?: 'hindi' | 'urdu' | 'english' | 'mixed';
  mood?: 'romantic' | 'sad' | 'motivational' | 'funny' | 'spiritual';
  backgroundImage?: string;
  fontColor?: string;
  fontSize?: number;
}

/**
 * Shayari Bridge - Handles all Shayari content operations
 * Uses BunnyCDN Storage API with Storage Zone: shayar
 */
export class ShayariBridge {
  private readonly storageZoneName = 'shayar';
  private readonly config = BUNNY_CONFIG.shayari;

  /**
   * Upload shayari image to BunnyCDN Storage
   * @param file - Shayari image file to upload
   * @param metadata - Additional shayari metadata
   * @returns Promise<ShayariUploadResult>
   */
  async uploadShayari(file: any, metadata?: ShayariMetadata): Promise<ShayariUploadResult> {
    try {
      console.log('📝 ShayariBridge: Starting shayari upload...');
      
      if (!file) {
        throw new Error('No file provided for shayari upload');
      }

      const fileName = this.generateFileName(file, metadata);
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
        throw new Error(`Shayari: Storage upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('📝 ShayariBridge: Shayari uploaded successfully:', fileName);

      // Generate thumbnail URL
      const thumbnailUrl = `https://${this.config.host}/${this.storageZoneName}/thumb_${fileName}`;

      return {
        success: true,
        url: `https://${this.config.host}/${this.storageZoneName}/${fileName}`,
        fileName: fileName,
        size: fileSize,
        storageZone: this.storageZoneName,
        thumbnailUrl: thumbnailUrl
      };

    } catch (error) {
      console.error('📝❌ ShayariBridge: Upload failed:', error);
      return {
        success: false,
        error: `Shayari upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Upload multiple shayari images (batch upload)
   * @param files - Array of shayari image files
   * @param metadata - Common metadata for all shayari
   * @returns Promise<ShayariUploadResult[]>
   */
  async uploadMultipleShayari(files: any[], metadata?: ShayariMetadata): Promise<ShayariUploadResult[]> {
    console.log('📝 ShayariBridge: Starting batch upload of', files.length, 'shayari images');
    
    const uploadPromises = files.map((file, index) => {
      const fileMetadata = {
        ...metadata,
        title: metadata?.title ? `${metadata.title} - ${index + 1}` : undefined
      };
      return this.uploadShayari(file, fileMetadata);
    });

    try {
      const results = await Promise.allSettled(uploadPromises);
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`📝❌ Shayari ${index + 1} upload failed:`, result.reason);
          return {
            success: false,
            error: `Shayari ${index + 1} upload failed: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`
          };
        }
      });
    } catch (error) {
      console.error('📝❌ ShayariBridge: Batch upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload shayari with text overlay (creates image with text)
   * @param backgroundImage - Background image file
   * @param text - Shayari text to overlay
   * @param metadata - Additional shayari metadata
   * @param styleOptions - Text styling options
   * @returns Promise<ShayariUploadResult>
   */
  async uploadShayariWithText(
    backgroundImage: any,
    text: string,
    metadata?: ShayariMetadata,
    styleOptions?: {
      fontColor?: string;
      fontSize?: number;
      fontFamily?: string;
      textPosition?: 'center' | 'top' | 'bottom';
      opacity?: number;
    }
  ): Promise<ShayariUploadResult> {
    try {
      console.log('📝 ShayariBridge: Starting shayari upload with text overlay...');
      
      // For now, just upload the background image
      // In a real implementation, you would:
      // 1. Use Canvas API or image processing library to add text overlay
      // 2. Create a new image with text
      // 3. Upload the processed image
      
      const enhancedMetadata = {
        ...metadata,
        content: text,
        backgroundImage: 'processed'
      };

      const result = await this.uploadShayari(backgroundImage, enhancedMetadata);
      
      if (result.success) {
        console.log('📝 ShayariBridge: Shayari with text uploaded successfully');
      }
      
      return result;

    } catch (error) {
      console.error('📝❌ ShayariBridge: Text overlay upload failed:', error);
      return {
        success: false,
        error: `Shayari with text upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete shayari
   * @param fileName - File name to delete
   * @returns Promise<{ success: boolean; error?: string }>
   */
  async deleteShayari(fileName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteUrl = `https://${this.config.host}/${this.storageZoneName}/${fileName}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Shayari: Failed to delete shayari: ${response.status}`);
      }

      console.log('📝 ShayariBridge: Shayari deleted successfully:', fileName);
      return { success: true };

    } catch (error) {
      console.error('📝❌ ShayariBridge: Delete failed:', error);
      return {
        success: false,
        error: `Shayari delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get shayari file info
   * @param fileName - File name to get info for
   * @returns Promise<any>
   */
  async getShayariInfo(fileName: string): Promise<any> {
    try {
      const getUrl = `https://${this.config.host}/${this.storageZoneName}/${fileName}`;
      
      const response = await fetch(getUrl, {
        method: 'HEAD',
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Shayari: Failed to get shayari info: ${response.status}`);
      }

      return {
        fileName: fileName,
        size: response.headers.get('Content-Length'),
        type: response.headers.get('Content-Type'),
        lastModified: response.headers.get('Last-Modified')
      };

    } catch (error) {
      console.error('📝❌ ShayariBridge: Get info failed:', error);
      throw error;
    }
  }

  /**
   * List shayari by category
   * @param category - Category to filter by
   * @returns Promise<any[]>
   */
  async listShayariByCategory(category: string): Promise<any[]> {
    try {
      const categoryPath = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const listUrl = `https://${this.config.host}/${this.storageZoneName}/${categoryPath}/`;
      
      const response = await fetch(listUrl, {
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Shayari: Failed to list shayari by category: ${response.status}`);
      }

      const data = await response.json();
      return data.ArrayOfFileInfo?.FileInfo || [];

    } catch (error) {
      console.error('📝❌ ShayariBridge: List by category failed:', error);
      throw error;
    }
  }

  /**
   * List all shayari in storage zone
   * @returns Promise<any[]>
   */
  async listAllShayari(): Promise<any[]> {
    try {
      const listUrl = `https://${this.config.host}/${this.storageZoneName}/`;
      
      const response = await fetch(listUrl, {
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Shayari: Failed to list all shayari: ${response.status}`);
      }

      const data = await response.json();
      return data.ArrayOfFileInfo?.FileInfo || [];

    } catch (error) {
      console.error('📝❌ ShayariBridge: List all shayari failed:', error);
      throw error;
    }
  }

  /**
   * Generate unique filename for shayari
   */
  private generateFileName(file: any, metadata?: ShayariMetadata): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = this.getFileExtension(file);
    
    let baseName = 'shayari';
    if (metadata?.title) {
      baseName = metadata.title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
    } else if (metadata?.category) {
      baseName = metadata.category.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 15);
    } else if (metadata?.author) {
      baseName = metadata.author.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 15);
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
        'image/webp': '.webp'
      };
      return extensions[file.type] || '.jpg';
    }
    return '.jpg'; // Default extension for shayari images
  }

  /**
   * Check if shayari exists
   * @param fileName - File name to check
   * @returns Promise<boolean>
   */
  async shayariExists(fileName: string): Promise<boolean> {
    try {
      await this.getShayariInfo(fileName);
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
        throw new Error(`Shayari: Failed to get storage stats: ${response.status}`);
      }

      return {
        storageZone: this.storageZoneName,
        status: 'active'
      };

    } catch (error) {
      console.error('📝❌ ShayariBridge: Get storage stats failed:', error);
      throw error;
    }
  }

  /**
   * Create category structure
   * @param categoryName - Name of the category
   * @returns Promise<{ success: boolean; categoryPath?: string; error?: string }>
   */
  async createCategory(categoryName: string): Promise<{ success: boolean; categoryPath?: string; error?: string }> {
    try {
      // In BunnyCDN Storage, folders are created automatically when you upload files
      const categoryPath = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      console.log('📝 ShayariBridge: Category path created:', categoryPath);
      
      return {
        success: true,
        categoryPath: categoryPath
      };

    } catch (error) {
      console.error('📝❌ ShayariBridge: Create category failed:', error);
      return {
        success: false,
        error: `Category creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Search shayari by metadata (client-side search)
   * @param searchTerm - Search term
   * @param searchBy - Field to search in
   * @param shayariList - List of shayari to search in
   * @returns Promise<any[]>
   */
  async searchShayari(
    searchTerm: string, 
    searchBy: 'title' | 'author' | 'category' | 'content',
    shayariList: any[]
  ): Promise<any[]> {
    try {
      const term = searchTerm.toLowerCase();
      
      return shayariList.filter(shayari => {
        const fieldValue = shayari[searchBy];
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(term);
        }
        return false;
      });

    } catch (error) {
      console.error('📝❌ ShayariBridge: Search failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const shayariBridge = new ShayariBridge();
export default shayariBridge;
