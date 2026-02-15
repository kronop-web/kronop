/**
 * Global Notification Service
 * Manages app-wide notifications for background activities
 */

class GlobalNotificationService {
  static instance = null;
  
  constructor() {
    if (GlobalNotificationService.instance) {
      return GlobalNotificationService.instance;
    }
    GlobalNotificationService.instance = this;
  }
  
  /**
   * Show upload notification
   */
  showUploadNotification(screenType, contentType, progress = 0) {
    console.log(`🔔 Showing upload notification: ${screenType} - ${contentType} - ${progress}%`);
    
    // In a real app, this would show a system notification
    // For now, we'll log to console
    const notification = {
      id: `upload_${Date.now()}`,
      title: `${screenType} Upload`,
      message: `Uploading ${contentType} - ${progress}% complete`,
      timestamp: Date.now(),
      type: 'upload',
      screenType,
      contentType,
      progress
    };
    
    console.log('📱 Notification:', notification);
    
    // Store for management
    this.notifications = this.notifications || [];
    this.notifications.push(notification);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(-50);
    }
  }
  
  /**
   * Show background permission notification
   */
  showPermissionNotification(screenType, granted) {
    const notification = {
      id: `permission_${Date.now()}`,
      title: 'Background Permission',
      message: granted ? 
        `✅ Background upload granted for ${screenType}` : 
        `❌ Background upload denied for ${screenType}`,
      timestamp: Date.now(),
      type: 'permission',
      screenType,
      granted
    };
    
    console.log('📱 Permission Notification:', notification);
    
    this.notifications = this.notifications || [];
    this.notifications.push(notification);
  }
  
  /**
   * Show focus mode notification
   */
  showFocusModeNotification(screenType, isEntering) {
    const notification = {
      id: `focus_${Date.now()}`,
      title: 'Focus Mode',
      message: isEntering ? 
        `🎯 Entered Focus Mode for ${screenType}` : 
        `🔓 Exited Focus Mode for ${screenType}`,
      timestamp: Date.now(),
      type: 'focus',
      screenType,
      isEntering
    };
    
    console.log('📱 Focus Notification:', notification);
    
    this.notifications = this.notifications || [];
    this.notifications.push(notification);
  }
  
  /**
   * Get notification history
   */
  getNotificationHistory(limit = 20) {
    return this.notifications ? 
      this.notifications.slice(-limit) : 
      [];
  }
  
  /**
   * Clear notifications
   */
  clearNotifications() {
    this.notifications = [];
    console.log('🧹 Cleared all notifications');
  }
  
  // Singleton instance
  static getInstance() {
    if (!GlobalNotificationService.instance) {
      GlobalNotificationService.instance = new GlobalNotificationService();
    }
    return GlobalNotificationService.instance;
  }
  
  notifications = [];
}

export default GlobalNotificationService;
