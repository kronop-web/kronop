import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VideoProvider } from '../context/VideoContext'; 
import { AlertProvider } from '../template/ui';
import { AuthProvider } from '../template';
import StatusBarOverlay from '../components/common/StatusBarOverlay';

export default function RootLayout() {
  useEffect(() => {
  }, []);

  return (
    <>
      {/* Premium Status Bar Overlay - Global */}
      <StatusBarOverlay style="light" backgroundColor="transparent" translucent={true} />
      
      <AlertProvider>
        <VideoProvider>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="login" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="help-center" />
              <Stack.Screen name="chat" />
            </Stack>
          </AuthProvider>
        </VideoProvider>
      </AlertProvider>
    </>
  );
}
