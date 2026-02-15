import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { Home, Sparkles, Monitor, Radio, Database, User } from 'lucide-react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary.main,
          tabBarInactiveTintColor: theme.colors.text.tertiary,
          tabBarShowLabel: false,
          animation: 'none',
          sceneStyle: { backgroundColor: '#000000' },
        tabBarStyle: {
          backgroundColor: theme.colors.background.primary,
          borderTopColor: theme.colors.border.primary,
          borderTopWidth: 1,
          height: Platform.select({
            ios: insets.bottom + 50,
            android: insets.bottom + 50,
            default: 56,
          }),
          paddingTop: 6,
          paddingBottom: Platform.select({
            ios: insets.bottom + 6,
            android: insets.bottom + 6,
            default: 6,
          }),
          paddingHorizontal: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: theme.typography.fontWeight.medium,
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarIcon: ({ color }) => <Sparkles size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="video"
        options={{
          title: 'Video',
          tabBarIcon: ({ color }) => <Monitor size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => <Radio size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="userdata"
        options={{
          title: 'Database',
          tabBarIcon: ({ color }) => <Database size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
    </View>
  );
}
