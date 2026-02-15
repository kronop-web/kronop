// ==================== SAFE AUTH WRAPPER ====================
// Prevents login loops and handles auth errors gracefully
// Provides fallback to guest mode when auth fails

import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './authService';

export interface SafeAuthResult {
  success: boolean;
  user?: any;
  error?: string;
  isGuest?: boolean;
  needsRelogin?: boolean;
}

/**
 * Safe Auth Wrapper - Prevents app crashes from auth errors
 */
class SafeAuthWrapper {
  private static instance: SafeAuthWrapper;
  private authFailureCount = 0;
  private readonly MAX_FAILURES = 3;

  private constructor() {}

  public static getInstance(): SafeAuthWrapper {
    if (!SafeAuthWrapper.instance) {
      SafeAuthWrapper.instance = new SafeAuthWrapper();
    }
    return SafeAuthWrapper.instance;
  }

  /**
   * Safe login with loop prevention
   */
  async safeLogin(email: string, password: string): Promise<SafeAuthResult> {
    try {
      console.log('🛡️ SafeAuth: Starting safe login...');

      // Reset failure count on new login attempt
      this.authFailureCount = 0;

      // Clear any existing corrupted tokens first
      await this.clearCorruptedTokens();

      const result = await authService.login(email, password);

      if (result.success) {
        console.log('🛡️ SafeAuth: Login successful');
        return {
          success: true,
          user: result.user
        };
      } else {
        this.authFailureCount++;
        console.error(`🛡️ SafeAuth: Login failed (${this.authFailureCount}/${this.MAX_FAILURES})`);

        if (this.authFailureCount >= this.MAX_FAILURES) {
          // Too many failures - switch to guest mode
          await this.enableGuestMode();
          return {
            success: false,
            error: 'Too many login attempts. Switching to guest mode.',
            isGuest: true,
            needsRelogin: false
          };
        }

        return {
          success: false,
          error: result.error || 'Login failed',
          needsRelogin: true
        };
      }

    } catch (error) {
      this.authFailureCount++;
      console.error('🛡️ SafeAuth: Login error:', error);

      if (this.authFailureCount >= this.MAX_FAILURES) {
        await this.enableGuestMode();
        return {
          success: false,
          error: 'Login system error. Switching to guest mode.',
          isGuest: true,
          needsRelogin: false
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        needsRelogin: true
      };
    }
  }

  /**
   * Safe token refresh with fallback
   */
  async safeRefreshToken(): Promise<SafeAuthResult> {
    try {
      console.log('🛡️ SafeAuth: Safe token refresh...');

      const result = await authService.refreshToken();

      if (result.success) {
        console.log('🛡️ SafeAuth: Token refresh successful');
        return {
          success: true
        };
      } else {
        console.error('🛡️ SafeAuth: Token refresh failed:', result.error);
        
        // Token refresh failed - clear tokens and suggest relogin
        await this.clearCorruptedTokens();
        
        return {
          success: false,
          error: result.error || 'Token refresh failed',
          needsRelogin: true
        };
      }

    } catch (error) {
      console.error('🛡️ SafeAuth: Token refresh error:', error);
      await this.clearCorruptedTokens();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
        needsRelogin: true
      };
    }
  }

  /**
   * Safe logout with cleanup
   */
  async safeLogout(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🛡️ SafeAuth: Safe logout...');

      // Reset failure count
      this.authFailureCount = 0;

      // Clear all tokens and logout
      await authService.logout();
      
      // Clear any additional app-specific data
      await AsyncStorage.multiRemove([
        'auth_failure_count',
        'last_login_attempt',
        'guest_mode_enabled'
      ]);

      console.log('🛡️ SafeAuth: Logout successful');
      return { success: true };

    } catch (error) {
      console.error('🛡️ SafeAuth: Logout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      };
    }
  }

  /**
   * Get current user safely
   */
  async getCurrentUser(): Promise<SafeAuthResult> {
    try {
      console.log('🛡️ SafeAuth: Getting current user...');

      const user = await authService.getCurrentUser();

      if (user) {
        return {
          success: true,
          user: user
        };
      } else {
        // Check if we're in guest mode
        const isGuest = await AsyncStorage.getItem('guest_mode_enabled');
        
        return {
          success: false,
          error: 'No user session found',
          isGuest: !!isGuest,
          needsRelogin: !isGuest
        };
      }

    } catch (error) {
      console.error('🛡️ SafeAuth: Get current user error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        needsRelogin: true
      };
    }
  }

  /**
   * Clear potentially corrupted tokens
   */
  private async clearCorruptedTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'supabase_token',
        'supabase_refresh_token',
        'user_token',
        'auth_failure_count',
        'last_login_attempt'
      ]);
      console.log('🛡️ SafeAuth: Cleared corrupted tokens');
    } catch (error) {
      console.error('🛡️ SafeAuth: Error clearing tokens:', error);
    }
  }

  /**
   * Enable guest mode when auth fails repeatedly
   */
  private async enableGuestMode(): Promise<void> {
    try {
      await AsyncStorage.setItem('guest_mode_enabled', 'true');
      await AsyncStorage.setItem('guest_user_id', 'guest_user');
      console.log('🛡️ SafeAuth: Guest mode enabled');
    } catch (error) {
      console.error('🛡️ SafeAuth: Error enabling guest mode:', error);
    }
  }

  /**
   * Check if guest mode is enabled
   */
  async isGuestMode(): Promise<boolean> {
    try {
      const guestMode = await AsyncStorage.getItem('guest_mode_enabled');
      return guestMode === 'true';
    } catch (error) {
      console.error('🛡️ SafeAuth: Error checking guest mode:', error);
      return false;
    }
  }

  /**
   * Disable guest mode and force relogin
   */
  async disableGuestMode(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'guest_mode_enabled',
        'guest_user_id'
      ]);
      this.authFailureCount = 0;
      console.log('🛡️ SafeAuth: Guest mode disabled');
    } catch (error) {
      console.error('🛡️ SafeAuth: Error disabling guest mode:', error);
    }
  }

  /**
   * Get auth status with detailed info
   */
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    isGuest: boolean;
    needsRelogin: boolean;
    failureCount: number;
  }> {
    try {
      const isGuest = await this.isGuestMode();
      const isAuthenticated = await authService.isAuthenticated();
      
      return {
        isAuthenticated,
        isGuest,
        needsRelogin: !isAuthenticated && !isGuest,
        failureCount: this.authFailureCount
      };
    } catch (error) {
      console.error('🛡️ SafeAuth: Error getting auth status:', error);
      return {
        isAuthenticated: false,
        isGuest: false,
        needsRelogin: true,
        failureCount: this.authFailureCount
      };
    }
  }
}

// Export singleton instance
export const safeAuth = SafeAuthWrapper.getInstance();
export default safeAuth;
