// ==================== REELS BRIDGE ====================
// Library ID: 593793 - BunnyCDN Stream API
// Dedicated service for Reels upload and management
// NOTE: This bridge only handles BunnyCDN uploads, authentication is handled by MongoDB API

// DIRECT ENV ACCESS: No centralized config, use environment variables directly
const REELS_LIBRARY_ID = process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '593793';
const REELS_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY_REELS || 'cfa113db-233a-453d-ac580bde7245-1219-4537';
const REELS_HOST = process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || 'vz-718b59c2-05f.b-cdn.net';

export interface ReelUploadResult {
  success: boolean;
  videoId?: string;
  url?: string;
  libraryId?: string;
  title?: string;
  description?: string;
  error?: string;
}

export interface ReelMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  userId?: string;
  duration?: number;
}

// BYPASS LOGIN: Default user ID for testing
const DEFAULT_USER_ID = 'guest_user';

/**
 * Reels Bridge - Handles all Reels upload operations
 * Uses BunnyCDN Stream API with Library ID: 593793
 */
export class ReelsBridge {
  // LEVEL 3: Bridge Configuration (from Main Config)
  private readonly config = ENV_CONFIG.bunny.libraries.reels;
  private readonly libraryId = this.config.libraryId;
  private readonly apiKey = this.config.apiKey;
  private readonly host = this.config.hostname;
  private readonly streamKey = this.config.streamKey;

  /**
   * Upload a reel to BunnyCDN Stream
   * @param file - Video file to upload
   * @param metadata - Additional reel metadata
   * @returns Promise<ReelUploadResult>
   */
  async uploadReel(file: any, metadata?: ReelMetadata): Promise<ReelUploadResult> {
    try {
      console.log('🎬 ReelsBridge: Starting reel upload...');
      
      if (!file) {
        throw new Error('No file provided for reel upload');
      }

      // BYPASS LOGIN: Add default user ID if not provided
      const enhancedMetadata = {
        ...metadata,
        userId: metadata?.userId || DEFAULT_USER_ID
      };

      const fileName = file.name || file.fileName || `reel_${Date.now()}.mp4`;
      const fileSize = file.size || file.fileSize || 0;

      // Step 1: Create video entry in BunnyCDN Stream
      const createVideoUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos`;
      
      // Use proper Stream API key from environment
      const apiKey = this.streamKey || this.apiKey;
      
      const createResponse = await fetch(createVideoUrl, {
        method: 'POST',
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ 
          title: enhancedMetadata?.title || fileName.split('.')[0] 
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Reels: Failed to create video entry: ${createResponse.status} - ${errorText}`);
      }

      const videoResult = await createResponse.json();
      console.log('🎬 ReelsBridge: Video entry created:', videoResult.guid);

      // Step 2: Choose upload method based on file size
      const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB
      
      if (fileSize > LARGE_FILE_THRESHOLD) {
        console.log('🎬 ReelsBridge: Using chunk upload for large file');
        await this.uploadInChunks(file, videoResult.guid, metadata);
      } else {
        console.log('🎬 ReelsBridge: Using simple upload for small file');
        await this.simpleUpload(file, videoResult.guid);
      }

      // Step 3: Update metadata if provided
      if (enhancedMetadata && (enhancedMetadata.description || enhancedMetadata.tags)) {
        await this.updateVideoMetadata(videoResult.guid, enhancedMetadata);
      }

      // Step 4: Return success result with secure URL - FAST START OPTIMIZED
      const videoUrl = `https://${this.host}/${videoResult.guid}/playlist.m3u8`;
      
      // Add security token if available - CRITICAL FIX
      console.log('🎬 ReelsBridge: Stream Key:', this.streamKey ? 'SET' : 'MISSING');
      console.log('🎬 ReelsBridge: Host:', this.host);
      console.log('🎬 ReelsBridge: Library ID:', this.libraryId);
      
      const securityToken = this.streamKey ? `?token=${this.streamKey}` : '';
      // BunnyCDN FAST START: Force lowest bitrate for instant start
      // This ensures video starts immediately even on slow networks
      const fastStartUrl = videoUrl + securityToken + '&fast_start=true&bitrate=lowest';
      const secureVideoUrl = fastStartUrl;
      
      console.log('🎬 ReelsBridge: FAST START URL:', secureVideoUrl);

