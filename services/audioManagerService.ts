class AudioManagerService {
  private static instance: AudioManagerService;
  private currentPlayingPlayer: any = null;
  private currentPlayingVideoId: string | null = null;
  private players: Map<string, any> = new Map();
  private isTransitioning: boolean = false;

  private constructor() {}

  static getInstance(): AudioManagerService {
    if (!AudioManagerService.instance) {
      AudioManagerService.instance = new AudioManagerService();
    }
    return AudioManagerService.instance;
  }

  // Register a video player with unique ID
  registerPlayer(videoId: string, player: any) {
    this.players.set(videoId, player);
    console.log(`🎵 Audio Manager: Registered player for video ${videoId}`);
  }

  // Unregister a video player
  unregisterPlayer(videoId: string) {
    if (this.players.has(videoId)) {
      this.players.delete(videoId);
      console.log(`🎵 Audio Manager: Unregistered player for video ${videoId}`);
    }
  }

  // Play specific video and stop all others
  async playVideo(videoId: string) {
    console.log(`🎵 Audio Manager: Requesting to play video ${videoId}`);
    console.log(`🎵 Audio Manager: Currently playing: ${this.getCurrentPlayingId()}`);
    
    // Stop current playing video if it's different
    if (this.currentPlayingPlayer) {
      const currentId = this.getCurrentPlayingId();
      if (currentId !== videoId) {
        console.log(`🎵 Audio Manager: Stopping current video ${currentId} to play ${videoId}`);
        await this.stopCurrentVideo();
      }
    }

    const player = this.players.get(videoId);
    if (player) {
      try {
        // Unmute and play the requested video
        player.muted = false;
        player.volume = 1.0;
        await player.play();
        this.currentPlayingPlayer = player;
        console.log(`🎵 Audio Manager: ✅ Successfully started playing video ${videoId}`);
        console.log(`🎵 Audio Manager: Total registered players: ${this.players.size}`);
      } catch (error) {
        console.error(`🎵 Audio Manager: ❌ Error playing video ${videoId}:`, error);
        // Reset state on error
        this.currentPlayingPlayer = null;
      }
    } else {
      console.warn(`🎵 Audio Manager: ⚠️ Player not found for video ${videoId}`);
    }
  }

  // Stop current playing video
  async stopCurrentVideo() {
    if (this.currentPlayingPlayer) {
      try {
        // Mute and pause the current video
        this.currentPlayingPlayer.muted = true;
        this.currentPlayingPlayer.volume = 0;
        this.currentPlayingPlayer.pause();
        console.log(`🎵 Audio Manager: ✅ Successfully stopped current video`);
      } catch (error) {
        console.error(`🎵 Audio Manager: ❌ Error stopping current video:`, error);
      }
      this.currentPlayingPlayer = null;
    } else {
      console.log(`🎵 Audio Manager: No video currently playing to stop`);
    }
  }

  // Pause current video (keep it ready to resume)
  async pauseCurrentVideo() {
    if (this.currentPlayingPlayer) {
      try {
        this.currentPlayingPlayer.pause();
        console.log(`🎵 Audio Manager: Paused current video`);
      } catch (error) {
        console.error(`🎵 Audio Manager: Error pausing current video:`, error);
      }
    }
  }

  // Resume current video
  async resumeCurrentVideo() {
    if (this.currentPlayingPlayer) {
      try {
        await this.currentPlayingPlayer.play();
        console.log(`🎵 Audio Manager: Resumed current video`);
      } catch (error) {
        console.error(`🎵 Audio Manager: Error resuming current video:`, error);
      }
    }
  }

  // Mute all videos
  muteAll() {
    this.players.forEach((player, videoId) => {
      try {
        player.muted = true;
        player.volume = 0;
        console.log(`🎵 Audio Manager: Muted video ${videoId}`);
      } catch (error) {
        console.error(`🎵 Audio Manager: Error muting video ${videoId}:`, error);
      }
    });
  }

  // Clean up all players with enhanced memory management
  cleanup() {
    console.log('🎵 Audio Manager: Starting cleanup...');
    
    // Stop current playing video first
    this.stopCurrentVideo();
    
    // Clear all registered players with proper cleanup
    this.players.forEach((player, videoId) => {
      try {
        console.log(`🎵 Audio Manager: Cleaning up player for ${videoId}`);
        
        // Check if player exists and has methods
        if (player && typeof player.pause === 'function') {
          player.pause();
        }
        
        // Check if player has release method
        if (player && typeof player.release === 'function') {
          player.release();
        }
        
        // Clear any timeouts or intervals
        if (player.cleanupTimeout) {
          clearTimeout(player.cleanupTimeout);
        }
        
      } catch (error) {
        console.log(`🎵 Audio Manager: Cleanup error for ${videoId} (expected):`, error);
      }
    });
    
    // Clear the players map
    this.players.clear();
    
    // Reset all state
    this.currentPlayingPlayer = null;
    this.currentPlayingVideoId = null;
    this.isTransitioning = false;
    
    console.log('🎵 Audio Manager: Cleanup completed');
  }

  // Get current playing video ID
  getCurrentPlayingId(): string | null {
    for (const [videoId, player] of this.players.entries()) {
      if (player === this.currentPlayingPlayer) {
        return videoId;
      }
    }
    return null;
  }

  // Check if a specific video is currently playing
  isVideoPlaying(videoId: string): boolean {
    const player = this.players.get(videoId);
    return player === this.currentPlayingPlayer;
  }
}

export const audioManagerService = AudioManagerService.getInstance();
