import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, 
  Dimensions, TextInput, Modal, Switch, FlatList, Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { useAuth } from '../../template';
import { earningsApi } from '../../services/earningsService';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const { width } = Dimensions.get('window');
const PASSWORD_KEY = 'earnings_password';

// Content type requirements (Earning rate aur daily limit hata diye)
const CONTENT_REQUIREMENTS = {
  story: { 
    traffic: 2000, 
    stars: 500, 
    icon: 'auto-stories', 
    title: 'Story',
    color: '#FF0000',
    description: 'Create short stories and earn money'
  },
  photo: { 
    traffic: 5000, 
    stars: 1000, 
    icon: 'photo', 
    title: 'Photo',
    color: '#2196F3',
    description: 'Upload photos and earn money'
  },
  reels: { 
    traffic: 10000, 
    stars: 4000, 
    icon: 'theaters', 
    title: 'Reels',
    color: '#9C27B0',
    description: 'Create reels and earn money'
  },
  live: { 
    traffic: 10000, 
    stars: 1000, 
    icon: 'broadcast-on-personal', 
    title: 'Live',
    color: '#FF5722',
    description: 'Go live and earn money'
  },
  video: { 
    traffic: 12000, 
    stars: 2000, 
    icon: 'videocam', 
    title: 'Video',
    color: '#FF9800',
    description: 'Upload videos and earn money'
  },
  shayari: { 
    traffic: 3000, 
    stars: 800, 
    icon: 'format-quote', 
    title: 'Shayari Photo',
    color: '#E91E63',
    description: 'Create shayari photos and earn money'
  },
};

// Content options
const contentOptions = [
  { 
    id: 1, 
    title: 'Story', 
    icon: 'auto-stories', 
    type: 'story',
    requirements: CONTENT_REQUIREMENTS.story
  },
  { 
    id: 2, 
    title: 'Photo', 
    icon: 'photo', 
    type: 'photo',
    requirements: CONTENT_REQUIREMENTS.photo
  },
  { 
    id: 3, 
    title: 'Reels', 
    icon: 'theaters', 
    type: 'reels',
    requirements: CONTENT_REQUIREMENTS.reels
  },
  { 
    id: 4, 
    title: 'Live', 
    icon: 'broadcast-on-personal', 
    type: 'live',
    requirements: CONTENT_REQUIREMENTS.live
  },
  { 
    id: 5, 
    title: 'Video', 
    icon: 'videocam', 
    type: 'video',
    requirements: CONTENT_REQUIREMENTS.video
  },
  { 
    id: 6, 
    title: 'Shayari Photo', 
    icon: 'format-quote', 
    type: 'shayari',
    requirements: CONTENT_REQUIREMENTS.shayari
  },
];

// Country list for bank details
const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Japan', 'Singapore', 'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait',
  'South Africa', 'Brazil', 'Mexico', 'Russia', 'China', 'South Korea', 'Malaysia'
];

// Bank types for different countries
const BANK_TYPES = {
  'India': ['Savings', 'Current', 'NRI', 'Salary'],
  'United States': ['Checking', 'Savings', 'Money Market', 'Certificate of Deposit'],
  'United Kingdom': ['Current', 'Savings', 'Joint'],
  'Canada': ['Chequing', 'Savings', 'US Dollar'],
  'Australia': ['Everyday', 'Savings', 'Term Deposit']
};

