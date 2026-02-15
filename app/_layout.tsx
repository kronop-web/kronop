import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertProvider } from '../template/ui';
import { AuthProvider } from '../template';
import StatusBarOverlay from '../components/common/StatusBarOverlay';
import RealtimeSyncManager from '../components/common/AutoSyncManager';
import { uploadQueue } from '../services/uploadQueue';

export default function RootLayout() {

  useEffect(() => {
    void uploadQueue.init();
  }, []);

  return (
    <>
      {/* Premium Status Bar Overlay - Global */}
      <StatusBarOverlay style="light" backgroundColor="transparent" translucent={true} />
      
      <AlertProvider>
        <AuthProvider>
            <RealtimeSyncManager showDebugInfo={__DEV__}>
              <Stack 
                screenOptions={{ 
                  headerShown: false,
                  animation: 'none',
                  animationTypeForReplace: 'push',
                  contentStyle: { backgroundColor: '#000' }
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="help-center" />
                <Stack.Screen 
                  name="chat" 
                  options={{ 
                    headerShown: false,
                    animation: 'none',
                    presentation: 'modal',
                    contentStyle: { backgroundColor: '#000' }
                  }} 
                />
                <Stack.Screen 
                  name="notifications" 
                  options={{ 
                    headerShown: false,
                    animation: 'none',
                    presentation: 'modal',
                    contentStyle: { backgroundColor: '#000' }
                  }} 
                />
                <Stack.Screen 
                  name="songs" 
                  options={{ 
                    headerShown: false,
                    animation: 'none',
                    presentation: 'modal',
                    contentStyle: { backgroundColor: '#000' }
                  }} 
                />
                <Stack.Screen 
                  name="video/[id]" 
                  options={{ 
                    headerShown: false,
                    animation: 'none',
                    presentation: 'modal',
                    contentStyle: { backgroundColor: '#000' }
                  }} 
                />
                </Stack>
            </RealtimeSyncManager>
        </AuthProvider>
      </AlertProvider>
    </>
  );
}
