import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Modal, ScrollView, Alert } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface Settings {
  [key: string]: boolean | string;
}

interface SettingsSectionProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsSection({ visible, onClose }: SettingsSectionProps) {

  // Complete Global Settings
  const [settings, setSettings] = useState<Settings>({
    // Account & Security
    privateAccount: false,
    twoFactorAuth: true,
    loginAlerts: true,
    accountPrivacy: true,
    faceId: true,
    appLock: false,
    backupData: true,
    clearCache: false,
    
    // Notifications
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    newsletter: true,
    storyNotifications: true,
    commentNotifications: true,
    likeNotifications: true,
    followNotifications: true,
    
    // Privacy
    showOnlineStatus: true,
    readReceipts: false,
    storySharing: true,
    commentFiltering: true,
    messageRequests: true,
    tagReview: true,
    activityStatus: true,
    
    // Content & Media
    autoPlayVideos: true,
    dataSaver: false,
    
    // Appearance
    darkMode: true,
    soundEffects: true,
    vibration: true,
    
    // Other settings
    hapticFeedback: true,
    autoUpdate: true,
    analytics: true,
  });

  const toggleSetting = (key: string) => {
    setSettings(prev => ({...prev, [key]: !prev[key]}));
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.settingsSection}>
      <Text style={styles.settingsTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingItem = ({ 
    icon, 
    title, 
    hasSwitch = false, 
    value = false, 
    onToggle = () => {},
    hasArrow = false,
    iconType = 'material'
  }: any) => (
    <TouchableOpacity style={styles.settingsItem} onPress={hasSwitch ? onToggle : undefined}>
      <View style={styles.settingsItemLeft}>
        {iconType === 'feather' ? (
          <Feather name={icon} size={22} color="#FF4444" />
        ) : (
          <MaterialIcons name={icon} size={22} color="#FF4444" />
        )}
        <Text style={styles.settingsItemText}>{title}</Text>
      </View>
      {hasSwitch ? (
        <Switch
          value={value as boolean}
          onValueChange={onToggle}
          trackColor={{ false: '#767577', true: '#FF4444' }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      ) : hasArrow ? (
        <MaterialIcons name="chevron-right" size={20} color="#666" />
      ) : null}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Global Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
            {/* Account & Security */}
            <SettingSection title="ACCOUNT & SECURITY">
              <SettingItem icon="lock" title="Two-Factor Authentication" hasSwitch value={settings.twoFactorAuth as boolean} onToggle={() => toggleSetting('twoFactorAuth')} />
              <SettingItem icon="notifications" title="Login Alerts" hasSwitch value={settings.loginAlerts as boolean} onToggle={() => toggleSetting('loginAlerts')} />
              <SettingItem icon="visibility-off" title="Private Account" hasSwitch value={settings.privateAccount as boolean} onToggle={() => toggleSetting('privateAccount')} />
              <SettingItem icon="security" title="Account Privacy" hasArrow />
              <SettingItem icon="face" title="Face ID / Touch ID" hasSwitch value={settings.faceId as boolean} onToggle={() => toggleSetting('faceId')} />
              <SettingItem icon="lock-outline" title="App Lock" hasSwitch value={settings.appLock as boolean} onToggle={() => toggleSetting('appLock')} />
              <SettingItem icon="backup" title="Auto Backup" hasSwitch value={settings.backupData as boolean} onToggle={() => toggleSetting('backupData')} />
              <SettingItem icon="clear" title="Clear Cache" hasSwitch value={settings.clearCache as boolean} onToggle={() => toggleSetting('clearCache')} />
            </SettingSection>

            {/* Notifications */}
            <SettingSection title="NOTIFICATIONS">
              <SettingItem icon="notifications" title="Push Notifications" hasSwitch value={settings.pushNotifications as boolean} onToggle={() => toggleSetting('pushNotifications')} />
              <SettingItem icon="email" title="Email Notifications" hasSwitch value={settings.emailNotifications as boolean} onToggle={() => toggleSetting('emailNotifications')} />
              <SettingItem icon="sms" title="SMS Notifications" hasSwitch value={settings.smsNotifications as boolean} onToggle={() => toggleSetting('smsNotifications')} />
              <SettingItem icon="campaign" title="Newsletter" hasSwitch value={settings.newsletter as boolean} onToggle={() => toggleSetting('newsletter')} />
              <SettingItem icon="auto-stories" title="Story Notifications" hasSwitch value={settings.storyNotifications as boolean} onToggle={() => toggleSetting('storyNotifications')} />
              <SettingItem icon="comment" title="Comment Notifications" hasSwitch value={settings.commentNotifications as boolean} onToggle={() => toggleSetting('commentNotifications')} />
              <SettingItem icon="favorite" title="Like Notifications" hasSwitch value={settings.likeNotifications as boolean} onToggle={() => toggleSetting('likeNotifications')} />
              <SettingItem icon="person-add" title="Follow Notifications" hasSwitch value={settings.followNotifications as boolean} onToggle={() => toggleSetting('followNotifications')} />
            </SettingSection>

            {/* Privacy */}
            <SettingSection title="PRIVACY">
              <SettingItem icon="visibility" title="Show Online Status" hasSwitch value={settings.showOnlineStatus as boolean} onToggle={() => toggleSetting('showOnlineStatus')} />
              <SettingItem icon="done-all" title="Read Receipts" hasSwitch value={settings.readReceipts as boolean} onToggle={() => toggleSetting('readReceipts')} />
              <SettingItem icon="share" title="Story Sharing" hasSwitch value={settings.storySharing as boolean} onToggle={() => toggleSetting('storySharing')} />
              <SettingItem icon="filter-list" title="Comment Filtering" hasSwitch value={settings.commentFiltering as boolean} onToggle={() => toggleSetting('commentFiltering')} />
              <SettingItem icon="message" title="Message Requests" hasSwitch value={settings.messageRequests as boolean} onToggle={() => toggleSetting('messageRequests')} />
              <SettingItem icon="local-offer" title="Tag Review" hasSwitch value={settings.tagReview as boolean} onToggle={() => toggleSetting('tagReview')} />
              <SettingItem icon="trending-up" title="Activity Status" hasSwitch value={settings.activityStatus as boolean} onToggle={() => toggleSetting('activityStatus')} />
            </SettingSection>

            {/* Content & Media */}
            <SettingSection title="CONTENT & MEDIA">
              <SettingItem icon="play-arrow" title="Auto-play Videos" hasSwitch value={settings.autoPlayVideos as boolean} onToggle={() => toggleSetting('autoPlayVideos')} />
              <SettingItem icon="data-saver" title="Data Saver Mode" hasSwitch value={settings.dataSaver as boolean} onToggle={() => toggleSetting('dataSaver')} iconType="feather" />
              <SettingItem icon="download" title="Download Quality" hasArrow />
              <SettingItem icon="hd" title="Video Quality" hasArrow />
              <SettingItem icon="photo" title="Photo Quality" hasArrow />
            </SettingSection>

            {/* Appearance */}
            <SettingSection title="APPEARANCE">
              <SettingItem icon="dark-mode" title="Dark Mode" hasSwitch value={settings.darkMode as boolean} onToggle={() => toggleSetting('darkMode')} />
              <SettingItem icon="palette" title="Theme Color" hasArrow />
              <SettingItem icon="format-size" title="Font Size" hasArrow />
            </SettingSection>

            {/* Sound & Haptics */}
            <SettingSection title="SOUND & HAPTICS">
              <SettingItem icon="volume-up" title="Sound Effects" hasSwitch value={settings.soundEffects as boolean} onToggle={() => toggleSetting('soundEffects')} />
              <SettingItem icon="vibration" title="Vibration" hasSwitch value={settings.vibration as boolean} onToggle={() => toggleSetting('vibration')} />
              <SettingItem icon="touch-app" title="Haptic Feedback" hasSwitch value={settings.hapticFeedback as boolean} onToggle={() => toggleSetting('hapticFeedback')} />
            </SettingSection>

            {/* Advanced */}
            <SettingSection title="ADVANCED">
              <SettingItem icon="system-update" title="Auto Update" hasSwitch value={settings.autoUpdate as boolean} onToggle={() => toggleSetting('autoUpdate')} />
              <SettingItem icon="analytics" title="Analytics" hasSwitch value={settings.analytics as boolean} onToggle={() => toggleSetting('analytics')} />
            </SettingSection>

            {/* Support */}
            <SettingSection title="SUPPORT">
              <SettingItem icon="help" title="Help Center" hasArrow />
              <SettingItem icon="report" title="Report Problem" hasArrow />
              <SettingItem icon="info" title="About App" hasArrow />
            </SettingSection>

            {/* Actions */}
            <View style={styles.settingsSection}>
              <TouchableOpacity style={[styles.settingsItem, styles.logoutButton]} onPress={() => Alert.alert('Logout', 'Are you sure you want to logout?')}>
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.settingsItem, styles.deleteButton]} onPress={() => Alert.alert('Delete Account', 'This action cannot be undone. Are you sure?')}>
                <Text style={styles.deleteText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  settingsContent: {
    flex: 1,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.background.secondary,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsItemText: {
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  logoutButton: {
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary.main,
    textAlign: 'center',
  },
  deleteButton: {
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
  },
});
