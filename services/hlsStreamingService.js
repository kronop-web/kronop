// Advanced HLS Streaming Service with Bunny CDN Integration
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { BUNNY_CONFIG } = require('../config/bunnyConfig');

class HLSStreamingService {
  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    this.hlsDir = path.resolve(process.cwd(), 'hls');
    this.bunnyApiKey = BUNNY_CONFIG.photos.apiKey;
    
    // Ensure directories exist
    [this.uploadDir, this.hlsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  // Convert video to optimized HLS for Bunny CDN
  async convertToHLS(inputVideoPath, outputName) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.hlsDir, outputName);
      
      // Multiple bitrate renditions for adaptive streaming
      const renditions = [
        {
          resolution: '426x240',
          videoBitrate: '400k',
          audioBitrate: '64k',
          outputName: `${outputName}_240p`
        },
        {
          resolution: '640x360',
          videoBitrate: '800k',
          audioBitrate: '96k',
          outputName: `${outputName}_360p`
        },
        {
          resolution: '854x480',
          videoBitrate: '1200k',
          audioBitrate: '128k',
          outputName: `${outputName}_480p`
        },
        {
          resolution: '1280x720',
          videoBitrate: '2500k',
          audioBitrate: '192k',
          outputName: `${outputName}_720p`
        }
      ];

      // Create master playlist
      const masterPlaylist = this.createMasterPlaylist(renditions, outputName);
      fs.writeFileSync(path.join(this.hlsDir, `${outputName}.m3u8`), masterPlaylist);

      // Process each rendition
      const promises = renditions.map(rendition => 
        this.processRendition(inputVideoPath, rendition)
      );

      Promise.all(promises)
        .then(() => {
          console.log(`✅ HLS conversion complete: ${outputName}`);
          resolve({
            masterPlaylist: `${outputName}.m3u8`,
            renditions: renditions.map(r => `${r.outputName}.m3u8`)
          });
        })
        .catch(reject);
    });
  }

  // Process individual video rendition
  async processRendition(inputPath, rendition) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.hlsDir, rendition.outputName);
      
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(rendition.resolution)
        .videoBitrate(rendition.videoBitrate)
        .audioBitrate(rendition.audioBitrate)
        .outputOptions([
          '-profile:v baseline',     // Compatibility
          '-level 3.0',
          '-start_number 0',
          '-hls_time 2',              // 2-second segments
          '-hls_list_size 0',         // All segments in playlist
          '-f hls',
          '-hls_segment_filename ' + rendition.outputName + '_%03d.ts',
          '-hls_flags delete_segments', // Auto cleanup
          '-hls_segment_type mpegts'
        ])
        .output(`${outputPath}.m3u8`)
        .on('end', () => {
          console.log(`✅ Rendition complete: ${rendition.outputName}`);
          resolve(rendition.outputName);
        })
        .on('error', (err) => {
          console.error(`❌ Rendition failed: ${rendition.outputName}`, err);
          reject(err);
        })
        .run();
    });
  }

  // Create master playlist for adaptive streaming
  createMasterPlaylist(renditions, outputName) {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:6\n\n';
    
    renditions.forEach(rendition => {
      const bandwidth = parseInt(rendition.videoBitrate) + parseInt(rendition.audioBitrate);
      const resolution = rendition.resolution;
      
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth}000,RESOLUTION=${resolution}\n`;
      playlist += `${rendition.outputName}.m3u8\n\n`;
    });
    
    return playlist;
  }

  // Upload HLS files to Bunny CDN
  async uploadToBunnyCDN(outputName) {
    try {
      const files = fs.readdirSync(this.hlsDir)
        .filter(file => file.includes(outputName));
      
      const uploadPromises = files.map(file => 
        this.uploadFileToBunny(file, path.join(this.hlsDir, file))
      );
      
      await Promise.all(uploadPromises);
      
      console.log(`✅ Uploaded ${files.length} files to Bunny CDN`);
      
      return {
        masterPlaylist: `${this.bunnyCDNUrl}/${outputName}.m3u8`,
        cdnUrl: this.bunnyCDNUrl
      };
      
    } catch (error) {
      console.error('❌ Bunny CDN upload failed:', error);
      throw error;
    }
  }

  // Upload individual file to Bunny CDN
  async uploadFileToBunny(filename, filePath) {
    const fileContent = fs.readFileSync(filePath);
    
    const response = await fetch(`https://${BUNNY_CONFIG.photos.host}/${BUNNY_CONFIG.photos.storageZoneName}/${filename}`, {
      method: 'PUT',
      headers: {
        'AccessKey': this.bunnyApiKey,
        'Content-Type': 'application/octet-stream'
      },
      body: fileContent
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload ${filename}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Generate optimized streaming URL
  generateStreamingURL(contentId, quality = 'auto') {
    const baseUrl = `${this.bunnyCDNUrl}/${contentId}`;
    
    if (quality === 'auto') {
      return `${baseUrl}.m3u8`; // Master playlist
    }
    
    return `${baseUrl}_${quality}.m3u8`;
  }

  // Get video streaming statistics
  async getStreamingStats(contentId) {
    try {
      // Bunny CDN statistics API
      const response = await fetch(`https://bunnycdn.com/api/statistics`, {
        headers: {
          'AccessKey': this.bunnyApiKey
        }
      });
      
      const stats = await response.json();
      return stats;
      
    } catch (error) {
      console.error('Error fetching streaming stats:', error);
      return null;
    }
  }

  // Clean up old HLS files
  async cleanupOldFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const files = fs.readdirSync(this.hlsDir);
      const now = Date.now();
      
      files.forEach(file => {
        const filePath = path.join(this.hlsDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted old file: ${file}`);
        }
      });
      
    } catch (error) {
      console.error('Error cleaning up files:', error);
    }
  }

  // Get optimal buffer settings for mobile
  getOptimalBufferSettings() {
    return {
      minBufferMs: 500,        // Start with 0.5s buffer
      maxBufferMs: 3000,       // Max 3s buffer
      bufferForPlaybackMs: 250, // Need 0.25s to start
      bufferForPlaybackAfterRebufferMs: 500,
      maxSeekToPreviousOffsetMs: 5000,
      live: {
        targetOffsetMs: 2000,
        minPlaybackSpeed: 0.5,
        maxPlaybackSpeed: 2.0
      }
    };
  }
}

module.exports = new HLSStreamingService();
