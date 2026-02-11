import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VideoProvider } from '../context/VideoContext'; 
import { AlertProvider } from '../template/ui';
import { AuthProvider } from '../template';
import StatusBarOverlay from '../components/common/StatusBarOverlay';
import AutoSyncManager from '../components/common/AutoSyncManager';

export default function RootLayout() {

  return (
    <>
      {/* Premium Status Bar Overlay - Global */}
      <StatusBarOverlay style="light" backgroundColor="transparent" translucent={true} />
      
      <AlertProvider>
        <VideoProvider>
          <AuthProvider>
            <AutoSyncManager showDebugInfo={__DEV__}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="help-center" />
                <Stack.Screen name="chat" />
              </Stack>
            </AutoSyncManager>
          </AuthProvider>
        </VideoProvider>
      </AlertProvider>
    </>
  );
}
