import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeScreen } from '../components/layout';
import { theme } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PrivacyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [privacy, setPrivacy] = useState({
    privateAccount: false,
    showActivityStatus: true,
    allowTagging: true,
    showOnlineStatus: true,
    allowDMs: true,
    blockUsers: false,
  });

  React.useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const savedPrivacy = await AsyncStorage.getItem('settings_privacy');
      if (savedPrivacy) {
        setPrivacy(JSON.parse(savedPrivacy));
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const savePrivacySettings = async (newPrivacy: typeof privacy) => {
    try {
      setLoading(true);
      await AsyncStorage.setItem('settings_privacy', JSON.stringify(newPrivacy));
      
      // Here you would also sync with backend/MongoDB
      // await apiCall('/users/privacy', {
      //   method: 'PUT',
      //   body: JSON.stringify(newPrivacy)
      // });
      
      // Privacy settings saved successfully - no alert needed for better UX
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      Alert.alert('Error', 'Failed to save privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    savePrivacySettings(updated);
  };

  return (
    <SafeScreen edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Account Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Private Account</Text>
              <Text style={styles.settingDescription}>Only followers can see your posts</Text>
            </View>
            <Switch
              value={privacy.privateAccount}
              onValueChange={(value) => handlePrivacyChange('privateAccount', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={privacy.privateAccount ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Activity Status</Text>
              <Text style={styles.settingDescription}>Show when you're active</Text>
            </View>
            <Switch
              value={privacy.showActivityStatus}
              onValueChange={(value) => handlePrivacyChange('showActivityStatus', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={privacy.showActivityStatus ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Online Status</Text>
              <Text style={styles.settingDescription}>Show when you're online</Text>
            </View>
            <Switch
              value={privacy.showOnlineStatus}
              onValueChange={(value) => handlePrivacyChange('showOnlineStatus', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={privacy.showOnlineStatus ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Interactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interactions</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Allow Tagging</Text>
              <Text style={styles.settingDescription}>Others can tag you in posts</Text>
            </View>
            <Switch
              value={privacy.allowTagging}
              onValueChange={(value) => handlePrivacyChange('allowTagging', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={privacy.allowTagging ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Allow DMs</Text>
              <Text style={styles.settingDescription}>Anyone can send you messages</Text>
            </View>
            <Switch
              value={privacy.allowDMs}
              onValueChange={(value) => handlePrivacyChange('allowDMs', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={privacy.allowDMs ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Blocked Users */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/blocked-users' as any)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Blocked Users</Text>
              <Text style={styles.settingDescription}>Manage blocked accounts</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Data and Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data and Privacy</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Download Your Data</Text>
              <Text style={styles.settingDescription}>Get a copy of your information</Text>
            </View>
            <MaterialIcons name="download" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Clear Search History</Text>
              <Text style={styles.settingDescription}>Remove your search history</Text>
            </View>
            <MaterialIcons name="clear" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  section: {
    backgroundColor: theme.colors.background.secondary,
    marginVertical: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
});
