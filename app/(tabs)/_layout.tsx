import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { Sparkles, Monitor, Radio, Shapes, Command, Settings2 } from 'lucide-react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#000000', // Dark background
          borderTopColor: '#333333',
          borderTopWidth: 1,
          height: Platform.select({
            ios: insets.bottom + 35,
            android: insets.bottom + 35,
            default: 45,
          }),
          paddingTop: 2,
          paddingBottom: Platform.select({
            ios: insets.bottom + 2,
            android: insets.bottom + 2,
            default: 2,
          }),
          paddingHorizontal: 8,
        },
        tabBarLabelStyle: {
          fontSize: 0,
          fontWeight: theme.typography.fontWeight.medium,
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Shapes size={24} color={color} strokeWidth={1.0} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarIcon: ({ color }) => <Sparkles size={24} color={color} strokeWidth={1.0} />,
        }}
      />
      <Tabs.Screen
        name="video"
        options={{
          title: 'Video',
          tabBarIcon: ({ color }) => <Monitor size={24} color={color} strokeWidth={1.0} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => <Radio size={24} color={color} strokeWidth={1.0} />,
        }}
      />
      <Tabs.Screen
        name="userdata"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Command size={24} color={color} strokeWidth={1.0} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Settings2 size={24} color={color} strokeWidth={1.0} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="image-search"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
