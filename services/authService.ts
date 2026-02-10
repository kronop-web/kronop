// ==================== AUTHENTICATION SERVICE ====================
// Centralized authentication management
// Handles Supabase authentication and token management for MongoDB API

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabaseClient';

export interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  token?: string;
}

/**
 * Authentication Service - Centralized auth management
 * Handles login, logout, token management, and user session
 */
export class AuthService {
  private static instance: AuthService;
  private currentUser: AuthUser | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get current authentication token
   */
  async getAuthToken(): Promise<string | null> {
    try {
      // Try Supabase token first (primary)
      const supabaseToken = await AsyncStorage.getItem('supabase_token');
      if (supabaseToken) {
        console.log('🔐 AuthService: Using Supabase token');
        return supabaseToken;
      }

      // Fallback to legacy user token
      const userToken = await AsyncStorage.getItem('user_token');
      if (userToken) {
        console.log('🔐 AuthService: Using legacy user token');
        return userToken;
      }

      console.log('🔐 AuthService: No authentication token found');
      return null;
    } catch (error) {
      console.error('🔐 AuthService: Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Create authenticated headers for API calls
   */
  async createAuthHeaders(contentType: string = 'application/json'): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': contentType,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 AuthService: Starting login process...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed: No user session created');
      }

      // Store authentication token
      await AsyncStorage.setItem('supabase_token', data.session.access_token);
      
      // Store refresh token for future use
      if (data.session.refresh_token) {
        await AsyncStorage.setItem('supabase_refresh_token', data.session.refresh_token);
      }

      // Update current user
      this.currentUser = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name,
        username: data.user.user_metadata?.username,
        avatar_url: data.user.user_metadata?.avatar_url,
        created_at: data.user.created_at,
      };

      console.log('🔐 AuthService: Login successful');
      return {
        success: true,
        user: this.currentUser,
        token: data.session.access_token
      };

    } catch (error) {
      console.error('🔐❌ AuthService: Login failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Register new user
   */
  async register(email: string, password: string, metadata?: {
    full_name?: string;
    username?: string;
  }): Promise<AuthResult> {
    try {
      console.log('🔐 AuthService: Starting registration...');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Registration failed: No user created');
      }

      console.log('🔐 AuthService: Registration successful');
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: metadata?.full_name,
          username: metadata?.username,
        }
      };

    } catch (error) {
      console.error('🔐❌ AuthService: Registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 AuthService: Starting logout...');

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('🔐 AuthService: Supabase logout error:', error);
      }

      // Clear all stored tokens
      await AsyncStorage.multiRemove([
        'supabase_token',
        'supabase_refresh_token',
        'user_token'
      ]);

      // Clear current user
      this.currentUser = null;

      console.log('🔐 AuthService: Logout successful');
      return { success: true };

    } catch (error) {
      console.error('🔐❌ AuthService: Logout failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      if (this.currentUser) {
        return this.currentUser;
      }

      // Check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name,
          username: session.user.user_metadata?.username,
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at,
        };
        return this.currentUser;
      }

      return null;
    } catch (error) {
      console.error('🔐❌ AuthService: Error getting current user:', error);
      return null;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      console.log('🔐 AuthService: Refreshing token...');

      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        throw new Error('Token refresh failed: No session returned');
      }

      // Store new token
      await AsyncStorage.setItem('supabase_token', data.session.access_token);
      
      if (data.session.refresh_token) {
        await AsyncStorage.setItem('supabase_refresh_token', data.session.refresh_token);
      }

      console.log('🔐 AuthService: Token refreshed successfully');
      return {
        success: true,
        token: data.session.access_token
      };

    } catch (error) {
      console.error('🔐❌ AuthService: Token refresh failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  /**
   * Initialize auth session on app start
   */
  async initializeAuth(): Promise<AuthUser | null> {
    try {
      console.log('🔐 AuthService: Initializing auth session...');

      // Set up auth state listener
      supabase.auth.onAuthStateChange((event: any, session: any) => {
        console.log('🔐 AuthService: Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          AsyncStorage.setItem('supabase_token', session.access_token);
          if (session.refresh_token) {
            AsyncStorage.setItem('supabase_refresh_token', session.refresh_token);
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear synchronously for immediate effect
          AsyncStorage.multiRemove(['supabase_token', 'supabase_refresh_token', 'user_token']);
        }
      });

      // Get current session
      return await this.getCurrentUser();
    } catch (error) {
      console.error('🔐❌ AuthService: Auth initialization failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;
