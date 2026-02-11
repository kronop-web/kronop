// ==================== AUTO-SYNC HOOK ====================
// React Hook for Auto-Sync Service Integration
// Provides background sync functionality to React components

import { useEffect, useState, useCallback, useRef } from 'react';
import { autoSyncService, SyncResult } from '../services/autoSyncService';

export interface UseAutoSyncOptions {
  autoStart?: boolean;
  interval?: number;
  onSyncComplete?: (result: SyncResult) => void;
  onError?: (error: string) => void;
}

export interface UseAutoSyncReturn {
  isRunning: boolean;
  lastSync: string | null;
  syncStats: SyncResult;
  start: () => void;
  stop: () => void;
  forceSync: () => Promise<SyncResult>;
  syncCount: number;
}

/**
 * Auto-Sync Hook - React Integration for Background Sync
 * 
 * @param options - Configuration options
 * @returns Auto-sync controls and status
 */
export const useAutoSync = (options: UseAutoSyncOptions = {}): UseAutoSyncReturn => {
  const {
    autoStart = true,
    onSyncComplete,
    onError
  } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<SyncResult>({
    success: true,
    synced: 0,
    cleaned: 0,
    errors: [],
    lastSync: new Date().toISOString()
  });
  const [syncCount, setSyncCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serviceRef = useRef(autoSyncService);

  /**
   * Update sync stats from service
   */
  const updateStats = useCallback(() => {
    const stats = serviceRef.current.getStatus();
    setSyncStats(stats);
    setLastSync(stats.lastSync);
    
    if (onSyncComplete) {
      onSyncComplete(stats);
    }
    
    if (stats.errors.length > 0 && onError) {
      onError(stats.errors.join(', '));
    }
  }, [onSyncComplete, onError]);

  /**
   * Start auto-sync service
   */
  const start = useCallback(() => {
    if (isRunning) return;
    
    try {
      serviceRef.current.start();
      setIsRunning(true);
      console.log('[AUTO_SYNC_HOOK]: Started auto-sync');
      
      // Set up interval to update stats
      intervalRef.current = setInterval(() => {
        updateStats();
        setSyncCount(prev => prev + 1);
      }, 5000); // Update stats every 5 seconds
      
    } catch (error) {
      console.error('[AUTO_SYNC_HOOK]: Failed to start:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : String(error));
      }
    }
  }, [isRunning, updateStats, onError]);

  /**
   * Stop auto-sync service
   */
  const stop = useCallback(() => {
    if (!isRunning) return;
    
    try {
      serviceRef.current.stop();
      setIsRunning(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      console.log('[AUTO_SYNC_HOOK]: Stopped auto-sync');
    } catch (error) {
      console.error('[AUTO_SYNC_HOOK]: Failed to stop:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : String(error));
      }
    }
  }, [isRunning, onError]);

  /**
   * Force immediate sync
   */
  const forceSync = useCallback(async (): Promise<SyncResult> => {
    try {
      console.log('[AUTO_SYNC_HOOK]: Force sync triggered...');
      const result = await serviceRef.current.forceSync();
      updateStats();
      return result;
    } catch (error) {
      console.error('[AUTO_SYNC_HOOK]: Force sync failed:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : String(error));
      }
      throw error;
    }
  }, [updateStats, onError]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (autoStart) {
      start();
    }

    // Cleanup on unmount
    return () => {
      stop();
    };
  }, [autoStart, start, stop]);

  /**
   * Update stats periodically when running
   */
  useEffect(() => {
    if (!isRunning) return;

    const statsInterval = setInterval(() => {
      updateStats();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(statsInterval);
  }, [isRunning, updateStats]);

  return {
    isRunning,
    lastSync,
    syncStats,
    start,
    stop,
    forceSync,
    syncCount
  };
};

/**
 * Background Sync Hook - Simplified version for basic usage
 */
export const useBackgroundSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const sync = useAutoSync({
    autoStart: true,
    onSyncComplete: (result) => {
      setIsSyncing(false);
      setLastSyncTime(result.lastSync);
    },
    onError: (error) => {
      setIsSyncing(false);
      console.error('[BACKGROUND_SYNC]: Error:', error);
    }
  });

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await sync.forceSync();
    } catch (error) {
      setIsSyncing(false);
    }
  }, [sync]);

  return {
    isSyncing,
    lastSyncTime,
    triggerSync,
    isRunning: sync.isRunning,
    syncCount: sync.syncCount
  };
};
