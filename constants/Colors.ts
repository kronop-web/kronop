/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#8B00FF'; // Purple/Violet
const tintColorDark = '#8B00FF'; // Purple/Violet

export const Colors = {
  light: {
    text: '#FFFFFF',
    background: '#000000', // Deep Black
    tint: tintColorLight,
    icon: '#8B00FF', // Purple/Violet
    tabIconDefault: '#666666',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#FFFFFF', // White text remains white
    background: '#000000', // Deep Black
    tint: tintColorDark, // Purple/Violet
    icon: '#8B00FF', // Purple/Violet
    tabIconDefault: '#666666',
    tabIconSelected: tintColorDark,
  },
};
