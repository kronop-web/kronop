import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch,
  Alert, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

import supabase from '../../services/supabaseClient';

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification Settings
  const [notifications, setNotifications] = useState({
    pushNotifications: true,
    emailNotifications: true,
    chatNotifications: true,
    likeNotifications: true,
    commentNotifications: true,
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    privateAccount: false,
    showActivityStatus: true,
    allowTagging: true,
    showOnlineStatus: true,
  });

  // Account Settings
  const [account, setAccount] = useState({
    language: 'English',
    autoPlayVideos: true,
    dataSaver: false,
    darkMode: false,
  });

  // Security Settings
  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    requireBiometric: false,
  });

  // Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const languages = [
    'English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean'
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load settings from AsyncStorage
      const savedNotifications = await AsyncStorage.getItem('settings_notifications');
      const savedPrivacy = await AsyncStorage.getItem('settings_privacy');
      const savedAccount = await AsyncStorage.getItem('settings_account');
      const savedSecurity = await AsyncStorage.getItem('settings_security');

      if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
      if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));
      if (savedAccount) setAccount(JSON.parse(savedAccount));
      if (savedSecurity) setSecurity(JSON.parse(savedSecurity));
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (category: string, settings: any) => {
    try {
      setSaving(true);
      await AsyncStorage.setItem(`settings_${category}`, JSON.stringify(settings));
      
      // Here you would also sync with backend/MongoDB
      // await apiCall('/users/settings', {
      //   method: 'PUT',
      //   body: JSON.stringify({ category, settings })
      // });
      
      // Settings saved successfully - no alert needed for better UX
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    saveSettings('notifications', updated);
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    saveSettings('privacy', updated);
  };

  const handleAccountChange = (key: string, value: any) => {
    const updated = { ...account, [key]: value };
    setAccount(updated);
    saveSettings('account', updated);
  };

  const handleSecurityChange = (key: string, value: boolean) => {
    const updated = { ...security, [key]: value };
    setSecurity(updated);
    saveSettings('security', updated);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }

    try {
      // Here you would call the backend API to delete the account
      // await apiCall('/users/account', { method: 'DELETE' });
      
      // Clear local storage
      await AsyncStorage.clear();
      
      Alert.alert('Success', 'Account deleted successfully');
      router.replace('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              await AsyncStorage.removeItem('user_token');
              router.replace('/login');
            } catch (error) {
              console.error('Error logging out:', error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeScreen edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Notifications Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => router.push('/notifications')}
          >
            <Text style={styles.sectionTitle}>Notifications</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive push notifications</Text>
            </View>
            <Switch
              value={notifications.pushNotifications}
              onValueChange={(value) => handleNotificationChange('pushNotifications', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={notifications.pushNotifications ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Chat Messages</Text>
              <Text style={styles.settingDescription}>New message notifications</Text>
            </View>
            <Switch
              value={notifications.chatNotifications}
              onValueChange={(value) => handleNotificationChange('chatNotifications', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={notifications.chatNotifications ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Likes & Comments</Text>
              <Text style={styles.settingDescription}>Activity on your posts</Text>
            </View>
            <Switch
              value={notifications.likeNotifications}
              onValueChange={(value) => handleNotificationChange('likeNotifications', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={notifications.likeNotifications ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => router.push('/privacy' as any)}
          >
            <Text style={styles.sectionTitle}>Privacy</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Account Privacy</Text>
              <Text style={styles.settingDescription}>Privacy settings removed - system purged</Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Activity Status</Text>
              <Text style={styles.settingDescription}>Show when you’re active</Text>
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
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingDescription}>App language</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.valueText}>{account.language}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-play Videos</Text>
              <Text style={styles.settingDescription}>Videos play automatically</Text>
            </View>
            <Switch
              value={account.autoPlayVideos}
              onValueChange={(value) => handleAccountChange('autoPlayVideos', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={account.autoPlayVideos ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Data Saver</Text>
              <Text style={styles.settingDescription}>Reduce data usage</Text>
            </View>
            <Switch
              value={account.dataSaver}
              onValueChange={(value) => handleAccountChange('dataSaver', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={account.dataSaver ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Two-Factor Auth</Text>
              <Text style={styles.settingDescription}>Extra security for your account</Text>
            </View>
            <Switch
              value={security.twoFactorAuth}
              onValueChange={(value) => handleSecurityChange('twoFactorAuth', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={security.twoFactorAuth ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Login Alerts</Text>
              <Text style={styles.settingDescription}>Get notified of new logins</Text>
            </View>
            <Switch
              value={security.loginAlerts}
              onValueChange={(value) => handleSecurityChange('loginAlerts', value)}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={security.loginAlerts ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#FF6B6B" />
            <Text style={[styles.actionText, { color: '#FF6B6B' }]}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => setShowDeleteModal(true)}
          >
            <MaterialIcons name="delete-forever" size={24} color="#FF4444" />
            <Text style={[styles.actionText, { color: '#FF4444' }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>© 2024 KRONOP</Text>
        </View>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Language</Text>
              <View style={styles.modalPlaceholder} />
            </View>

            <ScrollView style={styles.languageList}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageItem,
                    account.language === lang && styles.languageItemSelected
                  ]}
                  onPress={() => {
                    handleAccountChange('language', lang);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text style={[
                    styles.languageText,
                    account.language === lang && styles.languageTextSelected
                  ]}>
                    {lang}
                  </Text>
                  {account.language === lang && (
                    <MaterialIcons name="check" size={20} color={theme.colors.primary.main} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <View style={styles.modalPlaceholder} />
            </View>

            <View style={styles.deleteContent}>
              <View style={styles.deleteWarning}>
                <MaterialIcons name="warning" size={48} color="#FF4444" />
                <Text style={styles.deleteWarningTitle}>Warning!</Text>
                <Text style={styles.deleteWarningText}>
                  This action cannot be undone. All your data will be permanently deleted.
                </Text>
              </View>

              <View style={styles.deleteForm}>
                <Text style={styles.deleteLabel}>
                  Type “DELETE” to confirm:
                </Text>
                <TextInput
                  style={styles.deleteInput}
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                  placeholder="DELETE"
                  placeholderTextColor="#666"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.deleteActions}>
                <TouchableOpacity
                  style={styles.deleteCancelButton}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                >
                  <Text style={styles.deleteCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteConfirmButton,
                    deleteConfirmText !== 'DELETE' && styles.deleteConfirmButtonDisabled
                  ]}
                  onPress={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE'}
                >
                  <Text style={styles.deleteConfirmText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  section: {
    backgroundColor: theme.colors.background.secondary,
    marginVertical: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    color: '#cccccc',
    marginTop: 2,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    color: '#cccccc',
    marginRight: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalPlaceholder: {
    width: 24,
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  languageItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
  },
  languageTextSelected: {
    color: theme.colors.primary.main,
    fontWeight: '600',
  },
  deleteContent: {
    padding: 20,
  },
  deleteWarning: {
    alignItems: 'center',
    marginBottom: 30,
  },
  deleteWarningTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF4444',
    marginTop: 10,
  },
  deleteWarningText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  deleteForm: {
    marginBottom: 30,
  },
  deleteLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  deleteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 15,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 16,
    color: '#666',
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF4444',
    alignItems: 'center',
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  deleteConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  savingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
