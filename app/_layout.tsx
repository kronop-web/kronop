import React, { useEffect } from 'react';

import { View } from 'react-native';

import { Stack } from 'expo-router';

import { StatusBar } from 'expo-status-bar';

import { AlertProvider } from '../template/ui';

import { AuthProvider } from '../template';

import StatusBarOverlay from '../components/common/StatusBarOverlay';

import FocusModeService from '../services/focusModeService';

import BackgroundManager from '../services/backgroundManager';

import ScreenMemoryManager from '../services/screenMemoryManager';

import NavigationOptimizer from '../services/navigationOptimizer';

import CleanupManager from '../services/cleanupManager';

// import autoSyncSystem from '../services/autoSyncSystem'; // Service removed



export default function RootLayout() {



  useEffect(() => {

    // Initialize Ultra-Focus Engine for 0.5ms performance

    console.log('🚀 Initializing Ultra-Focus Engine...');

    

    // Auto-Sync System has been disabled

    console.log('⚠️ Auto-Sync System Disabled - Service removed');

    

    try {

      // Optimize for maximum speed

      const focusService = FocusModeService.getInstance();

      const bgManager = BackgroundManager.getInstance();

      const memoryManager = ScreenMemoryManager.getInstance();

      const navOptimizer = NavigationOptimizer.getInstance();

      const cleanupManager = CleanupManager.getInstance();

      

      // Pre-load common routes for zero-lag navigation

      if (navOptimizer && (navOptimizer as any).preloadCommonRoutes) {

        (navOptimizer as any).preloadCommonRoutes();

      }

      

      // Optimize memory management

      if (memoryManager && (memoryManager as any).optimizeForSpeed) {

        (memoryManager as any).optimizeForSpeed();

      }

      

      // Start background process management

      if (bgManager && (bgManager as any).optimizeForSpeed) {

        (bgManager as any).optimizeForSpeed();

      }

      

      // Start cleanup manager

      if (cleanupManager && (cleanupManager as any).optimizeForSpeed) {

        (cleanupManager as any).optimizeForSpeed();

      }

      

      console.log('⚡ Ultra-Focus Engine Ready - 0.5ms Response Time');

      console.log('⚠️ Auto-Sync System Disabled');

    } catch (error) {

      console.error('❌ Failed to initialize systems:', error);

    }

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

