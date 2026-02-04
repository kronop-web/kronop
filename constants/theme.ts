import { Platform } from 'react-native';

export const theme = {
  colors: {
    primary: {
      main: '#FF0000', // Pure Red
      light: '#FF3333',
      dark: '#CC0000',
    },
    background: {
      primary: '#000000', // Deep Black
      secondary: '#0A0A0A',
      tertiary: '#141414',
      elevated: '#1A1A1A',
    },
    text: {
      primary: '#FFFFFF', // White text remains white
      secondary: '#CCCCCC',
      tertiary: '#999999',
      inverse: '#000000',
    },
    border: {
      primary: '#333333',
      secondary: '#444444',
      light: '#2A2A2A',
    },
    success: '#FF0000', // Pure Red
    error: '#FF0040',
    warning: '#FFAA00',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    fontSize: {
      xs: 11,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
      xxxl: 24,
      huge: 28,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  iconSize: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
    xxl: 32,
  },
  hitSlop: {
    sm: { top: 8, bottom: 8, left: 8, right: 8 },
    md: { top: 12, bottom: 12, left: 12, right: 12 },
    lg: { top: 16, bottom: 16, left: 16, right: 16 },
  },
  elevation: {
    sm: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
    md: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
} as const;
