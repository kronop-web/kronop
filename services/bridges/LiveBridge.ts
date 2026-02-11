// ==================== LIVE BRIDGE ====================
// Library ID: 594452 - BunnyCDN Stream API
// Dedicated service for Live streaming content upload and management

import { BUNNY_CONFIG } from '../../constants/Config';

export interface LiveUploadResult {
  success: boolean;
  videoId?: string;
  url?: string;
  libraryId?: string;
  title?: string;
  description?: string;
  streamKey?: string;
  error?: string;
}

export interface LiveMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  userId?: string;
  duration?: number;
  isLive?: boolean;
  streamQuality?: 'low' | 'medium' | 'high' | 'ultra';
}

// BYPASS LOGIN: Default user ID for testing
const DEFAULT_USER_ID = 'guest_user';

/**
 * Live Bridge - Handles all Live streaming content operations
 * Uses BunnyCDN Stream API with Library ID: 594452
 */
export class LiveBridge {
  private readonly libraryId = '594452';
  private readonly config = BUNNY_CONFIG.live;

  /**
   * Upload live stream content to BunnyCDN Stream
   * @param file - Video file to upload (recorded live stream)
   * @param metadata - Additional live metadata
   * @returns Promise<LiveUploadResult>
   */
  async uploadLiveContent(file: any, metadata?: LiveMetadata): Promise<LiveUploadResult> {
    try {
      console.log('🔴 LiveBridge: Starting live content upload...');
      
      if (!file) {
        throw new Error('No file provided for live content upload');
      }

      // BYPASS LOGIN: Add default user ID if not provided
      const enhancedMetadata = {
        ...metadata,
        userId: metadata?.userId || DEFAULT_USER_ID
      };

      const fileName = file.name || file.fileName || `live_${Date.now()}.mp4`;
      const fileSize = file.size || file.fileSize || 0;

      // Step 1: Create video entry in BunnyCDN Stream
      const createVideoUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos`;
      
      const createResponse = await fetch(createVideoUrl, {
        method: 'POST',
        headers: {
          'AccessKey': this.config.apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ 
          title: enhancedMetadata?.title || fileName.split('.')[0] 
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Live: Failed to create video entry: ${createResponse.status} - ${errorText}`);
      }

      const videoResult = await createResponse.json();
      console.log('🔴 LiveBridge: Video entry created:', videoResult.guid);

      // Step 2: Choose upload method based on file size
      const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB
      
      if (fileSize > LARGE_FILE_THRESHOLD) {
        console.log('🔴 LiveBridge: Using chunk upload for large file');
        await this.uploadInChunks(file, videoResult.guid, metadata);
      } else {
        console.log('🔴 LiveBridge: Using simple upload for small file');
        await this.simpleUpload(file, videoResult.guid);
      }

      // Step 3: Update metadata if provided
      if (enhancedMetadata && (enhancedMetadata.description || enhancedMetadata.tags)) {
        await this.updateVideoMetadata(videoResult.guid, enhancedMetadata);
      }

      // Step 4: Return success result
      const videoUrl = `https://${this.config.host}/${videoResult.guid}/playlist.m3u8`;

