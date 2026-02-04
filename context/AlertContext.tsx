import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const showAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
    if (Platform.OS === 'web') {
      const result = window.confirm(`${title}\n\n${message || ''}`);
      if (result && buttons && buttons.length > 0) {
        // Simple web fallback - execute the first non-cancel button or just close
        const confirmButton = buttons.find(b => b.style !== 'cancel');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
