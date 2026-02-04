import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Alert, Dimensions } from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId: string;
  isVerified: boolean;
}

export default function EarningsSection({ isFullPage = false }: { isFullPage?: boolean }) {
  const router = useRouter();
  const [earnMoneyModalVisible, setEarnMoneyModalVisible] = useState(false);
  const [bankDetailsModalVisible, setBankDetailsModalVisible] = useState(false);
  const earnMoneyScrollRef = useRef<ScrollView>(null);
  const bankDetailsScrollRef = useRef<ScrollView>(null);

  // Earnings Data (50k stars = $50)
  const [earningsData] = useState({
    story: { stars: 125000, earnings: 125.00, status: 'active' },
    photo: { stars: 89000, earnings: 89.00, status: 'active' },
    video: { stars: 342000, earnings: 342.00, status: 'active' },
    reel: { stars: 567000, earnings: 567.00, status: 'active' },
    live: { stars: 78000, earnings: 78.00, status: 'pending' },
    totalStars: 1201000,
    totalEarnings: 1201.00
  });

  // Bank details state
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    upiId: '',
    isVerified: false
  });

  // Reset scroll position when modal opens
  useEffect(() => {
    if (earnMoneyModalVisible && earnMoneyScrollRef.current) {
      setTimeout(() => {
        earnMoneyScrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    }
  }, [earnMoneyModalVisible]);

  useEffect(() => {
    if (bankDetailsModalVisible && bankDetailsScrollRef.current) {
      setTimeout(() => {
        bankDetailsScrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    }
  }, [bankDetailsModalVisible]);

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-IN');
  };

  // Handle bank details save
  const handleSaveBankDetails = () => {
    if (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName) {
      Alert.alert('Missing Information', 'Please fill all required fields.');
      return;
    }

    Alert.alert(
      'Confirm Bank Details',
      `Account Holder: ${bankDetails.accountName}\nAccount Number: ${bankDetails.accountNumber}\nIFSC: ${bankDetails.ifscCode}\nBank: ${bankDetails.bankName}\n\nIs this information correct?`,
      [
        { text: 'Edit', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            setBankDetails(prev => ({...prev, isVerified: false}));
            setBankDetailsModalVisible(false);
            Alert.alert(
              'Bank Details Saved',
              'Your bank details have been saved. Please verify your account to start withdrawing earnings.',
              [
                { text: 'Later' },
                { 
                  text: 'Verify Now', 
                  onPress: () => {
                    Alert.alert(
                      'Verification Process',
                      'We will send a small verification amount to your account. Please confirm the exact amount within 24 hours.',
                      [
                        { text: 'Cancel', style: 'destructive' },
                        { 
                          text: 'Start Verification', 
                          onPress: () => {
                            setTimeout(() => {
                              setBankDetails(prev => ({...prev, isVerified: true}));
                              Alert.alert('Verification Complete', 'Your bank account has been verified successfully! You can now withdraw your earnings.');
                            }, 2000);
                          }
                        }
                      ]
                    );
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  // Handle withdrawal
  const handleWithdraw = () => {
    if (!bankDetails.isVerified || !bankDetails.accountNumber) {
      Alert.alert('Bank Details Required', 'Please add and verify your bank details first to withdraw earnings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Bank Details', onPress: () => setBankDetailsModalVisible(true) }
      ]);
    } else if (earningsData.totalEarnings < 10) {
      Alert.alert('Minimum Withdrawal', `Minimum withdrawal amount is $10. You have $${earningsData.totalEarnings.toFixed(2)}.`);
    } else {
      Alert.alert(
        'Withdrawal Request',
        `Withdrawal request for $${earningsData.totalEarnings.toFixed(2)} has been submitted.\n\nAmount will be transferred within 3-5 business days to:\n${bankDetails.bankName} ••••${bankDetails.accountNumber.slice(-4)}`,
        [{ text: 'OK' }]
      );
    }
  };

  if (isFullPage) {
    return (
      <>
        <ScrollView 
          ref={earnMoneyScrollRef}
          style={styles.earningsScrollView}
          contentContainerStyle={styles.earningsScrollContainer}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIcon}>
              <MaterialIcons name="account-balance-wallet" size={40} color="#4CAF50" />
            </View>
            <Text style={styles.welcomeTitle}>Earnings Dashboard</Text>
            <Text style={styles.welcomeSubtitle}>
              Earn $50 for every 50,000 Stars received on your content
            </Text>
          </View>

          {/* Total Earnings Card */}
          <View style={styles.totalEarningsCard}>
            <View style={styles.earningsHeader}>
              <Text style={styles.earningsTitle}>Total Available Balance</Text>
              <View style={styles.statusBadge}>
                <MaterialIcons name="verified" size={14} color="#4CAF50" />
                <Text style={styles.statusText}>Ready to Withdraw</Text>
              </View>
            </View>
            <Text style={styles.earningsAmount}>${earningsData.totalEarnings.toFixed(2)}</Text>
            <Text style={styles.earningsSubtext}>From {formatNumber(earningsData.totalStars)} Stars</Text>
            
            <View style={styles.earningsStats}>
              <View style={styles.statItem}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={styles.statText}>$50 per 50K Stars</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="calendar-today" size={16} color="#45B7D1" />
                <Text style={styles.statText}>Payout: 15th monthly</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.withdrawButton}
              onPress={handleWithdraw}
            >
              <MaterialIcons name="account-balance-wallet" size={20} color="#fff" />
              <Text style={styles.withdrawButtonText}>Withdraw ${earningsData.totalEarnings.toFixed(2)}</Text>
            </TouchableOpacity>

            <View style={styles.rateInfo}>
              <MaterialIcons name="info" size={14} color="#FFD700" />
              <Text style={styles.rateInfoText}>Earning Rate: $1 per 1,000 Stars</Text>
            </View>
          </View>

          {/* Earnings Breakdown */}
          <Text style={styles.sectionTitle}>EARNINGS BY CONTENT TYPE</Text>
          <Text style={styles.sectionSubtitle}>Your earnings from different content types</Text>

          {/* Story Earnings */}
          <View style={styles.featureCard}>
            <View style={styles.featureLeft}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#FF6B6B15' }]}>
                <MaterialIcons name="auto-stories" size={28} color="#FF6B6B" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>Story Earnings</Text>
                <View style={styles.featureStats}>
                  <View style={styles.earningsCountRow}>
                    <MaterialIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.earningsCount}>{formatNumber(earningsData.story.stars)}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.earningAmount}>${earningsData.story.earnings.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.featureRight}>
              <View style={[styles.statusBadge, { backgroundColor: earningsData.story.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                <Text style={[styles.statusText, { color: earningsData.story.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                  {earningsData.story.status === 'active' ? 'ACTIVE' : 'PENDING'}
                </Text>
              </View>
            </View>
          </View>

          {/* Photo Earnings */}
          <View style={styles.featureCard}>
            <View style={styles.featureLeft}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#4ECDC415' }]}>
                <MaterialIcons name="photo-library" size={28} color="#4ECDC4" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>Photo Earnings</Text>
                <View style={styles.featureStats}>
                  <View style={styles.earningsCountRow}>
                    <MaterialIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.earningsCount}>{formatNumber(earningsData.photo.stars)}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.earningAmount}>${earningsData.photo.earnings.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.featureRight}>
              <View style={[styles.statusBadge, { backgroundColor: earningsData.photo.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                <Text style={[styles.statusText, { color: earningsData.photo.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                  {earningsData.photo.status === 'active' ? 'ACTIVE' : 'PENDING'}
                </Text>
              </View>
            </View>
          </View>

          {/* Video Earnings */}
          <View style={styles.featureCard}>
            <View style={styles.featureLeft}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#45B7D115' }]}>
                <Ionicons name="videocam" size={28} color="#45B7D1" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>Video Earnings</Text>
                <View style={styles.featureStats}>
                  <View style={styles.earningsCountRow}>
                    <MaterialIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.earningsCount}>{formatNumber(earningsData.video.stars)}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.earningAmount}>${earningsData.video.earnings.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.featureRight}>
              <View style={[styles.statusBadge, { backgroundColor: earningsData.video.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                <Text style={[styles.statusText, { color: earningsData.video.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                  {earningsData.video.status === 'active' ? 'ACTIVE' : 'PENDING'}
                </Text>
              </View>
            </View>
          </View>

          {/* Reel Earnings */}
          <View style={styles.featureCard}>
            <View style={styles.featureLeft}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#96CEB415' }]}>
                <FontAwesome name="play-circle" size={28} color="#96CEB4" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>Reel Earnings</Text>
                <View style={styles.featureStats}>
                  <View style={styles.earningsCountRow}>
                    <MaterialIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.earningsCount}>{formatNumber(earningsData.reel.stars)}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.earningAmount}>${earningsData.reel.earnings.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.featureRight}>
              <View style={[styles.statusBadge, { backgroundColor: earningsData.reel.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                <Text style={[styles.statusText, { color: earningsData.reel.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                  {earningsData.reel.status === 'active' ? 'ACTIVE' : 'PENDING'}
                </Text>
              </View>
            </View>
          </View>

          {/* Live Earnings */}
          <View style={styles.featureCard}>
            <View style={styles.featureLeft}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#FFD93D15' }]}>
                <MaterialIcons name="live-tv" size={28} color="#FFD93D" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>Live Earnings</Text>
                <View style={styles.featureStats}>
                  <View style={styles.earningsCountRow}>
                    <MaterialIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.earningsCount}>{formatNumber(earningsData.live.stars)}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.earningAmount}>${earningsData.live.earnings.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.featureRight}>
              <View style={[styles.statusBadge, { backgroundColor: earningsData.live.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                <Text style={[styles.statusText, { color: earningsData.live.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                  {earningsData.live.status === 'active' ? 'ACTIVE' : 'PENDING'}
                </Text>
              </View>
            </View>
          </View>

          {/* Bank Details Section */}
          <TouchableOpacity 
            style={styles.bankCard}
            onPress={() => setBankDetailsModalVisible(true)}
          >
            <View style={styles.bankIcon}>
              <MaterialIcons name="account-balance" size={32} color="#2196F3" />
            </View>
            <View style={styles.bankInfo}>
              <Text style={styles.bankTitle}>Bank Account</Text>
              <Text style={styles.bankSubtitle}>
                {bankDetails.accountName ? 
                  `${bankDetails.accountName} • ${bankDetails.bankName}` : 
                  'Add your bank details to withdraw earnings'
                }
              </Text>
              <View style={styles.bankStatus}>
                {bankDetails.isVerified ? (
                  <>
                    <MaterialIcons name="verified" size={16} color="#4CAF50" />
                    <Text style={[styles.bankStatusText, { color: '#4CAF50' }]}>Verified</Text>
                  </>
                ) : bankDetails.accountName ? (
                  <>
                    <MaterialIcons name="warning" size={16} color="#FF9800" />
                    <Text style={[styles.bankStatusText, { color: '#FF9800' }]}>Needs Verification</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="add-circle" size={16} color="#2196F3" />
                    <Text style={[styles.bankStatusText, { color: '#2196F3' }]}>Add Details</Text>
                  </>
                )}
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Earnings history will be available soon')}>
              <MaterialIcons name="history" size={24} color="#666" />
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Payment invoices will be available soon')}>
              <MaterialIcons name="receipt" size={24} color="#666" />
              <Text style={styles.actionText}>Invoices</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/help-center')}>
              <MaterialIcons name="help-outline" size={24} color="#666" />
              <Text style={styles.actionText}>Help</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Share', 'Share your earnings dashboard')}>
              <MaterialIcons name="share" size={24} color="#666" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={20} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How Earnings Work</Text>
              <Text style={styles.infoText}>
                • 1 Star = $0.001 (1,000 Stars = $1){' \n'}
                • 50,000 Stars = $50{' \n'}
                • Minimum withdrawal: $10{' \n'}
                • Processing time: 3-5 business days{' \n'}
                • Bank account verification required{' \n'}
                • Stars are non-refundable
              </Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bank Details Modal */}
        <Modal visible={bankDetailsModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Bank Details</Text>
              <TouchableOpacity onPress={() => setBankDetailsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              ref={bankDetailsScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.bankFormContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              alwaysBounceVertical={true}
            >
              <View style={styles.bankFormGroup}>
                <Text style={styles.bankFormLabel}>Account Holder Name *</Text>
                <TextInput
                  style={styles.bankFormInput}
                  value={bankDetails.accountName}
                  onChangeText={(text) => setBankDetails(prev => ({...prev, accountName: text}))}
                  placeholder="Enter account holder name"
                  placeholderTextColor="#666"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.bankFormGroup}>
                <Text style={styles.bankFormLabel}>Account Number *</Text>
                <TextInput
                  style={styles.bankFormInput}
                  value={bankDetails.accountNumber}
                  onChangeText={(text) => setBankDetails(prev => ({...prev, accountNumber: text}))}
                  placeholder="Enter account number"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={20}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.bankFormGroup}>
                <Text style={styles.bankFormLabel}>IFSC Code *</Text>
                <TextInput
                  style={styles.bankFormInput}
                  value={bankDetails.ifscCode}
                  onChangeText={(text) => setBankDetails(prev => ({...prev, ifscCode: text.toUpperCase()}))}
                  placeholder="Enter IFSC code"
                  placeholderTextColor="#666"
                  autoCapitalize="characters"
                  maxLength={11}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.bankFormGroup}>
                <Text style={styles.bankFormLabel}>Bank Name *</Text>
                <TextInput
                  style={styles.bankFormInput}
                  value={bankDetails.bankName}
                  onChangeText={(text) => setBankDetails(prev => ({...prev, bankName: text}))}
                  placeholder="Enter bank name"
                  placeholderTextColor="#666"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.bankFormGroup}>
                <Text style={styles.bankFormLabel}>UPI ID (Optional)</Text>
                <TextInput
                  style={styles.bankFormInput}
                  value={bankDetails.upiId}
                  onChangeText={(text) => setBankDetails(prev => ({...prev, upiId: text}))}
                  placeholder="Enter UPI ID"
                  placeholderTextColor="#666"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.bankFormNote}>
                <MaterialIcons name="info" size={20} color="#2196F3" />
                <Text style={styles.bankFormNoteText}>
                  Your bank details are encrypted and stored securely. Verification is required before withdrawals.
                </Text>
              </View>

              <View style={styles.bankFormActions}>
                <TouchableOpacity 
                  style={styles.cancelBankButton}
                  onPress={() => setBankDetailsModalVisible(false)}
                >
                  <Text style={styles.cancelBankButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveBankButton}
                  onPress={handleSaveBankDetails}
                >
                  <Text style={styles.saveBankButtonText}>Save & Verify</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <>
      {/* EARNINGS DASHBOARD BUTTON */}
      <TouchableOpacity
        style={styles.earnMoneyButton}
        onPress={() => setEarnMoneyModalVisible(true)}
      >
        <View style={styles.earnMoneyIcon}>
          <Ionicons name="logo-usd" size={24} color={theme.colors.warning} />
        </View>
        <View style={styles.earnMoneyContent}>
          <Text style={styles.earnMoneyTitle}>Earnings Dashboard</Text>
          <Text style={styles.earnMoneySubtitle}>Earn $50 for every 50K Stars received</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
      </TouchableOpacity>

      {/* Bank Details Modal */}
      <Modal visible={bankDetailsModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Bank Details</Text>
            <TouchableOpacity onPress={() => setBankDetailsModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={bankDetailsScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.bankFormContainer}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            alwaysBounceVertical={true}
          >
            <View style={styles.bankFormGroup}>
              <Text style={styles.bankFormLabel}>Account Holder Name *</Text>
              <TextInput
                style={styles.bankFormInput}
                value={bankDetails.accountName}
                onChangeText={(text) => setBankDetails(prev => ({...prev, accountName: text}))}
                placeholder="Enter account holder name"
                placeholderTextColor="#666"
                returnKeyType="next"
              />
            </View>

            <View style={styles.bankFormGroup}>
              <Text style={styles.bankFormLabel}>Account Number *</Text>
              <TextInput
                style={styles.bankFormInput}
                value={bankDetails.accountNumber}
                onChangeText={(text) => setBankDetails(prev => ({...prev, accountNumber: text}))}
                placeholder="Enter account number"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                maxLength={20}
                returnKeyType="next"
              />
            </View>

            <View style={styles.bankFormGroup}>
              <Text style={styles.bankFormLabel}>IFSC Code *</Text>
              <TextInput
                style={styles.bankFormInput}
                value={bankDetails.ifscCode}
                onChangeText={(text) => setBankDetails(prev => ({...prev, ifscCode: text.toUpperCase()}))}
                placeholder="Enter IFSC code"
                placeholderTextColor="#666"
                autoCapitalize="characters"
                maxLength={11}
                returnKeyType="next"
              />
            </View>

            <View style={styles.bankFormGroup}>
              <Text style={styles.bankFormLabel}>Bank Name *</Text>
              <TextInput
                style={styles.bankFormInput}
                value={bankDetails.bankName}
                onChangeText={(text) => setBankDetails(prev => ({...prev, bankName: text}))}
                placeholder="Enter bank name"
                placeholderTextColor="#666"
                returnKeyType="next"
              />
            </View>

            <View style={styles.bankFormGroup}>
              <Text style={styles.bankFormLabel}>UPI ID (Optional)</Text>
              <TextInput
                style={styles.bankFormInput}
                value={bankDetails.upiId}
                onChangeText={(text) => setBankDetails(prev => ({...prev, upiId: text}))}
                placeholder="Enter UPI ID"
                placeholderTextColor="#666"
                returnKeyType="done"
              />
            </View>

            <View style={styles.bankFormNote}>
              <MaterialIcons name="info" size={20} color="#2196F3" />
              <Text style={styles.bankFormNoteText}>
                Your bank details are encrypted and stored securely. Verification is required before withdrawals.
              </Text>
            </View>

            <View style={styles.bankFormActions}>
              <TouchableOpacity 
                style={styles.cancelBankButton}
                onPress={() => setBankDetailsModalVisible(false)}
              >
                <Text style={styles.cancelBankButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveBankButton}
                onPress={handleSaveBankDetails}
              >
                <Text style={styles.saveBankButtonText}>Save & Verify</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Earnings Dashboard Modal */}
      <Modal visible={earnMoneyModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Earnings Dashboard</Text>
            <TouchableOpacity onPress={() => setEarnMoneyModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={earnMoneyScrollRef}
            style={styles.earningsScrollView}
            contentContainerStyle={styles.earningsScrollContainer}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* Welcome Section */}
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIcon}>
                <MaterialIcons name="account-balance-wallet" size={40} color="#4CAF50" />
              </View>
              <Text style={styles.welcomeTitle}>Earnings Dashboard</Text>
              <Text style={styles.welcomeSubtitle}>
                Earn $50 for every 50,000 Stars received on your content
              </Text>
            </View>

            {/* Total Earnings Card */}
            <View style={styles.totalEarningsCard}>
              <View style={styles.earningsHeader}>
                <Text style={styles.earningsTitle}>Total Available Balance</Text>
                <View style={styles.statusBadge}>
                  <MaterialIcons name="verified" size={14} color="#4CAF50" />
                  <Text style={styles.statusText}>Ready to Withdraw</Text>
                </View>
              </View>
              <Text style={styles.earningsAmount}>${earningsData.totalEarnings.toFixed(2)}</Text>
              <Text style={styles.earningsSubtext}>From {formatNumber(earningsData.totalStars)} Stars</Text>
              
              <View style={styles.earningsStats}>
                <View style={styles.statItem}>
                  <MaterialIcons name="star" size={16} color="#FFD700" />
                  <Text style={styles.statText}>$50 per 50K Stars</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="calendar-today" size={16} color="#45B7D1" />
                  <Text style={styles.statText}>Payout: 15th monthly</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.withdrawButton}
                onPress={handleWithdraw}
              >
                <MaterialIcons name="account-balance-wallet" size={20} color="#fff" />
                <Text style={styles.withdrawButtonText}>Withdraw ${earningsData.totalEarnings.toFixed(2)}</Text>
              </TouchableOpacity>

              <View style={styles.rateInfo}>
                <MaterialIcons name="info" size={14} color="#FFD700" />
                <Text style={styles.rateInfoText}>Earning Rate: $1 per 1,000 Stars</Text>
              </View>
            </View>

            {/* Earnings Breakdown */}
            <Text style={styles.sectionTitle}>EARNINGS BY CONTENT TYPE</Text>
            <Text style={styles.sectionSubtitle}>Your earnings from different content types</Text>

            {/* Story Earnings */}
            <View style={styles.featureCard}>
              <View style={styles.featureLeft}>
                <View style={[styles.featureIconContainer, { backgroundColor: '#FF6B6B15' }]}>
                  <MaterialIcons name="auto-stories" size={28} color="#FF6B6B" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>Story Earnings</Text>
                  <View style={styles.featureStats}>
                    <View style={styles.earningsCountRow}>
                      <MaterialIcons name="star" size={14} color="#FFD700" />
                      <Text style={styles.earningsCount}>{formatNumber(earningsData.story.stars)}</Text>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.earningAmount}>${earningsData.story.earnings.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.featureRight}>
                <View style={[styles.statusBadge, { backgroundColor: earningsData.story.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                  <Text style={[styles.statusText, { color: earningsData.story.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                    {earningsData.story.status === 'active' ? 'ACTIVE' : 'PENDING'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Photo Earnings */}
            <View style={styles.featureCard}>
              <View style={styles.featureLeft}>
                <View style={[styles.featureIconContainer, { backgroundColor: '#4ECDC415' }]}>
                  <MaterialIcons name="photo-library" size={28} color="#4ECDC4" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>Photo Earnings</Text>
                  <View style={styles.featureStats}>
                    <View style={styles.earningsCountRow}>
                      <MaterialIcons name="star" size={14} color="#FFD700" />
                      <Text style={styles.earningsCount}>{formatNumber(earningsData.photo.stars)}</Text>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.earningAmount}>${earningsData.photo.earnings.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.featureRight}>
                <View style={[styles.statusBadge, { backgroundColor: earningsData.photo.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                  <Text style={[styles.statusText, { color: earningsData.photo.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                    {earningsData.photo.status === 'active' ? 'ACTIVE' : 'PENDING'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Video Earnings */}
            <View style={styles.featureCard}>
              <View style={styles.featureLeft}>
                <View style={[styles.featureIconContainer, { backgroundColor: '#45B7D115' }]}>
                  <Ionicons name="videocam" size={28} color="#45B7D1" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>Video Earnings</Text>
                  <View style={styles.featureStats}>
                    <View style={styles.earningsCountRow}>
                      <MaterialIcons name="star" size={14} color="#FFD700" />
                      <Text style={styles.earningsCount}>{formatNumber(earningsData.video.stars)}</Text>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.earningAmount}>${earningsData.video.earnings.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.featureRight}>
                <View style={[styles.statusBadge, { backgroundColor: earningsData.video.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                  <Text style={[styles.statusText, { color: earningsData.video.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                    {earningsData.video.status === 'active' ? 'ACTIVE' : 'PENDING'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Reel Earnings */}
            <View style={styles.featureCard}>
              <View style={styles.featureLeft}>
                <View style={[styles.featureIconContainer, { backgroundColor: '#96CEB415' }]}>
                  <FontAwesome name="play-circle" size={28} color="#96CEB4" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>Reel Earnings</Text>
                  <View style={styles.featureStats}>
                    <View style={styles.earningsCountRow}>
                      <MaterialIcons name="star" size={14} color="#FFD700" />
                      <Text style={styles.earningsCount}>{formatNumber(earningsData.reel.stars)}</Text>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.earningAmount}>${earningsData.reel.earnings.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.featureRight}>
                <View style={[styles.statusBadge, { backgroundColor: earningsData.reel.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                  <Text style={[styles.statusText, { color: earningsData.reel.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                    {earningsData.reel.status === 'active' ? 'ACTIVE' : 'PENDING'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Live Earnings */}
            <View style={styles.featureCard}>
              <View style={styles.featureLeft}>
                <View style={[styles.featureIconContainer, { backgroundColor: '#FFD93D15' }]}>
                  <MaterialIcons name="live-tv" size={28} color="#FFD93D" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>Live Earnings</Text>
                  <View style={styles.featureStats}>
                    <View style={styles.earningsCountRow}>
                      <MaterialIcons name="star" size={14} color="#FFD700" />
                      <Text style={styles.earningsCount}>{formatNumber(earningsData.live.stars)}</Text>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.earningAmount}>${earningsData.live.earnings.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.featureRight}>
                <View style={[styles.statusBadge, { backgroundColor: earningsData.live.status === 'active' ? '#4CAF5020' : '#FF980020' }]}>
                  <Text style={[styles.statusText, { color: earningsData.live.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                    {earningsData.live.status === 'active' ? 'ACTIVE' : 'PENDING'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bank Details Section */}
            <TouchableOpacity 
              style={styles.bankCard}
              onPress={() => setBankDetailsModalVisible(true)}
            >
              <View style={styles.bankIcon}>
                <MaterialIcons name="account-balance" size={32} color="#2196F3" />
              </View>
              <View style={styles.bankInfo}>
                <Text style={styles.bankTitle}>Bank Account</Text>
                <Text style={styles.bankSubtitle}>
                  {bankDetails.accountName ? 
                    `${bankDetails.accountName} • ${bankDetails.bankName}` : 
                    'Add your bank details to withdraw earnings'
                  }
                </Text>
                <View style={styles.bankStatus}>
                  {bankDetails.isVerified ? (
                    <>
                      <MaterialIcons name="verified" size={16} color="#4CAF50" />
                      <Text style={[styles.bankStatusText, { color: '#4CAF50' }]}>Verified</Text>
                    </>
                  ) : bankDetails.accountName ? (
                    <>
                      <MaterialIcons name="warning" size={16} color="#FF9800" />
                      <Text style={[styles.bankStatusText, { color: '#FF9800' }]}>Needs Verification</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="add-circle" size={16} color="#2196F3" />
                      <Text style={[styles.bankStatusText, { color: '#2196F3' }]}>Add Details</Text>
                    </>
                  )}
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Earnings history will be available soon')}>
                <MaterialIcons name="history" size={24} color="#666" />
                <Text style={styles.actionText}>History</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Payment invoices will be available soon')}>
                <MaterialIcons name="receipt" size={24} color="#666" />
                <Text style={styles.actionText}>Invoices</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/help-center')}>
                <MaterialIcons name="help-outline" size={24} color="#666" />
                <Text style={styles.actionText}>Help</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Share', 'Share your earnings dashboard')}>
                <MaterialIcons name="share" size={24} color="#666" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.infoCard}>
              <MaterialIcons name="info" size={20} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>How Earnings Work</Text>
                <Text style={styles.infoText}>
                  • 1 Star = $0.001 (1,000 Stars = $1){'\n'}
                  • 50,000 Stars = $50{'\n'}
                  • Minimum withdrawal: $10{'\n'}
                  • Processing time: 3-5 business days{'\n'}
                  • Bank account verification required{'\n'}
                  • Stars are non-refundable
                </Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  earnMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 2,
    borderColor: '#FFD700',
    marginTop: 12,
  },
  earnMoneyIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnMoneyContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  earnMoneyTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  earnMoneySubtitle: {
    color: theme.colors.text.secondary,
    fontSize: 13,
  },
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
  earningsScrollView: {
    flex: 1,
  },
  earningsScrollContainer: {
    paddingBottom: 120,
  },
  welcomeCard: {
    margin: 16,
    padding: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  totalEarningsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsTitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  earningsAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  earningsSubtext: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 16,
  },
  earningsStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  rateInfoText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    marginHorizontal: 16,
    marginBottom: 4,
    letterSpacing: 0.5,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  featureStats: {
    marginTop: 4,
  },
  earningsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earningsCount: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  separator: {
    fontSize: 14,
    color: '#666',
  },
  earningAmount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '700',
  },
  featureRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  bankIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bankInfo: {
    flex: 1,
  },
  bankTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  bankSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  bankStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bankStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.2)',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  bankFormContainer: {
    padding: 16,
    paddingBottom: 200,
    flexGrow: 1,
  },
  bankFormGroup: {
    marginBottom: 20,
  },
  bankFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  bankFormInput: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text.primary,
    minHeight: 50,
  },
  bankFormNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 30,
    gap: 12,
  },
  bankFormNoteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  bankFormActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 50,
  },
  cancelBankButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  saveBankButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  cancelBankButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveBankButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
