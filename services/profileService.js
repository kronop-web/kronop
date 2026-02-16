// MongoDB Profile Service
// Handles all profile-related operations with MongoDB

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://common-jesse-kronop-app-19cf0acc.koyeb.app';
const CURRENT_USER_ID = 'guest_user';

class ProfileService {
  constructor() {
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  // Test MongoDB connection
  async testConnection() {
    try {
      console.log('🔍 Testing MongoDB connection for profiles...');
      
      const response = await fetch(`${API_BASE_URL}/api/test-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ MongoDB Connection Test Result:', data);
        this.isConnected = data.connected;
        this.connectionAttempts = 0;
        return { success: true, connected: data.connected };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ MongoDB Connection Test Failed:', error);
      this.connectionAttempts++;
      this.isConnected = false;
      
      // If too many failures, disconnect
      if (this.connectionAttempts >= this.maxRetries) {
        console.log('🚫 Max connection attempts reached. Disconnecting profile service.');
        return { success: false, error: 'Connection failed after max retries' };
      }
      
      return { success: false, error: error.message };
    }
  }

  // Get user profile
  async getProfile(userId = CURRENT_USER_ID) {
    try {
      if (!this.isConnected) {
        const connectionTest = await this.testConnection();
        if (!connectionTest.success) {
          throw new Error('MongoDB not connected');
        }
      }

      console.log(`📋 Fetching profile for user: ${userId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profile fetched successfully:', data);
        return { success: true, data };
      } else if (response.status === 404) {
        console.log('ℹ️ Profile not found, will create new one');
        return { success: false, error: 'Profile not found', createNew: true };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Get Profile Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create new profile
  async createProfile(profileData) {
    try {
      if (!this.isConnected) {
        const connectionTest = await this.testConnection();
        if (!connectionTest.success) {
          throw new Error('MongoDB not connected');
        }
      }

      console.log('🆕 Creating new profile:', profileData);
      
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profileData,
          userId: CURRENT_USER_ID,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profile created successfully:', data);
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Create Profile Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update profile
  async updateProfile(profileData) {
    try {
      if (!this.isConnected) {
        const connectionTest = await this.testConnection();
        if (!connectionTest.success) {
          throw new Error('MongoDB not connected');
        }
      }

      console.log('📝 Updating profile:', profileData);
      
      const response = await fetch(`${API_BASE_URL}/api/users/profile/${CURRENT_USER_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profileData,
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profile updated successfully:', data);
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Update Profile Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete profile
  async deleteProfile(userId = CURRENT_USER_ID) {
    try {
      if (!this.isConnected) {
        const connectionTest = await this.testConnection();
        if (!connectionTest.success) {
          throw new Error('MongoDB not connected');
        }
      }

      console.log(`🗑️ Deleting profile for user: ${userId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profile deleted successfully:', data);
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Delete Profile Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Disconnect from MongoDB
  disconnect() {
    console.log('🔌 Disconnecting profile service from MongoDB');
    this.isConnected = false;
    this.connectionAttempts = 0;
  }

  // Reconnect to MongoDB
  async reconnect() {
    console.log('🔄 Reconnecting profile service to MongoDB');
    this.connectionAttempts = 0;
    return await this.testConnection();
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      attempts: this.connectionAttempts,
      maxRetries: this.maxRetries
    };
  }
}

// Create singleton instance
const profileService = new ProfileService();

// Auto-test connection on service load
profileService.testConnection();

export default profileService;