export default function EarningsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Password states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  
  // Earnings states
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  
  // User stats for content unlock
  const [userStats, setUserStats] = useState({
    totalTraffic: 1500,
    totalStars: 300,
    storyUnlocked: false,
    photoUnlocked: false,
    reelsUnlocked: false,
    liveUnlocked: false,
    videoUnlocked: false,
  });

  // Feature settings for each content type
  const [featureSettings, setFeatureSettings] = useState({
    story: { enabled: false, autoDelete: false, dailyUploads: 0, totalEarnings: 0 },
    photo: { enabled: false, autoDelete: false, dailyUploads: 0, totalEarnings: 0 },
    reels: { enabled: false, autoDelete: false, dailyUploads: 0, totalEarnings: 0 },
    live: { enabled: false, autoDelete: false, dailyUploads: 0, totalEarnings: 0 },
    video: { enabled: false, autoDelete: false, dailyUploads: 0, totalEarnings: 0 }
  });

  const [earningsData, setEarningsData] = useState({
    totalRevenue: 1250.50,
    currentBalance: 850.25,
    availableBalance: 650.00,
    pendingBalance: 200.25,
    totalEarned: 2500.75,
    thisMonth: 350.50,
    lastMonth: 400.25,
    currency: 'USD',
  });

  // COMPREHENSIVE BANK DETAILS FOR GLOBAL USERS
  const [bankDetails, setBankDetails] = useState({
    // Personal Information
    accountHolderName: 'John Doe',
    dateOfBirth: '1990-01-15',
    gender: 'male',
    nationality: 'Indian',
    
    // Contact Information
    phoneNumber: '+91 9876543210',
    email: 'john.doe@example.com',
    alternateEmail: 'johndoe.backup@example.com',
    
    // Address Information
    addressLine1: '123 Main Street',
    addressLine2: 'Apartment 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    
    // Bank Information
    bankName: 'State Bank of India',
    bankBranch: 'Mumbai Main Branch',
    branchCode: 'SBI001',
    bankAddress: 'Nariman Point, Mumbai',
    bankCity: 'Mumbai',
    bankCountry: 'India',
    bankPhone: '+91 22 2200 1234',
    
    // Account Information
    accountNumber: '123456789012',
    accountType: 'savings',
    routingNumber: 'SBIN0001234',
    ibanNumber: '',
    swiftCode: 'SBININBB123',
    bsbCode: '',
    sortCode: '',
    
    // Tax Information
    taxId: 'ABCDE1234F',
    taxIdType: 'PAN',
    ssn: '',
    ein: '',
    
    // Verification Documents
    documentType: 'passport',
    documentNumber: 'A1234567',
    documentExpiry: '2030-12-31',
    
    // Additional Information
    occupation: 'Software Engineer',
    monthlyIncome: '50000',
    sourceOfFunds: 'Salary',
    purposeOfAccount: 'Salary and Savings',
    
    // Verification Status
    isVerified: true,
    verificationLevel: 'level2',
    verificationDate: '2024-01-15',
    accountLinkedDate: '2024-01-10',
    
    // Security Settings
    twoFactorEnabled: true,
    withdrawalLimit: 50000,
    transactionLimit: 100000,
  });

  const [unlocked, setUnlocked] = useState(false);
  const [showBankSetupModal, setShowBankSetupModal] = useState(false);
  
  // Content Modal State
  const [showContentModal, setShowContentModal] = useState(false);
  type ContentSettings = { enabled: boolean; autoDelete: boolean };
  type SelectedContent = {
    type: string;
    requirements: { traffic: number; stars: number; title: string; icon: string; color: string; description: string };
    isUnlocked: boolean;
    userStats: { totalTraffic: number; totalStars: number };
    settings: ContentSettings;
  };
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);

  // Bank Setup Steps
  const [bankSetupStep, setBankSetupStep] = useState(1);

  // Password Management Functions
  const checkPasswordSet = useCallback(async () => {
    try {
      const password = await SecureStore.getItemAsync(PASSWORD_KEY);
      const hasPassword = password !== null;
      setIsPasswordSet(hasPassword);
      
      if (!hasPassword) {
        setTimeout(() => {
          setShowPasswordModal(true);
        }, 500);
      } else {
        const hasBiometric = await checkBiometric();
        if (hasBiometric) {
          setShowBiometricPrompt(true);
          setTimeout(() => {
            handleBiometricLogin();
          }, 800);
        } else {
          setTimeout(() => {
            setShowPasswordModal(true);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error checking password:', error);
    }
  }, []);

  const checkBiometric = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const hasBiometric = compatible && enrolled;
      setBiometricAvailable(hasBiometric);
      return hasBiometric;
    } catch (error) {
      console.error('Error checking biometric:', error);
      return false;
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access earnings',
        fallbackLabel: 'Use password instead',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        setUnlocked(true);
        setShowPasswordModal(false);
        setShowBiometricPrompt(false);
        loadEarningsData();
        loadUserStats();
      } else {
        if (result.error !== 'user_cancel') {
          setShowPasswordModal(true);
        }
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSetup = async () => {
    if (newPassword.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      await SecureStore.setItemAsync(PASSWORD_KEY, newPassword);
      setIsPasswordSet(true);
      setUnlocked(true);
      setShowPasswordModal(false);
      Alert.alert('Success', 'Password set successfully!');
      loadEarningsData();
      loadUserStats();
    } catch (error) {
      console.error('Error setting password:', error);
      Alert.alert('Error', 'Failed to set password');
    }
  };

  const handlePasswordLogin = async () => {
    if (!passwordInput.trim()) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    try {
      const savedPassword = await SecureStore.getItemAsync(PASSWORD_KEY);
      if (passwordInput === savedPassword) {
        setUnlocked(true);
        setShowPasswordModal(false);
        loadEarningsData();
        loadUserStats();
      } else {
        Alert.alert('Error', 'Incorrect password');
        setPasswordInput('');
      }
    } catch (error) {
      console.error('Password check error:', error);
      Alert.alert('Error', 'Login failed');
    }
  };

  const handleForgotPassword = async () => {
    Alert.alert(
      'Reset Password',
      'This will reset your earnings password. You will need to set a new password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync(PASSWORD_KEY);
              setIsPasswordSet(false);
              setUnlocked(false);
              setShowPasswordModal(true);
              Alert.alert('Success', 'Password reset successfully. Please set a new password.');
            } catch (error) {
              console.error('Error resetting password:', error);
              Alert.alert('Error', 'Failed to reset password');
            }
          }
        }
      ]
    );
  };

  const openPasswordModal = () => {
    setShowPasswordModal(true);
  };

  // Earnings Functions
  const loadEarningsData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Load data from MongoDB via API
      const earningsResponse = await earningsApi.getEarningsData();
      
      const balanceResponse = await earningsApi.getUserBalance();
      
      const pointsResponse = await earningsApi.getUserPoints();
      
      if (earningsResponse.data) {
        setEarningsData({
          totalRevenue: earningsResponse.data.totalRevenue || 0,
          currentBalance: earningsResponse.data.currentBalance || 0,
          availableBalance: balanceResponse.data?.availableBalance || 0,
          pendingBalance: earningsResponse.data.pendingBalance || 0,
          totalEarned: earningsResponse.data.totalEarned || 0,
          thisMonth: earningsResponse.data.thisMonth || 0,
          lastMonth: earningsResponse.data.lastMonth || 0,
          currency: earningsResponse.data.currency || 'USD',
        });
      } else {
      }
    } catch (error) {
      console.error('❌ [EARNINGS] Error loading earnings data:', error);
      console.error('❌ [EARNINGS] Error message:', (error as Error).message);
      // Fallback to demo data if API fails
      setEarningsData({
        totalRevenue: 1250.50,
        currentBalance: 850.25,
        availableBalance: 650.00,
        pendingBalance: 200.25,
        totalEarned: 2500.75,
        thisMonth: 350.50,
        lastMonth: 400.25,
        currency: 'USD',
      });
    }
    setLoading(false);
  }, []);

  const loadUserStats = useCallback(async () => {
    try {
      const mockStats = {
        totalTraffic: 1500,
        totalStars: 300,
      };
      
      const updatedStats = {
        ...mockStats,
        storyUnlocked: mockStats.totalTraffic >= 2000 && mockStats.totalStars >= 500,
        photoUnlocked: mockStats.totalTraffic >= 5000 && mockStats.totalStars >= 1000,
        reelsUnlocked: mockStats.totalTraffic >= 10000 && mockStats.totalStars >= 4000,
        liveUnlocked: mockStats.totalTraffic >= 10000 && mockStats.totalStars >= 1000,
        videoUnlocked: mockStats.totalTraffic >= 12000 && mockStats.totalStars >= 2000,
      };
      
      setUserStats(updatedStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, []);

  // CONTENT HANDLING - Ek ke niche ek items
  const handleContentPress = (contentType: { type: string; requirements: { traffic: number; stars: number; title: string; icon: string; color: string; description: string } }) => {
    const isUnlocked = userStats[`${contentType.type}Unlocked` as keyof typeof userStats] as boolean;
    
    setSelectedContent({
      ...contentType,
      isUnlocked: isUnlocked,
      userStats: userStats,
      settings: featureSettings[contentType.type as keyof typeof featureSettings]
    });
    
    setShowContentModal(true);
  };

  // Feature toggle functions
  const toggleFeature = (contentType: string, settingType: 'enabled' | 'autoDelete') => {
    setFeatureSettings(prev => ({
      ...prev,
      [contentType]: {
        ...prev[contentType as keyof typeof featureSettings],
        [settingType]: !prev[contentType as keyof typeof featureSettings][settingType]
      }
    }));

    // Update selected content if it is currently open
    if (selectedContent && selectedContent.type === contentType) {
      setSelectedContent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          settings: {
            ...prev.settings,
            [settingType]: !prev.settings[settingType]
          }
        };
      });
    }
  };

  // COMPREHENSIVE CONTENT MODAL (Earning rate, daily limit aur tips hata diye)
  const renderContentModal = () => {
    if (!selectedContent) return null;
    
    const requirements = selectedContent.requirements;
    const isUnlocked = selectedContent.isUnlocked;
    const userStats = selectedContent.userStats;
    const settings = selectedContent.settings;
    
    const trafficNeeded = Math.max(0, requirements.traffic - userStats.totalTraffic);
    const starsNeeded = Math.max(0, requirements.stars - userStats.totalStars);
    const trafficProgress = Math.min((userStats.totalTraffic / requirements.traffic) * 100, 100);
    const starsProgress = Math.min((userStats.totalStars / requirements.stars) * 100, 100);
    
    return (
      <Modal
        visible={showContentModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowContentModal(false)}
      >
        <SafeAreaView style={styles.contentModalContainer}>
          <View style={styles.contentModalContent}>
            {/* Header */}
            <View style={styles.contentModalHeader}>
              <TouchableOpacity 
                onPress={() => setShowContentModal(false)} 
                style={styles.contentModalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.contentModalTitle}>{requirements.title}</Text>
              <View style={styles.contentModalPlaceholder} />
            </View>

            <ScrollView style={styles.contentModalScroll} showsVerticalScrollIndicator={false}>
              
              {/* Icon and Status */}
              <View style={styles.contentModalIconSection}>
                <View style={[styles.contentModalIconContainer, { backgroundColor: `${requirements.color}15` }]}>
                  <MaterialIcons name={requirements.icon as any} size={50} color={requirements.color} />
                  {!isUnlocked && (
                    <View style={styles.contentModalLockOverlay}>
                      <MaterialIcons name="lock" size={24} color="#fff" />
                    </View>
                  )}
                </View>
                
                <Text style={[
                  styles.contentModalStatus,
                  { color: isUnlocked ? '#4CAF50' : '#FF9800' }
                ]}>
                  {isUnlocked ? '✅ Unlocked & Ready to Earn' : '🔒 Locked - Complete Requirements'}
                </Text>
                
                <Text style={styles.contentModalDescription}>
                  {requirements.description}
                </Text>
              </View>

              {/* CRITERIA SECTION */}
              <View style={styles.criteriaSection}>
                <Text style={styles.criteriaTitle}>Unlock Criteria</Text>
                
                <View style={styles.criteriaItem}>
                  <View style={styles.criteriaHeader}>
                    <MaterialIcons name="traffic" size={20} color={requirements.color} />
                    <Text style={styles.criteriaLabel}>Traffic Required</Text>
                    <Text style={styles.criteriaValue}>
                      {requirements.traffic.toLocaleString()} views
                    </Text>
                  </View>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${trafficProgress}%`,
                            backgroundColor: requirements.color
                          }
                        ]} 
                      />
                    </View>
                    <View style={styles.progressStats}>
                      <Text style={styles.progressCurrent}>
                        {userStats.totalTraffic.toLocaleString()}
                      </Text>
                      <Text style={styles.progressSeparator}>/</Text>
                      <Text style={styles.progressRequired}>
                        {requirements.traffic.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  
                  {trafficNeeded > 0 && (
                    <Text style={styles.remainingText}>
                      Need {trafficNeeded.toLocaleString()} more views
                    </Text>
                  )}
                </View>

                <View style={styles.criteriaItem}>
                  <View style={styles.criteriaHeader}>
                    <MaterialIcons name="star" size={20} color="#FFD700" />
                    <Text style={styles.criteriaLabel}>Stars Required</Text>
                    <Text style={styles.criteriaValue}>
                      {requirements.stars.toLocaleString()} stars
                    </Text>
                  </View>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${starsProgress}%`,
                            backgroundColor: '#FFD700'
                          }
                        ]} 
                      />
                    </View>
                    <View style={styles.progressStats}>
                      <Text style={styles.progressCurrent}>
                        {userStats.totalStars.toLocaleString()}
                      </Text>
                      <Text style={styles.progressSeparator}>/</Text>
                      <Text style={styles.progressRequired}>
                        {requirements.stars.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  
                  {starsNeeded > 0 && (
                    <Text style={styles.remainingText}>
                      Need {starsNeeded.toLocaleString()} more stars
                    </Text>
                  )}
                </View>
              </View>

              {/* ACTION BUTTON */}
              <TouchableOpacity 
                style={[
                  styles.contentActionButton,
                  { 
                    backgroundColor: isUnlocked ? requirements.color : '#CCCCCC',
                    opacity: isUnlocked ? 1 : 0.7
                  }
                ]}
                onPress={() => {
                  if (isUnlocked) {
                    setShowContentModal(false);
                    Alert.alert('Success', `Starting ${requirements.title} creation...`);
                  }
                }}
                disabled={!isUnlocked}
              >
                <MaterialIcons 
                  name={isUnlocked ? "play-arrow" : "lock"} 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.contentActionButtonText}>
                  {isUnlocked ? `Start ${requirements.title}` : 'Complete Requirements First'}
                </Text>
              </TouchableOpacity>

              {/* POLICY BUTTON SECTION */}
              <View style={styles.policySection}>
                <TouchableOpacity 
                  style={styles.policyButton}
                  onPress={() => {
                    if (selectedContent.type === 'reels') {
                      Linking.openURL('https://kronopolicy.blogspot.com/2025/12/reels-policy.html');
                    } else if (selectedContent.type === 'video') {
                      Linking.openURL('https://kronopolicy.blogspot.com/2025/12/video-policy.html');
                    } else if (selectedContent.type === 'story') {
                      Linking.openURL('https://kronopolicy.blogspot.com/2025/12/story-policy.html');
                    } else if (selectedContent.type === 'photo') {
                      Linking.openURL('https://kronopolicy.blogspot.com/2025/12/photo-policy.html');
                    } else if (selectedContent.type === 'live') {
                      Linking.openURL('https://kronopolicy.blogspot.com/2025/12/live-policy.html');
                    }
                  }}
                >
                  <MaterialIcons name="policy" size={18} color="#2196F3" />
                  <Text style={styles.policyButtonText}>View {requirements.title} Policy</Text>
                </TouchableOpacity>
              </View>

              {/* REFRESH SECTION */}
              <View style={styles.refreshSection}>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={() => {
                    Alert.alert('Refreshed', `Refreshed ${requirements.title} data successfully!`);
                    loadUserStats();
                  }}
                >
                  <MaterialIcons name="refresh" size={18} color={requirements.color} />
                  <Text style={styles.refreshButtonText}>Refresh {requirements.title} Data</Text>
                </TouchableOpacity>
              </View>
              
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // COMPREHENSIVE BANK SETUP WITH STEPS
  const renderBankSetupModal = () => {
    const renderStep1 = () => (
      <View>
        <View style={styles.bankStepHeader}>
          <View style={[styles.bankStepCircle, styles.bankStepActive]}>
            <Text style={styles.bankStepNumber}>1</Text>
          </View>
          <Text style={styles.bankStepTitle}>Personal Information</Text>
        </View>

        <View style={styles.bankForm}>
          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Full Name *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.accountHolderName}
              onChangeText={(text) => setBankDetails({...bankDetails, accountHolderName: text})}
              placeholder="Enter your full name"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Date of Birth *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.dateOfBirth}
              onChangeText={(text) => setBankDetails({...bankDetails, dateOfBirth: text})}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Gender</Text>
            <View style={styles.bankRadioGroup}>
              <TouchableOpacity 
                style={[
                  styles.bankRadioButton,
                  bankDetails.gender === 'male' && styles.bankRadioButtonSelected
                ]}
                onPress={() => setBankDetails({...bankDetails, gender: 'male'})}
              >
                <Text style={[
                  styles.bankRadioText,
                  bankDetails.gender === 'male' && styles.bankRadioTextSelected
                ]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.bankRadioButton,
                  bankDetails.gender === 'female' && styles.bankRadioButtonSelected
                ]}
                onPress={() => setBankDetails({...bankDetails, gender: 'female'})}
              >
                <Text style={[
                  styles.bankRadioText,
                  bankDetails.gender === 'female' && styles.bankRadioTextSelected
                ]}>Female</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.bankRadioButton,
                  bankDetails.gender === 'other' && styles.bankRadioButtonSelected
                ]}
                onPress={() => setBankDetails({...bankDetails, gender: 'other'})}
              >
                <Text style={[
                  styles.bankRadioText,
                  bankDetails.gender === 'other' && styles.bankRadioTextSelected
                ]}>Other</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Nationality *</Text>
            <View style={styles.bankSelect}>
              <TextInput
                style={styles.bankInput}
                value={bankDetails.nationality}
                onChangeText={(text) => setBankDetails({...bankDetails, nationality: text})}
                placeholder="Select your nationality"
                placeholderTextColor={theme.colors.text.tertiary}
              />
              <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
            </View>
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Occupation *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.occupation}
              onChangeText={(text) => setBankDetails({...bankDetails, occupation: text})}
              placeholder="Enter your occupation"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Monthly Income *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.monthlyIncome}
              onChangeText={(text) => setBankDetails({...bankDetails, monthlyIncome: text})}
              placeholder="Enter monthly income"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>
    );

    const renderStep2 = () => (
      <View>
        <View style={styles.bankStepHeader}>
          <View style={[styles.bankStepCircle, styles.bankStepCompleted]}>
            <MaterialIcons name="check" size={20} color="#fff" />
          </View>
          <Text style={styles.bankStepTitleCompleted}>Personal Information</Text>
          
          <View style={[styles.bankStepCircle, styles.bankStepActive]}>
            <Text style={styles.bankStepNumber}>2</Text>
          </View>
          <Text style={styles.bankStepTitle}>Contact & Address</Text>
        </View>

        <View style={styles.bankForm}>
          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.phoneNumber}
              onChangeText={(text) => setBankDetails({...bankDetails, phoneNumber: text})}
              placeholder="+91 9876543210"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Email Address *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.email}
              onChangeText={(text) => setBankDetails({...bankDetails, email: text})}
              placeholder="primary@email.com"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Alternate Email</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.alternateEmail}
              onChangeText={(text) => setBankDetails({...bankDetails, alternateEmail: text})}
              placeholder="alternate@email.com"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Address Line 1 *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.addressLine1}
              onChangeText={(text) => setBankDetails({...bankDetails, addressLine1: text})}
              placeholder="Street address"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Address Line 2</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.addressLine2}
              onChangeText={(text) => setBankDetails({...bankDetails, addressLine2: text})}
              placeholder="Apartment, suite, etc."
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          <View style={styles.bankInputGroupRow}>
            <View style={[styles.bankInputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.bankInputLabel}>City *</Text>
              <TextInput
                style={styles.bankInput}
                value={bankDetails.city}
                onChangeText={(text) => setBankDetails({...bankDetails, city: text})}
                placeholder="City"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
            <View style={[styles.bankInputGroup, { flex: 1 }]}>
              <Text style={styles.bankInputLabel}>State *</Text>
              <TextInput
                style={styles.bankInput}
                value={bankDetails.state}
                onChangeText={(text) => setBankDetails({...bankDetails, state: text})}
                placeholder="State/Province"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>
          </View>

          <View style={styles.bankInputGroupRow}>
            <View style={[styles.bankInputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.bankInputLabel}>Postal Code *</Text>
              <TextInput
                style={styles.bankInput}
                value={bankDetails.postalCode}
                onChangeText={(text) => setBankDetails({...bankDetails, postalCode: text})}
                placeholder="Postal code"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.bankInputGroup, { flex: 1 }]}>
              <Text style={styles.bankInputLabel}>Country *</Text>
              <View style={styles.bankSelect}>
                <TextInput
                  style={styles.bankInput}
                  value={bankDetails.country}
                  onChangeText={(text) => setBankDetails({...bankDetails, country: text})}
                  placeholder="Select country"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
                <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
              </View>
            </View>
          </View>
        </View>
      </View>
    );

    const renderStep3 = () => (
      <View>
        <View style={styles.bankStepHeader}>
          <View style={[styles.bankStepCircle, styles.bankStepCompleted]}>
            <MaterialIcons name="check" size={20} color="#fff" />
          </View>
          <Text style={styles.bankStepTitleCompleted}>Personal Information</Text>
          
          <View style={[styles.bankStepCircle, styles.bankStepCompleted]}>
            <MaterialIcons name="check" size={20} color="#fff" />
          </View>
          <Text style={styles.bankStepTitleCompleted}>Contact & Address</Text>
          
          <View style={[styles.bankStepCircle, styles.bankStepActive]}>
            <Text style={styles.bankStepNumber}>3</Text>
          </View>
          <Text style={styles.bankStepTitle}>Bank Details</Text>
        </View>

        <View style={styles.bankForm}>
          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Country of Bank *</Text>
            <View style={styles.bankSelect}>
              <TextInput
                style={styles.bankInput}
                value={bankDetails.bankCountry}
                onChangeText={(text) => setBankDetails({...bankDetails, bankCountry: text})}
                placeholder="Select bank country"
                placeholderTextColor={theme.colors.text.tertiary}
              />
              <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
            </View>
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Bank Name *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.bankName}
              onChangeText={(text) => setBankDetails({...bankDetails, bankName: text})}
              placeholder="Enter bank name"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Account Number *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.accountNumber}
              onChangeText={(text) => setBankDetails({...bankDetails, accountNumber: text})}
              placeholder="Enter account number"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Account Type *</Text>
            <View style={styles.bankRadioGroup}>
              <TouchableOpacity 
                style={[
                  styles.bankRadioButton,
                  bankDetails.accountType === 'savings' && styles.bankRadioButtonSelected
                ]}
                onPress={() => setBankDetails({...bankDetails, accountType: 'savings'})}
              >
                <Text style={[
                  styles.bankRadioText,
                  bankDetails.accountType === 'savings' && styles.bankRadioTextSelected
                ]}>Savings</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.bankRadioButton,
                  bankDetails.accountType === 'current' && styles.bankRadioButtonSelected
                ]}
                onPress={() => setBankDetails({...bankDetails, accountType: 'current'})}
              >
                <Text style={[
                  styles.bankRadioText,
                  bankDetails.accountType === 'current' && styles.bankRadioTextSelected
                ]}>Current</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>SWIFT/BIC Code *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.swiftCode}
              onChangeText={(text) => setBankDetails({...bankDetails, swiftCode: text.toUpperCase()})}
              placeholder="Enter SWIFT/BIC code"
              placeholderTextColor={theme.colors.text.tertiary}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>IBAN Number (International)</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.ibanNumber}
              onChangeText={(text) => setBankDetails({...bankDetails, ibanNumber: text.toUpperCase()})}
              placeholder="Enter IBAN number"
              placeholderTextColor={theme.colors.text.tertiary}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Routing Number (USA)</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.routingNumber}
              onChangeText={(text) => setBankDetails({...bankDetails, routingNumber: text})}
              placeholder="Enter routing number"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Sort Code (UK)</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.sortCode}
              onChangeText={(text) => setBankDetails({...bankDetails, sortCode: text})}
              placeholder="Enter sort code"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>BSB Code (Australia)</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.bsbCode}
              onChangeText={(text) => setBankDetails({...bankDetails, bsbCode: text})}
              placeholder="Enter BSB code"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>
    );

    const renderStep4 = () => (
      <View>
        <View style={styles.bankStepHeader}>
          <View style={[styles.bankStepCircle, styles.bankStepCompleted]}>
            <MaterialIcons name="check" size={20} color="#fff" />
          </View>
          <Text style={styles.bankStepTitleCompleted}>Personal</Text>
          
          <View style={[styles.bankStepCircle, styles.bankStepCompleted]}>
            <MaterialIcons name="check" size={20} color="#fff" />
          </View>
          <Text style={styles.bankStepTitleCompleted}>Contact</Text>
          
          <View style={[styles.bankStepCircle, styles.bankStepCompleted]}>
            <MaterialIcons name="check" size={20} color="#fff" />
          </View>
          <Text style={styles.bankStepTitleCompleted}>Bank</Text>
          
          <View style={[styles.bankStepCircle, styles.bankStepActive]}>
            <Text style={styles.bankStepNumber}>4</Text>
          </View>
          <Text style={styles.bankStepTitle}>Tax & Verification</Text>
        </View>

        <View style={styles.bankForm}>
          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Tax ID Type *</Text>
            <View style={styles.bankSelect}>
              <TextInput
                style={styles.bankInput}
                value={bankDetails.taxIdType}
                onChangeText={(text) => setBankDetails({...bankDetails, taxIdType: text})}
                placeholder="Select tax ID type"
                placeholderTextColor={theme.colors.text.tertiary}
              />
              <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
            </View>
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Tax ID Number *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.taxId}
              onChangeText={(text) => setBankDetails({...bankDetails, taxId: text.toUpperCase()})}
              placeholder="Enter tax ID number"
              placeholderTextColor={theme.colors.text.tertiary}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>SSN (USA)</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.ssn}
              onChangeText={(text) => setBankDetails({...bankDetails, ssn: text})}
              placeholder="Enter Social Security Number"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>EIN (USA Businesses)</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.ein}
              onChangeText={(text) => setBankDetails({...bankDetails, ein: text})}
              placeholder="Enter Employer Identification Number"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Document Type *</Text>
            <View style={styles.bankSelect}>
              <TextInput
                style={styles.bankInput}
                value={bankDetails.documentType}
                onChangeText={(text) => setBankDetails({...bankDetails, documentType: text})}
                placeholder="Select document type"
                placeholderTextColor={theme.colors.text.tertiary}
              />
              <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.secondary} />
            </View>
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Document Number *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.documentNumber}
              onChangeText={(text) => setBankDetails({...bankDetails, documentNumber: text.toUpperCase()})}
              placeholder="Enter document number"
              placeholderTextColor={theme.colors.text.tertiary}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Document Expiry *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.documentExpiry}
              onChangeText={(text) => setBankDetails({...bankDetails, documentExpiry: text})}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Source of Funds *</Text>
            <TextInput
              style={styles.bankInput}
              value={bankDetails.sourceOfFunds}
              onChangeText={(text) => setBankDetails({...bankDetails, sourceOfFunds: text})}
              placeholder="Salary, Business, Investments, etc."
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          <View style={styles.bankInputGroup}>
            <Text style={styles.bankInputLabel}>Purpose of Account *</Text>
            <TextInput
              style={[styles.bankInput, styles.bankTextArea]}
              value={bankDetails.purposeOfAccount}
              onChangeText={(text) => setBankDetails({...bankDetails, purposeOfAccount: text})}
              placeholder="Describe the purpose of this account"
              placeholderTextColor={theme.colors.text.tertiary}
              multiline={true}
              numberOfLines={3}
            />
          </View>
        </View>
      </View>
    );

    const handleNextStep = () => {
      if (bankSetupStep < 4) {
        setBankSetupStep(bankSetupStep + 1);
      } else {
        handleSaveBankDetails();
      }
    };

    const handlePrevStep = () => {
      if (bankSetupStep > 1) {
        setBankSetupStep(bankSetupStep - 1);
      }
    };

    return (
      <Modal
        visible={showBankSetupModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => {
          setShowBankSetupModal(false);
          setBankSetupStep(1);
        }}
      >
        <SafeAreaView style={styles.bankModalContainer}>
          <View style={styles.bankModalContent}>
            <View style={styles.bankModalHeader}>
              <View style={styles.bankModalHeaderRow}>
                <TouchableOpacity 
                  onPress={() => {
                    setShowBankSetupModal(false);
                    setBankSetupStep(1);
                  }} 
                  style={styles.bankModalBackButton}
                >
                  <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.bankModalTitle}>
                  {bankSetupStep === 1 && 'Personal Information'}
                  {bankSetupStep === 2 && 'Contact & Address'}
                  {bankSetupStep === 3 && 'Bank Details'}
                  {bankSetupStep === 4 && 'Tax & Verification'}
                </Text>
                <View style={styles.bankModalPlaceholder} />
              </View>
              <Text style={styles.bankModalSubtitle}>
                Step {bankSetupStep} of 4
              </Text>
            </View>

            <ScrollView style={styles.bankModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.bankFormContainer}>
                {bankSetupStep === 1 && renderStep1()}
                {bankSetupStep === 2 && renderStep2()}
                {bankSetupStep === 3 && renderStep3()}
                {bankSetupStep === 4 && renderStep4()}

                <View style={styles.bankStepButtons}>
                  {bankSetupStep > 1 && (
                    <TouchableOpacity 
                      style={styles.bankPrevButton}
                      onPress={handlePrevStep}
                    >
                      <MaterialIcons name="arrow-back" size={20} color={theme.colors.primary.main} />
                      <Text style={styles.bankPrevButtonText}>Previous</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.bankNextButton}
                    onPress={handleNextStep}
                    disabled={savingBank}
                  >
                    {savingBank ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.bankNextButtonText}>
                          {bankSetupStep === 4 ? 'Submit & Verify' : 'Next Step'}
                        </Text>
                        <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.bankNote}>
                  * Required fields. Your information is securely encrypted and protected.
                  Verification may take 24-48 hours.
                </Text>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // Bank Functions
  const handleSaveBankDetails = async () => {
    setSavingBank(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert(
        'Success', 
        'Bank details submitted successfully! Your account will be verified within 24-48 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowBankSetupModal(false);
              setBankSetupStep(1);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Save bank details error:', error);
      Alert.alert('Error', 'Failed to save bank details. Please try again.');
    }
    setSavingBank(false);
  };

  const handleWithdraw = async () => {
    if (earningsData.availableBalance < 10) {
      Alert.alert('Minimum Withdrawal', 'Minimum withdrawal amount is $10');
      return;
    }

    if (!bankDetails.isVerified) {
      Alert.alert('Verification Required', 'Please verify your bank account first');
      return;
    }

    setWithdrawing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert('Success', `Withdrawal request of ${formatCurrency(earningsData.availableBalance)} submitted successfully! Funds will be transferred in 3-5 business days.`);
      
      setEarningsData(prev => ({
        ...prev,
        availableBalance: 0,
        pendingBalance: prev.pendingBalance + prev.availableBalance
      }));
    } catch (error) {
      console.error('Withdrawal error:', error);
      Alert.alert('Error', 'Failed to process withdrawal request');
    }
    setWithdrawing(false);
  };

  const handleHistoryPress = () => {
    router.push('/help-center');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: earningsData.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const openBankSetup = () => {
    setShowBankSetupModal(true);
  };

  const editBankDetails = () => {
    setShowBankSetupModal(true);
  };

  useEffect(() => {
    if (!user) return;
    checkPasswordSet();
    loadEarningsData();
    loadUserStats();
  }, [user]);

  // Password Modal Component
  const renderPasswordModal = () => (
    <Modal
      visible={showPasswordModal}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={() => {}}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <MaterialIcons name="lock" size={60} color={theme.colors.primary.main} />
            <Text style={styles.modalTitle}>
              {isPasswordSet ? 'Enter Earnings Password' : 'Set Earnings Password'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isPasswordSet 
                ? 'Enter password to access earnings and bank details'
                : 'Create a password to protect your earnings and bank details'
              }
            </Text>
          </View>

          {isPasswordSet ? (
            <>
              <View style={styles.passwordInputContainer}>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    placeholder="Enter password"
                    secureTextEntry={!showPassword}
                    placeholderTextColor={theme.colors.text.tertiary}
                    autoCapitalize="none"
                    onSubmitEditing={handlePasswordLogin}
                    autoFocus={true}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons 
                      name={showPassword ? "visibility-off" : "visibility"} 
                      size={24} 
                      color={theme.colors.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.unlockButton}
                onPress={handlePasswordLogin}
              >
                <Text style={styles.unlockButtonText}>Unlock Earnings</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {biometricAvailable && (
                <TouchableOpacity 
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                >
                  <MaterialIcons name="fingerprint" size={24} color={theme.colors.primary.main} />
                  <Text style={styles.biometricButtonText}>Use Fingerprint</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <View style={styles.passwordInputContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Create Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter password (min 4 characters)"
                      secureTextEntry={!showNewPassword}
                      placeholderTextColor={theme.colors.text.tertiary}
                      autoCapitalize="none"
                      autoFocus={true}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                      <MaterialIcons 
                        name={showNewPassword ? "visibility-off" : "visibility"} 
                        size={24} 
                        color={theme.colors.text.secondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm password"
                      secureTextEntry={!showConfirmPassword}
                      placeholderTextColor={theme.colors.text.tertiary}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <MaterialIcons 
                        name={showConfirmPassword ? "visibility-off" : "visibility"} 
                        size={24} 
                        color={theme.colors.text.secondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.setupButton}
                onPress={handlePasswordSetup}
              >
                <Text style={styles.setupButtonText}>Set Password</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.passwordNote}>
            {isPasswordSet 
              ? 'Password is required to protect your sensitive financial information.'
              : 'You will need this password every time you access your earnings.'
            }
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // EK KE NICHE EK CONTENT LIST
  const renderContentList = () => (
    <View style={styles.contentListSection}>
      <Text style={styles.sectionTitle}>Content Features</Text>
      <View style={styles.contentListContainer}>
        {contentOptions.map((option) => {
          const isUnlocked = userStats[`${option.type}Unlocked` as keyof typeof userStats] as boolean;
          
          return (
            <TouchableOpacity 
              key={option.id} 
              style={styles.contentListItem}
              onPress={() => handleContentPress(option)}
            >
              <View style={styles.contentListLeft}>
                <View style={[
                  styles.contentListIcon,
                  { backgroundColor: `${option.requirements.color}15` }
                ]}>
                  <MaterialIcons 
                    name={option.icon as any} 
                    size={22} 
                    color={option.requirements.color} 
                  />
                  {!isUnlocked && (
                    <View style={styles.contentListLockOverlay}>
                      <MaterialIcons name="lock" size={14} color="#fff" />
                    </View>
                  )}
                </View>
                
                <View style={styles.contentListInfo}>
                  <Text style={[
                    styles.contentListTitle,
                    !isUnlocked && styles.contentListTitleLocked
                  ]}>
                    {option.title}
                  </Text>
                  <Text style={styles.contentListDescription}>
                    {option.requirements.description}
                  </Text>
                </View>
              </View>
              
              <View style={styles.contentListRight}>
                <View style={styles.contentListRequirements}>
                  <View style={styles.requirementBadge}>
                    <MaterialIcons name="visibility" size={12} color="#fff" />
                    <Text style={styles.requirementBadgeText}>
                      {option.requirements.traffic.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.requirementBadge}>
                    <MaterialIcons name="star" size={12} color="#FFD700" />
                    <Text style={styles.requirementBadgeText}>
                      {option.requirements.stars.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <MaterialIcons 
                  name="chevron-right" 
                  size={22} 
                  color={isUnlocked ? option.requirements.color : theme.colors.text.tertiary} 
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  if (!unlocked) {
    return (
      <SafeScreen edges={['top']}>
        {renderPasswordModal()}
        <View style={styles.lockedContainer}>
          <MaterialIcons name="lock" size={80} color={theme.colors.text.secondary} />
          <Text style={styles.lockedText}>Earnings Locked</Text>
          <Text style={styles.lockedSubtext}>
            {showBiometricPrompt 
              ? 'Authenticating with fingerprint...' 
              : 'Enter password to access earnings'
            }
          </Text>
          {!showBiometricPrompt && (
            <TouchableOpacity 
              style={styles.unlockManualButton}
              onPress={openPasswordModal}
            >
              <Text style={styles.unlockManualButtonText}>Enter Password Manually</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeScreen>
    );
  }

  if (loading) {
    return (
      <SafeScreen edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
      {renderPasswordModal()}
      {renderBankSetupModal()}
      {renderContentModal()}
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Earnings Dashboard</Text>
            <Text style={styles.headerSubtitle}>Manage your content earnings</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.historyButton}
              onPress={handleHistoryPress}
            >
              <MaterialIcons name="history" size={20} color={theme.colors.primary.main} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={() => router.push('/help-center')}
            >
              <MaterialIcons name="help-outline" size={20} color={theme.colors.primary.main} />
            </TouchableOpacity>
          </View>
        </View>

        {/* TOTAL REVENUE CARD - Full width */}
        <View style={styles.totalRevenueCard}>
          <View style={styles.totalRevenueHeader}>
            <Text style={styles.totalRevenueLabel}>TOTAL EARNINGS</Text>
            <MaterialIcons name="currency-rupee" size={24} color="#fff" />
          </View>
          <Text style={styles.totalRevenueAmount}>{formatCurrency(earningsData.totalRevenue)}</Text>
          
          <View style={styles.revenueStats}>
            <View style={styles.revenueStat}>
              <Text style={styles.revenueStatLabel}>Available</Text>
              <Text style={styles.revenueStatValue}>{formatCurrency(earningsData.availableBalance)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.revenueStat}>
              <Text style={styles.revenueStatLabel}>Pending</Text>
              <Text style={styles.revenueStatValue}>{formatCurrency(earningsData.pendingBalance)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.revenueStat}>
              <Text style={styles.revenueStatLabel}>This Month</Text>
              <Text style={styles.revenueStatValue}>{formatCurrency(earningsData.thisMonth)}</Text>
            </View>
          </View>
          
          {/* User Stats */}
          <View style={styles.userStatsCard}>
            <View style={styles.userStatItem}>
              <MaterialIcons name="trending-up" size={16} color="#4CAF50" />
              <Text style={styles.userStatLabel}>Traffic:</Text>
              <Text style={styles.userStatValue}>{formatNumber(userStats.totalTraffic)}</Text>
            </View>
            <View style={styles.userStatDivider} />
            <View style={styles.userStatItem}>
              <MaterialIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.userStatLabel}>Stars:</Text>
              <Text style={styles.userStatValue}>{formatNumber(userStats.totalStars)}</Text>
            </View>
          </View>
        </View>

        {/* EK KE NICHE EK CONTENT LIST */}
        {renderContentList()}

        {/* BANK SECTION - Full width */}
        <View style={styles.bankSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bank Account</Text>
            {bankDetails.accountNumber && bankDetails.isVerified && (
              <TouchableOpacity 
                style={styles.withdrawSmallButton}
                onPress={handleWithdraw}
                disabled={earningsData.availableBalance < 10 || withdrawing}
              >
                {withdrawing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.withdrawSmallButtonText}>Withdraw</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {bankDetails.accountNumber ? (
            <View style={styles.bankCard}>
              <View style={styles.bankCardHeader}>
                <View style={styles.bankCardIcon}>
                  <MaterialIcons name="account-balance" size={24} color={theme.colors.primary.main} />
                </View>
                <View style={styles.bankCardInfo}>
                  <Text style={styles.bankCardName}>{bankDetails.accountHolderName}</Text>
                  <Text style={styles.bankCardBank}>{bankDetails.bankName}</Text>
                  <Text style={styles.bankCardAccount}>
                    •••• {bankDetails.accountNumber.slice(-4)}
                  </Text>
                </View>
                <View style={[
                  styles.verificationBadge,
                  bankDetails.isVerified ? styles.verifiedBadge : styles.pendingBadge
                ]}>
                  <MaterialIcons 
                    name={bankDetails.isVerified ? "verified" : "schedule"} 
                    size={14} 
                    color="#fff" 
                  />
                  <Text style={styles.verificationBadgeText}>
                    {bankDetails.isVerified ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.bankCardDetails}>
                <View style={styles.bankDetailItem}>
                  <MaterialIcons name="place" size={14} color={theme.colors.text.secondary} />
                  <Text style={styles.bankDetailText}>{bankDetails.country}</Text>
                </View>
                <View style={styles.bankDetailItem}>
                  <MaterialIcons name="credit-card" size={14} color={theme.colors.text.secondary} />
                  <Text style={styles.bankDetailText}>{bankDetails.accountType.toUpperCase()}</Text>
                </View>
                <View style={styles.bankDetailItem}>
                  <MaterialIcons name="swap-horiz" size={14} color={theme.colors.text.secondary} />
                  <Text style={styles.bankDetailText}>{bankDetails.swiftCode}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.editBankButton}
                onPress={editBankDetails}
              >
                <MaterialIcons name="edit" size={16} color={theme.colors.primary.main} />
                <Text style={styles.editBankButtonText}>Edit Details</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noBankCard}>
              <MaterialIcons name="account-balance" size={48} color={theme.colors.text.secondary} />
              <Text style={styles.noBankTitle}>No Bank Account Added</Text>
              <Text style={styles.noBankText}>
                Add your bank account to withdraw earnings securely
              </Text>
              <TouchableOpacity 
                style={styles.addBankButton}
                onPress={openBankSetup}
              >
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.addBankButtonText}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Balance Summary */}
          <View style={styles.balanceSummary}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>{formatCurrency(earningsData.availableBalance)}</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Pending Verification</Text>
              <Text style={styles.balanceValue}>{formatCurrency(earningsData.pendingBalance)}</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceValue}>{formatCurrency(earningsData.currentBalance)}</Text>
            </View>
          </View>

          <Text style={styles.withdrawNote}>
            • Minimum withdrawal: $10 • Processing: 3-5 business days
            • Secure SSL encryption • 24/7 support available
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    padding: 20,
  },
  lockedText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 20,
  },
  lockedSubtext: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  unlockManualButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  unlockManualButtonText: {
    color: theme.colors.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.background.primary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // TOTAL REVENUE CARD - Full width
  totalRevenueCard: {
    backgroundColor: theme.colors.primary.main,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: theme.colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  totalRevenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalRevenueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  totalRevenueAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  revenueStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  revenueStat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  revenueStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  revenueStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  userStatsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  userStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  userStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  userStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // EK KE NICHE EK CONTENT LIST
  contentListSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  contentListContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    overflow: 'hidden',
  },
  contentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  contentListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  contentListIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  contentListLockOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF9800',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentListInfo: {
    flex: 1,
  },
  contentListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  contentListTitleLocked: {
    color: theme.colors.text.tertiary,
  },
  contentListDescription: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  contentListRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contentListRequirements: {
    flexDirection: 'row',
    gap: 6,
  },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  requirementBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },

  // CONTENT MODAL STYLES
  contentModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  contentModalContent: {
    flex: 1,
  },
  contentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  contentModalCloseButton: {
    padding: 8,
  },
  contentModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  contentModalPlaceholder: {
    width: 40,
  },
  contentModalScroll: {
    flex: 1,
    padding: 16,
  },
  contentModalIconSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  contentModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  contentModalLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentModalStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  contentModalDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // CRITERIA SECTION
  criteriaSection: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  criteriaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  criteriaItem: {
    marginBottom: 20,
  },
  criteriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  criteriaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
    marginLeft: 8,
  },
  criteriaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.border.primary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCurrent: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  progressSeparator: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginHorizontal: 4,
  },
  progressRequired: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  remainingText: {
    fontSize: 11,
    color: '#FF9800',
    textAlign: 'center',
    marginTop: 4,
  },

  // ACTION BUTTON
  contentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  contentActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // POLICY SECTION
  policySection: {
    marginBottom: 16,
  },
  policyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 8,
  },
  policyButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },

  // REFRESH SECTION
  refreshSection: {
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    gap: 8,
  },
  refreshButtonText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  passwordInputContainer: {
    marginBottom: 24,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  unlockButton: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  setupButton: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    gap: 8,
  },
  biometricButtonText: {
    color: theme.colors.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },
  passwordNote: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },

  // BANK MODAL STYLES
  bankModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  bankModalContent: {
    flex: 1,
  },
  bankModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  bankModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankModalBackButton: {
    padding: 8,
  },
  bankModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  bankModalSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  bankModalPlaceholder: {
    width: 40,
  },
  bankModalScroll: {
    flex: 1,
  },
  bankFormContainer: {
    padding: 16,
  },
  
  // Bank Step Styles
  bankStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 8,
  },
  bankStepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border.primary,
  },
  bankStepActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  bankStepCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  bankStepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  bankStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 8,
  },
  bankStepTitleCompleted: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 8,
  },
  
  bankForm: {
    marginBottom: 24,
  },
  bankInputGroup: {
    marginBottom: 16,
  },
  bankInputGroupRow: {
    flexDirection: 'row',
    gap: 0,
  },
  bankInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  bankInput: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  bankSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  bankTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bankRadioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  bankRadioButton: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bankRadioButtonSelected: {
    borderColor: theme.colors.primary.main,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  bankRadioText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  bankRadioTextSelected: {
    color: theme.colors.primary.main,
  },
  bankStepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  bankPrevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    gap: 6,
  },
  bankPrevButtonText: {
    color: theme.colors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  bankNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  bankNextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bankNote: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
  },

  // BANK SECTION - Full width
  bankSection: {
    marginHorizontal: 16,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  withdrawSmallButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  withdrawSmallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bankCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  bankCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bankCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bankCardInfo: {
    flex: 1,
  },
  bankCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  bankCardBank: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  bankCardAccount: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  verifiedBadge: {
    backgroundColor: '#4CAF50',
  },
  pendingBadge: {
    backgroundColor: '#FF9800',
  },
  verificationBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  bankCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  bankDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bankDetailText: {
    fontSize: 12,
    color: theme.colors.text.primary,
  },
  editBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
    gap: 6,
  },
  editBankButtonText: {
    color: theme.colors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  noBankCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  noBankTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noBankText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary.main,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  addBankButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  balanceSummary: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.1)',
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.1)',
  },
  balanceLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  withdrawNote: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
