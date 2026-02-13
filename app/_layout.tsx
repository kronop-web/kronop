import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertProvider } from '../template/ui';
import { AuthProvider } from '../template';
import StatusBarOverlay from '../components/common/StatusBarOverlay';
import RealtimeSyncManager from '../components/common/AutoSyncManager';

export default function RootLayout() {

  return (
    <>
      {/* Premium Status Bar Overlay - Global */}
      <StatusBarOverlay style="light" backgroundColor="transparent" translucent={true} />
      
      <AlertProvider>
        <AuthProvider>
            <RealtimeSyncManager showDebugInfo={__DEV__}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="help-center" />
                <Stack.Screen name="chat" />
                <Stack.Screen 
                  name="video/[id]" 
                  options={{ 
                    headerShown: true,
                    presentation: 'modal',
                  }} 
                />
              </Stack>
            </RealtimeSyncManager>
        </AuthProvider>
      </AlertProvider>
    </>
  );
}
