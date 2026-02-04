import { API_BASE_URL } from '../constants/network';

const API_URL = API_BASE_URL;

class ContentService {
  static async getContentByType(type, page = 1, limit = 5) {
    try {
      const response = await fetch(`${API_URL}/content/${type}?page=${page}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} content`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Error fetching ${type} content:`, error);
      throw error;
    }
  }

  static async getReels(page = 1, limit = 5) {
    return await this.getContentByType('Reel', page, limit);
  }

  static async getVideos(page = 1, limit = 5) {
    return await this.getContentByType('Video', page, limit);
  }

  static async getStories(page = 1, limit = 5) {
    return await this.getContentByType('Story', page, limit);
  }

  static async getLiveStreams(page = 1, limit = 5) {
    return await this.getContentByType('Live', page, limit);
  }

  static async getPhotos(page = 1, limit = 5) {
    return await this.getContentByType('Photo', page, limit);
  }

  static async getUserContent(userId, type = null) {
    try {
      const url = type 
        ? `${API_URL}/content/user/${userId}?type=${type}`
        : `${API_URL}/content/user/${userId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user content');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching user content:', error);
      throw error;
    }
  }

  static async incrementViews(contentId) {
    try {
      const response = await fetch(`${API_URL}/content/${contentId}/view`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to increment views');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error incrementing views:', error);
      throw error;
    }
  }

  static async incrementLikes(contentId) {
    try {
      const response = await fetch(`${API_URL}/content/${contentId}/like`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to increment likes');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error incrementing likes:', error);
      throw error;
    }
  }

  static async getActiveLiveStreams() {
    try {
      const response = await fetch(`${API_URL}/content/live/active`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch active live streams');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching live streams:', error);
      throw error;
    }
  }

  static async syncContent(type = null) {
    try {
      const url = type 
        ? `${API_URL}/content/sync/${type}`
        : `${API_URL}/content/sync/all`;
      
      const response = await fetch(url, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync content');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error syncing content:', error);
      throw error;
    }
  }

  static async checkSecurityStatus(type) {
    try {
      const response = await fetch(`${API_URL}/content/security/check/${type}`);
      
      if (!response.ok) {
        throw new Error('Failed to check security status');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking security status:', error);
      throw error;
    }
  }

  static async enableSecurity(type) {
    try {
      const response = await fetch(`${API_URL}/content/security/enable/${type}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to enable security');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error enabling security:', error);
      throw error;
    }
  }
}

export default ContentService;
