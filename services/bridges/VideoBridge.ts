// ==================== VIDEO BRIDGE ====================
// Library ID: 593795 - BunnyCDN Stream API
// Dedicated service for Video upload and management

// DIRECT ENV ACCESS: No centralized config, use environment variables directly
const VIDEO_LIBRARY_ID = process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || '593795';

export interface VideoUploadResult {
  success: boolean;
  videoId?: string;
  url?: string;
  libraryId?: string;
  title?: string;
  description?: string;
  error?: string;
}

export interface VideoMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  userId?: string;
  duration?: number;
  category?: string;
}

// BYPASS LOGIN: Default user ID for testing
const DEFAULT_USER_ID = 'guest_user';

/**
 * Video Bridge - Handles all Video upload operations
 * Uses BunnyCDN Stream API with Library ID: 593795
 */
export class VideoBridge {
  // DIRECT ENV ACCESS: No centralized config, use environment variables directly
  private readonly libraryId = VIDEO_LIBRARY_ID;
  private readonly apiKey = process.env.EXPO_PUBLIC_BUNNY_API_KEY_VIDEO || 'cfa113db-233a-453d-ac580bde7245-1219-4537';
  private readonly host = process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || 'vz-718b59c2-05f.b-cdn.net';

  /**
   * Upload a video to BunnyCDN Stream
   * @param file - Video file to upload
   * @param metadata - Additional video metadata
   * @returns Promise<VideoUploadResult>
   */
  async uploadVideo(file: any, metadata?: VideoMetadata): Promise<VideoUploadResult> {
    try {
      console.log('🎥 VideoBridge: Starting video upload...');
      
      if (!file) {
        throw new Error('No file provided for video upload');
      }

      // BYPASS LOGIN: Add default user ID if not provided
      const enhancedMetadata = {
        ...metadata,
        userId: metadata?.userId || DEFAULT_USER_ID
      };

      const fileName = file.name || file.fileName || `video_${Date.now()}.mp4`;
      const fileSize = file.size || file.fileSize || 0;

      // Step 1: Create video entry in BunnyCDN Stream
      const createVideoUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos`;
      
      const createResponse = await fetch(createVideoUrl, {
        method: 'POST',
        headers: {
          'AccessKey': this.config.streamKey || this.config.apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ 
          title: enhancedMetadata?.title || fileName.split('.')[0] 
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Video: Failed to create video entry: ${createResponse.status} - ${errorText}`);
      }

      const videoResult = await createResponse.json();
      console.log('🎥 VideoBridge: Video entry created:', videoResult.guid);

      // Step 2: Choose upload method based on file size
      const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB
      
      if (fileSize > LARGE_FILE_THRESHOLD) {
        console.log('🎥 VideoBridge: Using chunk upload for large file');
        await this.uploadInChunks(file, videoResult.guid, metadata);
      } else {
        console.log('🎥 VideoBridge: Using simple upload for small file');
        await this.simpleUpload(file, videoResult.guid);
      }

      // Step 3: Update metadata if provided
      if (enhancedMetadata && (enhancedMetadata.description || enhancedMetadata.tags)) {
        await this.updateVideoMetadata(videoResult.guid, enhancedMetadata);
      }

      // Step 4: Return success result with secure URL
      const videoUrl = `https://${this.config.host}/${videoResult.guid}/playlist.m3u8`;
      
      // Add security token if available
      const securityToken = this.config.streamKey ? `?token=${this.config.streamKey}` : '';
      const secureVideoUrl = videoUrl + securityToken;

