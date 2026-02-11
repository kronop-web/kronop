// ==================== REAL-TIME SYNC SERVICE ====================
// WebSocket-based real-time data synchronization
// No polling - only push notifications from server

import { BUNNY_CONFIG } from '../constants/Config';
import { API_URL } from './api';

export interface SyncResult {
  success: boolean;
  synced: number;
  cleaned: number;
  errors: string[];
  lastSync: string;
}

export interface ContentItem {
  id: string;
  bunny_id: string;
  url: string;
  thumbnail_url?: string;
  title?: string;
  type: 'reel' | 'video' | 'photo' | 'shayari' | 'story';
  created_at: string;
  updated_at: string;
}

export interface RealtimeEvent {
  type: 'content_added' | 'content_updated' | 'content_deleted';
  contentType: 'reel' | 'video' | 'photo' | 'shayari' | 'story';
  data: ContentItem;
  timestamp: string;
}

/**
 * Real-time Sync Service - WebSocket-based data synchronization
 * No polling, only server push notifications
 */
export class RealtimeSyncService {
  private static instance: RealtimeSyncService;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private isConnected = false;
  private eventListeners: Map<string, ((event: RealtimeEvent) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  private constructor() {}

  static getInstance(): RealtimeSyncService {
    if (!RealtimeSyncService.instance) {
      RealtimeSyncService.instance = new RealtimeSyncService();
    }
    return RealtimeSyncService.instance;
  }

  /**
   * Start WebSocket connection
   */
  start(): void {
    if (this.isConnecting || this.isConnected) {
      return;
    }

    this.connect();
  }

  /**
   * Stop WebSocket connection
   */
  stop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): void {
    if (this.isConnecting) return;

    this.isConnecting = true;
    
    // Construct WebSocket URL
    const wsUrl = API_URL.replace(/^https?:/, 'ws:') + '/ws';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        
        // Silent connection - no initial message
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          // Silent error handling
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.isConnecting = false;
        
        // Attempt to reconnect
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        this.isConnected = false;
        this.isConnecting = false;
        
        // Attempt to reconnect
        this.attemptReconnect();
      };

    } catch (error) {
      console.error('[REALTIME_SYNC]: Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    switch (data.type) {
      case 'connection':
        // Server welcome message
        break;
        
      case 'connected':
        // Server welcome message (alternative)
        break;
        
      case 'ping':
        // Silent ping - no logging
        return;
        
      case 'pong':
        // Heartbeat response
        break;
        
      case 'content_added':
      case 'content_updated':
      case 'content_deleted':
        this.emitEvent(data.type, data);
        break;
        
      case 'error':
        // Silent error handling
        break;
        
      default:
        // Silent unknown messages
        break;
    }
  }

  /**
   * Send message to WebSocket server
   */
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        // Silent error handling
      }
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (event: RealtimeEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (event: RealtimeEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: string, data: RealtimeEvent): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[REALTIME_SYNC]: Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection info
   */
  getStatus(): SyncResult {
    return {
      success: this.isConnected,
      synced: 0,
      cleaned: 0,
      errors: this.isConnected ? [] : ['WebSocket disconnected'],
      lastSync: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const realtimeSyncService = RealtimeSyncService.getInstance();
