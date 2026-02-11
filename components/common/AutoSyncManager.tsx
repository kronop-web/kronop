// ==================== AUTO-SYNC MANAGER ====================
// Background Sync Manager Component
// Integrates Auto-Sync Service with React App

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAutoSync } from '../../hooks/useAutoSync';

interface AutoSyncManagerProps {
  children?: React.ReactNode;
  showDebugInfo?: boolean;
}

/**
 * Auto-Sync Manager - Handles background data synchronization
 * Place this component in your app root for global sync management
 */
export const AutoSyncManager: React.FC<AutoSyncManagerProps> = ({ 
  children, 
  showDebugInfo = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const {
    isRunning,
    lastSync,
    syncStats,
    syncCount
  } = useAutoSync({
    autoStart: true,
    onSyncComplete: (result) => {
      console.log('[AUTO_SYNC_MANAGER]: Sync completed', {
        synced: result.synced,
        cleaned: result.cleaned,
        errors: result.errors.length
      });
    },
    onError: (error) => {
      console.error('[AUTO_SYNC_MANAGER]: Sync error:', error);
    }
  });

  // Show debug info briefly when sync completes
  useEffect(() => {
    if (syncStats.synced > 0 || syncStats.cleaned > 0) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStats.synced, syncStats.cleaned]);

  if (!showDebugInfo) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {children}
      
      {/* Debug Info Overlay */}
      {isVisible && (
        <View style={styles.debugOverlay}>
          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>🔄 Auto-Sync Active</Text>
            <Text style={styles.debugText}>
              Status: {isRunning ? 'Running' : 'Stopped'}
            </Text>
            <Text style={styles.debugText}>
              Last Sync: {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}
            </Text>
            <Text style={styles.debugText}>
              Synced: {syncStats.synced} | Cleaned: {syncStats.cleaned}
            </Text>
            <Text style={styles.debugText}>
              Total Cycles: {syncCount}
            </Text>
            {syncStats.errors.length > 0 && (
              <Text style={styles.errorText}>
                Errors: {syncStats.errors.length}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugOverlay: {
    position: 'absolute',
    top: 50,
    right: 10,
    zIndex: 9999,
  },
  debugBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  debugTitle: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginBottom: 2,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 10,
    marginBottom: 2,
  },
});

export default AutoSyncManager;
