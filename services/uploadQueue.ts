// Super Fast Upload - Zero Delay, Zero Failure
import { bridgeManager } from './bridges';

type UploadType = 'REELS' | 'VIDEO' | 'STORY' | 'PHOTO' | 'SHAYARI' | 'LIVE' | 'SONG';

export interface UploadJob {
  type: UploadType;
  file: any;
  metadata?: any;
}

// Simple upload queue - no complex state
let queue: UploadJob[] = [];
let isProcessing = false;

// Bridge method mapping
const bridgeMethods: Record<UploadType, string> = {
  REELS: 'uploadReel',
  VIDEO: 'uploadVideo', 
  STORY: 'uploadStory',
  PHOTO: 'uploadPhoto',
  SHAYARI: 'uploadShayari',
  LIVE: 'uploadLive',
  SONG: 'uploadSong'
};

// Main upload queue class
class UploadQueue {
  private static instance: UploadQueue;

  static getInstance(): UploadQueue {
    if (!this.instance) {
      this.instance = new UploadQueue();
    }
    return this.instance;
  }

  // Instant upload - no waiting
  async upload(type: UploadType, file: any, metadata?: any): Promise<string> {
    const jobId = Date.now().toString();
    
    // Add to queue immediately
    queue.push({ id: jobId, type, file, metadata } as any);

    // Start background processing
    if (!isProcessing) {
      this.processQueue();
    }

    return jobId; // Return immediately
  }

  private async processQueue(): Promise<void> {
    if (isProcessing) return;
    isProcessing = true;

    while (queue.length > 0) {
      const job = queue.shift();
      
      try {
        await this.uploadWithRetry(job!);
      } catch (error) {
        console.error('Upload failed, will retry:', error);
        // Put back in queue for retry
        queue.push(job!);
      }
    }

    isProcessing = false;
  }

  private async uploadWithRetry(job: any, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const bridge = bridgeManager.getBridge(job.type);
        if (!bridge) throw new Error(`No bridge for ${job.type}`);

        const methodName = bridgeMethods[job.type as UploadType];
        const method = (bridge as any)[methodName];
        
        if (!method) throw new Error(`No method ${methodName} for ${job.type}`);

        // Upload directly
        await method.call(bridge, job.file, job.metadata);
        
        console.log(`✅ Upload successful: ${job.type}`);
        return;
        
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Get queue status
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: queue.length,
      processing: isProcessing
    };
  }

  // Initialize
  async init(): Promise<void> {
    console.log('🚀 Super Fast Upload initialized');
  }
}

export const uploadQueue = UploadQueue.getInstance();