      return {
        success: true,
        videoId: videoResult.guid,
        url: secureVideoUrl,
        libraryId: this.libraryId,
        title: enhancedMetadata?.title || fileName.split('.')[0],
        description: enhancedMetadata?.description || ''
      };

    } catch (error) {
      console.error('🎬❌ ReelsBridge: Upload failed:', error);
      return {
        success: false,
        error: `Reels upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Simple upload for smaller files
   */
  private async simpleUpload(file: any, videoGuid: string): Promise<void> {
    let fileBlob: Blob;
    
    if (file.uri) {
      // React Native file - convert to blob
      const response = await fetch(file.uri);
      fileBlob = await response.blob();
    } else {
      fileBlob = file;
    }

    const uploadUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}`;
    
    // Use proper Stream API key from environment
    const apiKey = this.streamKey || this.apiKey;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/octet-stream'
      },
      body: fileBlob
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Reels: Simple upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    console.log('🎬 ReelsBridge: Simple upload completed');
  }

  /**
   * Chunk upload for large files
   */
  private async uploadInChunks(file: any, videoGuid: string, metadata?: ReelMetadata): Promise<void> {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
    const totalSize = file.size || file.fileSize || 0;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    
    console.log(`🎬 ReelsBridge: Starting chunk upload: ${totalSize} bytes in ${totalChunks} chunks`);

    // Step 1: Initialize upload session
    const initResponse = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}/uploads`, {
      method: 'POST',
      headers: {
        'AccessKey': this.streamKey || this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uploadType: 'chunked'
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Reels: Failed to initialize chunk upload: ${initResponse.status}`);
    }

    const { uploadSessionId } = await initResponse.json();

    // Step 2: Upload chunks with retry logic
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice ? file.slice(start, end) : file;
      
      console.log(`🎬 ReelsBridge: Uploading chunk ${chunkIndex + 1}/${totalChunks}`);

      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('index', chunkIndex.toString());
          formData.append('totalChunks', totalChunks.toString());
          
          const chunkResponse = await fetch(
            `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}/uploads/${uploadSessionId}`,
            {
              method: 'POST',
              headers: {
                'AccessKey': this.streamKey || this.apiKey,
              },
              body: formData
            }
          );
          
          if (chunkResponse.ok) {
            break; // Success, move to next chunk
          } else {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw new Error(`Reels: Chunk ${chunkIndex} upload failed after ${maxRetries} retries: ${chunkResponse.status}`);
            }
            console.log(`🎬 ReelsBridge: Chunk ${chunkIndex} failed, retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          console.log(`🎬 ReelsBridge: Chunk ${chunkIndex} error, retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      console.log(`🎬 ReelsBridge: Upload progress: ${progress}%`);
    }

    // Step 3: Finalize upload
    const finalizeResponse = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}/uploads/${uploadSessionId}/complete`, {
      method: 'POST',
      headers: {
        'AccessKey': this.streamKey || this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        totalChunks: totalChunks
      })
    });

    if (!finalizeResponse.ok) {
      throw new Error(`Reels: Failed to finalize chunk upload: ${finalizeResponse.status}`);
    }

    console.log('🎬 ReelsBridge: Chunk upload completed successfully');
  }

  /**
   * Update video metadata
   */
  private async updateVideoMetadata(videoGuid: string, metadata: ReelMetadata): Promise<void> {
    const updateData: any = {};
    if (metadata.description) updateData.description = metadata.description;
    if (metadata.tags && Array.isArray(metadata.tags)) updateData.tags = metadata.tags;
    
    const updateResponse = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}`, {
      method: 'POST',
      headers: {
        'AccessKey': this.streamKey || this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      console.warn(`🎬 ReelsBridge: Failed to update metadata: ${updateResponse.status}`);
    } else {
      console.log('🎬 ReelsBridge: Metadata updated successfully');
    }
  }

  /**
   * Delete a reel
   */
  async deleteReel(videoId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Reels: Failed to delete reel: ${response.status}`);
      }

      console.log('🎬 ReelsBridge: Reel deleted successfully:', videoId);
      return { success: true };

    } catch (error) {
      console.error('🎬❌ ReelsBridge: Delete failed:', error);
      return {
        success: false,
        error: `Reels delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get reel info
   */
  async getReelInfo(videoId: string): Promise<any> {
    try {
      const getUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      
      const response = await fetch(getUrl, {
        headers: {
          'AccessKey': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Reels: Failed to get reel info: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('🎬❌ ReelsBridge: Get info failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const reelsBridge = new ReelsBridge();
export default reelsBridge;