      return {
        success: true,
        videoId: videoResult.guid,
        url: videoUrl,
        libraryId: this.libraryId,
        title: enhancedMetadata?.title || fileName.split('.')[0],
        description: enhancedMetadata?.description || '',
        streamKey: this.generateStreamKey(videoResult.guid)
      };

    } catch (error) {
      console.error('🔴❌ LiveBridge: Upload failed:', error);
      return {
        success: false,
        error: `Live content upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create a live stream (for real-time streaming)
   * @param metadata - Live stream metadata
   * @returns Promise<LiveUploadResult>
   */
  async createLiveStream(metadata?: LiveMetadata): Promise<LiveUploadResult> {
    try {
      console.log('🔴 LiveBridge: Creating live stream...');
      
      const createVideoUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos`;
      
      const createResponse = await fetch(createVideoUrl, {
        method: 'POST',
        headers: {
          'AccessKey': this.config.apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ 
          title: metadata?.title || `Live Stream ${Date.now()}`,
          isLive: true
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Live: Failed to create live stream: ${createResponse.status} - ${errorText}`);
      }

      const videoResult = await createResponse.json();
      console.log('🔴 LiveBridge: Live stream created:', videoResult.guid);

      // Update metadata if provided
      if (metadata) {
        await this.updateVideoMetadata(videoResult.guid, metadata);
      }

      const streamKey = this.generateStreamKey(videoResult.guid);
      const rtmpUrl = `rtmp://video.bunnycdn.com/library/${this.libraryId}`;
      const playbackUrl = `https://${this.config.host}/${videoResult.guid}/playlist.m3u8`;

      return {
        success: true,
        videoId: videoResult.guid,
        url: playbackUrl,
        libraryId: this.libraryId,
        title: metadata?.title || `Live Stream ${Date.now()}`,
        description: metadata?.description || '',
        streamKey: streamKey
      };

    } catch (error) {
      console.error('🔴❌ LiveBridge: Create live stream failed:', error);
      return {
        success: false,
        error: `Live stream creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        'AccessKey': this.config.apiKey,
        'Content-Type': 'application/octet-stream'
      },
      body: fileBlob
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Live: Simple upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    console.log('🔴 LiveBridge: Simple upload completed');
  }

  /**
   * Chunk upload for large files
   */
  private async uploadInChunks(file: any, videoGuid: string, metadata?: LiveMetadata): Promise<void> {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
    const totalSize = file.size || file.fileSize || 0;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    
    console.log(`🔴 LiveBridge: Starting chunk upload: ${totalSize} bytes in ${totalChunks} chunks`);

    // Step 1: Initialize upload session
    const initResponse = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}/uploads`, {
      method: 'POST',
      headers: {
        'AccessKey': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uploadType: 'chunked'
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Live: Failed to initialize chunk upload: ${initResponse.status}`);
    }

    const { uploadSessionId } = await initResponse.json();

    // Step 2: Upload chunks with retry logic
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice ? file.slice(start, end) : file;
      
      console.log(`🔴 LiveBridge: Uploading chunk ${chunkIndex + 1}/${totalChunks}`);

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
                'AccessKey': this.config.apiKey,
              },
              body: formData
            }
          );
          
          if (chunkResponse.ok) {
            break; // Success, move to next chunk
          } else {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw new Error(`Live: Chunk ${chunkIndex} upload failed after ${maxRetries} retries: ${chunkResponse.status}`);
            }
            console.log(`🔴 LiveBridge: Chunk ${chunkIndex} failed, retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          console.log(`🔴 LiveBridge: Chunk ${chunkIndex} error, retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      console.log(`🔴 LiveBridge: Upload progress: ${progress}%`);
    }

    // Step 3: Finalize upload
    const finalizeResponse = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}/uploads/${uploadSessionId}/complete`, {
      method: 'POST',
      headers: {
        'AccessKey': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        totalChunks: totalChunks
      })
    });

    if (!finalizeResponse.ok) {
      throw new Error(`Live: Failed to finalize chunk upload: ${finalizeResponse.status}`);
    }

    console.log('🔴 LiveBridge: Chunk upload completed successfully');
  }

  /**
   * Update video metadata
   */
  private async updateVideoMetadata(videoGuid: string, metadata: LiveMetadata): Promise<void> {
    const updateData: any = {};
    if (metadata.description) updateData.description = metadata.description;
    if (metadata.tags && Array.isArray(metadata.tags)) updateData.tags = metadata.tags;
    if (metadata.isLive !== undefined) updateData.isLive = metadata.isLive;
    if (metadata.streamQuality) updateData.streamQuality = metadata.streamQuality;
    
    const updateResponse = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}`, {
      method: 'POST',
      headers: {
        'AccessKey': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      console.warn(`🔴 LiveBridge: Failed to update metadata: ${updateResponse.status}`);
    } else {
      console.log('🔴 LiveBridge: Metadata updated successfully');
    }
  }

  /**
   * Generate stream key for live streaming
   */
  private generateStreamKey(videoGuid: string): string {
    return `live_${videoGuid}_${Date.now()}`;
  }

  /**
   * Delete live content
   */
  async deleteLiveContent(videoId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Live: Failed to delete live content: ${response.status}`);
      }

      console.log('🔴 LiveBridge: Live content deleted successfully:', videoId);
      return { success: true };

    } catch (error) {
      console.error('🔴❌ LiveBridge: Delete failed:', error);
      return {
        success: false,
        error: `Live content delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get live content info
   */
  async getLiveContentInfo(videoId: string): Promise<any> {
    try {
      const getUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      
      const response = await fetch(getUrl, {
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Live: Failed to get live content info: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('🔴❌ LiveBridge: Get info failed:', error);
      throw error;
    }
  }

  /**
   * Get live stream statistics
   */
  async getLiveStreamStats(videoId: string): Promise<any> {
    try {
      const statsUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}/statistics`;
      
      const response = await fetch(statsUrl, {
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Live: Failed to get live stream stats: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('🔴❌ LiveBridge: Get stats failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const liveBridge = new LiveBridge();
export default liveBridge;
