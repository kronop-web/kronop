/**
 * Focus Mode Service
 * Manages screen isolation and performance optimization
 * When user is viewing a specific section, only that section loads
 */

class FocusModeService {
  static instance = null;
  
  constructor() {
    if (FocusModeService.instance) {
      return FocusModeService.instance;
    }
    FocusModeService.instance = this;
  }
  
  /**
   * Set focus mode for a specific screen
   * @param {string} screenType - 'reels', 'videos', 'photos', 'live', 'shayari', 'songs', 'saved'
   * @param {string} contentType - Optional content type filter
   */
  setFocusMode(screenType, contentType = null) {
    this.currentScreen = screenType;
    this.currentContentType = contentType;
    this.isFocused = true;
    
    // Notify all listeners
    this.notifyListeners();
  }
  
  /**
   * Clear focus mode (return to normal)
   */
  clearFocusMode() {
    this.currentScreen = null;
    this.currentContentType = null;
    this.isFocused = false;
    
    // Notify all listeners
    this.notifyListeners();
  }
  
  /**
   * Check if app is in focus mode
   */
  isInFocusMode() {
    return this.isFocused;
  }
  
  /**
   * Get current focused screen
   */
  getCurrentScreen() {
    return this.currentScreen;
  }
  
  /**
   * Get current focused content type
   */
  getCurrentContentType() {
    return this.currentContentType;
  }
  
  /**
   * Subscribe to focus mode changes
   */
  subscribe(callback) {
    if (!this.listeners) {
      this.listeners = [];
    }
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all listeners of focus mode change
   */
  notifyListeners() {
    if (this.listeners) {
      this.listeners.forEach(callback => {
        try {
          callback({
            isFocused: this.isFocused,
            currentScreen: this.currentScreen,
            currentContentType: this.currentContentType
          });
        } catch (error) {
          console.error('FocusMode listener error:', error);
        }
      });
    }
  }
  
  // Singleton instance
  static getInstance() {
    if (!FocusModeService.instance) {
      FocusModeService.instance = new FocusModeService();
    }
    return FocusModeService.instance;
  }
}

export default FocusModeService;
