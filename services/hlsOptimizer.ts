// HLS Video Optimization Service for Bunny CDN Chunking
// Creates ultra-low latency video segments

interface HLSConfig {
  segmentDuration: number; // 2-3 seconds per segment
  targetDuration: number;
  playlistType: 'live' | 'vod';
  bandwidth: number;
  codecs: string;
  resolution: string;
}

class HLSOptimizerService {
  private defaultConfig: HLSConfig = {
    segmentDuration: 1, // 1-second segments for instant playback
    targetDuration: 2,
    playlistType: 'vod',
    bandwidth: 1000000, // 1Mbps baseline
    codecs: 'avc1.42E01E,mp4a.40.2',
    resolution: '1920x1080'
  };

  // Generate optimized HLS playlist
  generateOptimizedPlaylist(videoUrl: string, config?: Partial<HLSConfig>): string {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Create master playlist
    const masterPlaylist = this.createMasterPlaylist(videoUrl, finalConfig);
    
    // Create media playlist with short segments
    const mediaPlaylist = this.createMediaPlaylist(videoUrl, finalConfig);
    
    return mediaPlaylist;
  }

  // Create master playlist for multiple bitrates
  private createMasterPlaylist(videoUrl: string, config: HLSConfig): string {
    return `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-STREAM-INF:BANDWIDTH=${config.bandwidth},RESOLUTION=${config.resolution},CODECS="${config.codecs}"
${videoUrl}_low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=${config.bandwidth * 2},RESOLUTION=${config.resolution},CODECS="${config.codecs}"
${videoUrl}_medium.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=${config.bandwidth * 4},RESOLUTION=${config.resolution},CODECS="${config.codecs}"
${videoUrl}_high.m3u8`;
  }

  // Create media playlist with 1-second segments
  private createMediaPlaylist(videoUrl: string, config: HLSConfig): string {
    const segments = this.generateSegmentUrls(videoUrl, config);
    
    let playlist = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:${config.targetDuration}
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:${config.playlistType}`;

    segments.forEach((segment, index) => {
      playlist += `\n#EXTINF:${config.segmentDuration.toFixed(3)},`;
      playlist += `\n${segment}`;
    });

    playlist += '\n#EXT-X-ENDLIST';
    
    return playlist;
  }

  // Generate segment URLs for 1-second chunks
  private generateSegmentUrls(videoUrl: string, config: HLSConfig): string[] {
    const segments: string[] = [];
    const totalSegments = Math.ceil(300 / config.segmentDuration); // Assume 5min video
    
    for (let i = 0; i < totalSegments; i++) {
      // Bunny CDN chunked URL pattern
      const segmentUrl = `${videoUrl}/segment_${i.toString().padStart(3, '0')}.ts`;
      segments.push(segmentUrl);
    }
    
    return segments;
  }

  // Optimize video URL for Bunny CDN with chunking
  optimizeForBunnyCDN(videoUrl: string): string {
    // Add Bunny CDN optimization parameters
    const optimizedUrl = new URL(videoUrl);
    
    // Enable chunked transfer encoding
    optimizedUrl.searchParams.set('bunny_chunk_size', '1048576'); // 1MB chunks
    optimizedUrl.searchParams.set('bunny_segment_duration', '1'); // 1-second segments
    optimizedUrl.searchParams.set('bunny_low_latency', 'true');
    optimizedUrl.searchParams.set('bunny_buffer_size', '0.25'); // 0.25 second buffer
    
    return optimizedUrl.toString();
  }

  // Get buffer configuration for expo-video
  getOptimalBufferConfig(): {
    minBufferMs: number;
    maxBufferMs: number;
    bufferForPlaybackMs: number;
    bufferForPlaybackAfterRebufferMs: number;
  } {
    return {
      minBufferMs: 250,    // Start playback with 0.25s buffer
      maxBufferMs: 2000,   // Keep max 2s buffer
      bufferForPlaybackMs: 100,  // Need only 0.1s to start
      bufferForPlaybackAfterRebufferMs: 250  // Quick recovery after rebuffer
    };
  }

  // Convert regular video URL to optimized HLS URL
  convertToOptimizedHLS(videoUrl: string): string {
    if (videoUrl.includes('.m3u8')) {
      // Already HLS, optimize it
      return this.optimizeForBunnyCDN(videoUrl);
    }
    
    // Convert MP4 to HLS (this would typically be done server-side)
    const baseUrl = videoUrl.replace(/\.[^/.]+$/, '');
    return `${baseUrl}/optimized.m3u8`;
  }

  // Validate HLS playlist quality
  validateHLSQuality(playlist: string): {
    isValid: boolean;
    segmentDuration: number;
    segmentCount: number;
    issues: string[];
  } {
    const lines = playlist.split('\n');
    const issues: string[] = [];
    let segmentDuration = 0;
    let segmentCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        const duration = parseFloat(line.split(':')[1]);
        segmentDuration = duration;
        segmentCount++;
        
        if (duration > 2) {
          issues.push(`Segment too long: ${duration}s (should be 1-2s)`);
        }
      }
    }

    return {
      isValid: issues.length === 0,
      segmentDuration,
      segmentCount,
      issues
    };
  }
}

// Singleton instance
export const hlsOptimizerService = new HLSOptimizerService();
