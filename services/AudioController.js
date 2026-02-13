let audioEnabled = true;
let initialized = false;
let lastActivePlayer = null;

/**
 * Central audio controller for reels/videos.
 * - Active reel: unmuted + volume 1
 * - Inactive reels: muted + volume 0
 * - Instant audio switch on swipe
 */
const AudioController = {
  async initialize() {
    if (initialized) return;
    initialized = true;

    try {
      const expoAv = require('expo-av');
      const Audio = expoAv?.Audio;
      if (Audio?.setAudioModeAsync) {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (e) {
    }
  },
  isEnabled() {
    return audioEnabled;
  },

  setEnabled(enabled) {
    audioEnabled = !!enabled;
  },

  applyToPlayer(player, isActive) {
    if (!player) return;

    try {
      const shouldHaveSound = audioEnabled && !!isActive;
      player.muted = !shouldHaveSound;
      player.volume = shouldHaveSound ? 1 : 0;

      // Track active player for instant switching
      if (isActive) {
        lastActivePlayer = player;
      }
    } catch (e) {
      // Swallow errors from released/unavailable players
    }
  },
};

export default AudioController;
