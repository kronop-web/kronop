// ==================== REAL-TIME SYNC MANAGER ====================
// Background WebSocket Sync Manager Component
// Integrates Real-time WebSocket Sync with React App

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRealtimeSync } from '../../hooks/useAutoSync';

interface RealtimeSyncManagerProps {
  children?: React.ReactNode;
  showDebugInfo?: boolean;
}

/**
 * Real-time Sync Manager - Handles WebSocket-based data synchronization
 * Place this component in your app root for global real-time sync management
 */
export const RealtimeSyncManager: React.FC<RealtimeSyncManagerProps> = ({ 
  children, 
  showDebugInfo = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const {
    isConnected,
    isConnecting,
    connectionStatus,
    eventCount
  } = useRealtimeSync({
    autoStart: true,
    onConnectionChange: (connected) => {
      // Silent connection handling
    },
    onContentAdded: (event) => {
      // Silent content updates
    },
    onContentUpdated: (event) => {
      // Silent content updates
    },
    onContentDeleted: (event) => {
      // Silent content updates
    },
    onError: (error) => {
      // Silent error handling
    }
  });

  // Show debug info briefly on connection events
  useEffect(() => {
    if (showDebugInfo && (isConnected || isConnecting)) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isConnecting, showDebugInfo]);

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
            <Text style={styles.debugTitle}>
              {isConnected ? '🟢 Real-time Connected' : isConnecting ? '🟡 Connecting...' : '🔴 Disconnected'}
            </Text>
            <Text style={styles.debugText}>
              Status: {isConnected ? 'WebSocket Active' : 'No Connection'}
            </Text>
            <Text style={styles.debugText}>
              Events: {eventCount}
            </Text>
            <Text style={styles.debugText}>
              Last: {connectionStatus.lastSync ? new Date(connectionStatus.lastSync).toLocaleTimeString() : 'Never'}
            </Text>
            {connectionStatus.errors.length > 0 && (
              <Text style={styles.errorText}>
                Errors: {connectionStatus.errors.length}
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

export default RealtimeSyncManager;
