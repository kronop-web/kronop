import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();

  const settingsOptions = [
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Edit your profile information',
      icon: 'person',
      onPress: () => router.push('/profile'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage notification preferences',
      icon: 'notifications',
      onPress: () => console.log('Notifications pressed'),
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      description: 'Control your privacy settings',
      icon: 'security',
      onPress: () => console.log('Privacy pressed'),
    },
    {
      id: 'storage',
      title: 'Storage',
      description: 'Manage app storage and data',
      icon: 'storage',
      onPress: () => console.log('Storage pressed'),
    },
    {
      id: 'about',
      title: 'About',
      description: 'App version and information',
      icon: 'info',
      onPress: () => console.log('About pressed'),
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help and contact support',
      icon: 'help',
      onPress: () => console.log('Help pressed'),
    },
  ];

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your app preferences</Text>
        </View>

        {/* Settings Options */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.settingItem}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <MaterialIcons name={option.icon as any} size={24} color={theme.colors.primary.main} />
              </View>
              
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{option.title}</Text>
                <Text style={styles.settingDescription}>{option.description}</Text>
              </View>

              <MaterialIcons 
                name="chevron-right" 
                size={24} 
                color={theme.colors.text.secondary} 
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
});
