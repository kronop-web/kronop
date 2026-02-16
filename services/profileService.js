// MongoDB Profile Service
// Handles all profile-related operations with MongoDB

import { mongoDB } from '../app/services/upload-api-manager';

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
      
      const result = await mongoDB.testConnection();
      console.log('✅ MongoDB Connection Test Result:', result);
      this.isConnected = result.success;
      this.connectionAttempts = 0;
      return { success: result.success, connected: result.success };
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
      console.log('🆕 Creating new profile:', profileData);
      
      const result = await mongoDB.insertOne('profiles', {
        ...profileData,
        userId: CURRENT_USER_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (result.success) {
        console.log('✅ Profile created successfully:', result.data);
        return { success: true, data: { ...profileData, _id: result.data.insertedId } };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Create Profile Error:', error);
      return { success: false, error: error.message };
    }
  }

      // Update profile
  async updateProfile(profileData) {
    try {
      console.log('📝 Updating profile:', profileData);
      
      const result = await mongoDB.updateOne('profiles', 
        { userId: CURRENT_USER_ID },
        { 
          ...profileData,
          updatedAt: new Date().toISOString()
        }
      );

      if (result.success) {
        console.log('✅ Profile updated successfully:', result.data);
        return { success: true, data: profileData };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Update Profile Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete profile
  async deleteProfile(userId = CURRENT_USER_ID) {
    try {
      console.log(`🗑️ Deleting profile for user: ${userId}`);
      
      const result = await mongoDB.deleteOne('profiles', { userId });

      if (result.success) {
        console.log('✅ Profile deleted successfully:', result.data);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error);
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
