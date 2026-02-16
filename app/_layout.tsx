import React, { useEffect } from 'react';

import { View } from 'react-native';

import { Stack } from 'expo-router';

import { StatusBar } from 'expo-status-bar';

import { AlertProvider } from '../template/ui';

import { AuthProvider } from '../template';

import StatusBarOverlay from '../components/common/StatusBarOverlay';

import { mongoDB } from '../app/services/upload-api-manager';


// import autoSyncSystem from '../services/autoSyncSystem'; // Service removed



export default function RootLayout() {



  useEffect(() => {

    // Initialize MongoDB Connection First
    console.log('🔌 Initializing MongoDB Connection...');

    mongoDB.connect().then((connected) => {
      if (connected) {
        console.log('✅ MongoDB Connected Successfully!');
      } else {
        console.log('⚠️ MongoDB Connection Failed - Using offline mode');
      }
    });

    // MongoDB Connection Initialized
    console.log('✅ App starting with clean architecture...');
  }, []);



  return (

    <View style={{ flex: 1, backgroundColor: '#000000' }}>

      {/* Premium Status Bar Overlay - Global */}

      <StatusBarOverlay style="light" backgroundColor="transparent" translucent={true} />

      

      <AlertProvider>

        <AuthProvider>

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

                <Stack.Screen name="edit-profile" />

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

        </AuthProvider>

      </AlertProvider>

    </View>

  );

}

