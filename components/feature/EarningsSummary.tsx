import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { API_BASE_URL } from '../../constants/network';

interface EarningsData {
  totalRevenue: number;
  currentBalance: number;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  thisMonth: number;
  lastMonth: number;
  currency: string;
}

interface EarningsSummaryProps {
  onPress?: () => void;
}

export default function EarningsSummary({ onPress }: EarningsSummaryProps) {
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalRevenue: 1250.50,
    currentBalance: 850.25,
    availableBalance: 650.00,
    pendingBalance: 200.25,
    totalEarned: 2500.75,
    thisMonth: 350.50,
    lastMonth: 400.25,
    currency: 'USD',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      
      // Load data from API
      const response = await fetch(`${API_BASE_URL}/earnings/data`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setEarningsData(result.data);
      } else {
      }
    } catch (error) {
      console.error('❌ [EARNINGS SUMMARY] Error loading data:', error);
      // Fallback to demo data if API fails
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: earningsData.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const monthlyGrowth = earningsData.lastMonth > 0 
    ? ((earningsData.thisMonth - earningsData.lastMonth) / earningsData.lastMonth) * 100 
    : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={theme.colors.primary.main} />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.redButton} onPress={onPress}>
      <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
      <Text style={styles.redButtonText}>Your Earnings</Text>
      <MaterialIcons name="chevron-right" size={20} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginTop: 8,
  },
  redButton: {
    backgroundColor: '#FF0000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0,
  },
  redButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  balanceSection: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceItemText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border.primary,
    marginHorizontal: 12,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  updateText: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
  },
});
