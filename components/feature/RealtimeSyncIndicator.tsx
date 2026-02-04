import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

interface RealtimeSyncIndicatorProps {
  onRefresh?: () => void;
}

export const RealtimeSyncIndicator: React.FC<RealtimeSyncIndicatorProps> = ({ onRefresh }) => {
  const {
    isConnected,
    isConnecting,
    lastSync,
    newItemsCount,
    hasNewContent,
    newContent,
    triggerRefresh,
    clearNewContentNotification
  } = useRealtimeSync();

  useEffect(() => {
    if (hasNewContent && newContent) {
      // Auto-refresh content when new items are detected
      if (onRefresh) {
        setTimeout(() => {
          onRefresh();
          clearNewContentNotification();
        }, 1000);
      }
    }
  }, [hasNewContent, newContent, onRefresh, clearNewContentNotification]);

  const getConnectionColor = () => {
    if (isConnecting) return '#FFA500'; // Orange
    if (isConnected) return '#00FF00'; // Green
    return '#FF0000'; // Red
  };

  const getConnectionStatus = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Live';
    return 'Offline';
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={[styles.statusIndicator, { backgroundColor: getConnectionColor() }]} />
        <Text style={styles.statusText}>
          {getConnectionStatus()} • Last sync: {formatLastSync()}
        </Text>
      </View>
      
      {(newItemsCount && newItemsCount > 0) && (
        <View style={styles.newContentRow}>
          <Text style={styles.newContentText}>
            🎉 {newItemsCount} new items available
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => {
              triggerRefresh();
              if (onRefresh) onRefresh();
            }}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {hasNewContent && newContent && (
        <View style={styles.notificationRow}>
          <Text style={styles.notificationText}>
            📱 {newContent.newItemsCount} new {newContent.contentType} items detected!
          </Text>
          <TouchableOpacity onPress={clearNewContentNotification}>
            <Text style={styles.dismissButton}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
  },
  newContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#d4edda',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  newContentText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '500',
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
  },
  notificationText: {
    fontSize: 12,
    color: '#856404',
    flex: 1,
  },
  dismissButton: {
    fontSize: 16,
    color: '#856404',
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
});

export default RealtimeSyncIndicator;