      return {
        success: true,
        videoId: videoResult.guid,
        url: secureVideoUrl,
        libraryId: this.libraryId,
        title: enhancedMetadata?.title || fileName.split('.')[0],
        description: enhancedMetadata?.description || ''
      };

    } catch (error) {
      console.error('🎥❌ VideoBridge: Upload failed:', error);
      return {
        success: false,
        error: `Video upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': this.config.streamKey || this.config.apiKey,
        'Content-Type': 'application/octet-stream'
      },
      body: fileBlob
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Video: Simple upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    console.log('🎥 VideoBridge: Simple upload completed');
  }

  /**
   * Chunk upload for large files
   */
  private async uploadInChunks(file: any, videoGuid: string, metadata?: VideoMetadata): Promise<void> {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
    const totalSize = file.size || file.fileSize || 0;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    
    console.log(`🎥 VideoBridge: Starting chunk upload: ${totalSize} bytes in ${totalChunks} chunks`);

    // Step 1: Initialize upload session
    const initResponse = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}/uploads`, {
      method: 'POST',
      headers: {
        'AccessKey': this.config.streamKey || this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uploadType: 'chunked'
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Video: Failed to initialize chunk upload: ${initResponse.status}`);
    }

    const { uploadSessionId } = await initResponse.json();

    // Step 2: Upload chunks with retry logic
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice ? file.slice(start, end) : file;
      
      console.log(`🎥 VideoBridge: Uploading chunk ${chunkIndex + 1}/${totalChunks}`);

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
                'AccessKey': this.config.streamKey || this.config.apiKey,
              },
              body: formData
            }
          );
          
          if (chunkResponse.ok) {
            break; // Success, move to next chunk
          } else {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw new Error(`Video: Chunk ${chunkIndex} upload failed after ${maxRetries} retries: ${chunkResponse.status}`);
            }
            console.log(`🎥 VideoBridge: Chunk ${chunkIndex} failed, retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          console.log(`🎥 VideoBridge: Chunk ${chunkIndex} error, retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      console.log(`🎥 VideoBridge: Upload progress: ${progress}%`);
    }

    // Step 3: Finalize upload
    const finalizeResponse = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}/uploads/${uploadSessionId}/complete`, {
      method: 'POST',
      headers: {
        'AccessKey': this.config.streamKey || this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        totalChunks: totalChunks
      })
    });

    if (!finalizeResponse.ok) {
      throw new Error(`Video: Failed to finalize chunk upload: ${finalizeResponse.status}`);
    }

    console.log('🎥 VideoBridge: Chunk upload completed successfully');
  }

  /**
   * Update video metadata
   */
  private async updateVideoMetadata(videoGuid: string, metadata: VideoMetadata): Promise<void> {
    const updateData: any = {};
    if (metadata.description) updateData.description = metadata.description;
    if (metadata.tags && Array.isArray(metadata.tags)) updateData.tags = metadata.tags;
    if (metadata.category) updateData.category = metadata.category;
    
    const updateResponse = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}`, {
      method: 'POST',
      headers: {
        'AccessKey': this.config.streamKey || this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      console.warn(`🎥 VideoBridge: Failed to update metadata: ${updateResponse.status}`);
    } else {
      console.log('🎥 VideoBridge: Metadata updated successfully');
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Video: Failed to delete video: ${response.status}`);
      }

      console.log('🎥 VideoBridge: Video deleted successfully:', videoId);
      return { success: true };

    } catch (error) {
      console.error('🎥❌ VideoBridge: Delete failed:', error);
      return {
        success: false,
        error: `Video delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get video info
   */
  async getVideoInfo(videoId: string): Promise<any> {
    try {
      const getUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      
      const response = await fetch(getUrl, {
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Video: Failed to get video info: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('🎥❌ VideoBridge: Get info failed:', error);
      throw error;
    }
  }

  /**
   * Get video library statistics
   */
  async getLibraryStats(): Promise<any> {
    try {
      const statsUrl = `https://video.bunnycdn.com/library/${this.libraryId}/statistics`;
      
      const response = await fetch(statsUrl, {
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Video: Failed to get library stats: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('🎥❌ VideoBridge: Get stats failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const videoBridge = new VideoBridge();
export default videoBridge;
