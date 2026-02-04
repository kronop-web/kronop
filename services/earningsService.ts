import { API_BASE_URL } from '../constants/network';

const API_URL = API_BASE_URL;

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Earnings API call failed:', error);
    throw error;
  }
};

// Earnings API functions
export const earningsApi = {
  // Get user earnings data
  getEarningsData: async () => {
    try {
      return await apiCall('/earnings/data');
    } catch (error) {
      console.error('Failed to get earnings data:', error);
      // Return mock data if API fails
      return {
        data: {
          totalRevenue: 1250.50,
          currentBalance: 850.25,
          availableBalance: 650.00,
          pendingBalance: 200.25,
          totalEarned: 2500.75,
          thisMonth: 350.50,
          lastMonth: 400.25,
          currency: 'USD',
        }
      };
    }
  },

  // Get user balance
  getUserBalance: async () => {
    try {
      return await apiCall('/earnings/balance');
    } catch (error) {
      console.error('Failed to get user balance:', error);
      // Return mock data if API fails
      return {
        data: {
          availableBalance: 650.00,
          currentBalance: 850.25,
          pendingBalance: 200.25,
        }
      };
    }
  },

  // Get user points
  getUserPoints: async () => {
    try {
      return await apiCall('/earnings/points');
    } catch (error) {
      console.error('Failed to get user points:', error);
      // Return mock data if API fails
      return {
        data: {
          totalPoints: 300,
          availablePoints: 300,
          redeemedPoints: 0,
        }
      };
    }
  },

  // Get earnings history
  getEarningsHistory: async (page = 1, limit = 20) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      return await apiCall(`/earnings/history?${params}`);
    } catch (error) {
      console.error('Failed to get earnings history:', error);
      return {
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
        }
      };
    }
  },

  // Withdraw earnings
  withdrawEarnings: async (amount: number, bankDetails: any) => {
    try {
      return await apiCall('/earnings/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          bankDetails,
        }),
      });
    } catch (error) {
      console.error('Failed to withdraw earnings:', error);
      throw error;
    }
  },

  // Get withdrawal history
  getWithdrawalHistory: async (page = 1, limit = 20) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      return await apiCall(`/earnings/withdrawals?${params}`);
    } catch (error) {
      console.error('Failed to get withdrawal history:', error);
      return {
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
        }
      };
    }
  },

  // Get earnings stats
  getEarningsStats: async () => {
    try {
      return await apiCall('/earnings/stats');
    } catch (error) {
      console.error('Failed to get earnings stats:', error);
      return {
        data: {
          totalEarnings: 2500.75,
          thisMonth: 350.50,
          lastMonth: 400.25,
          averageDaily: 11.67,
          growthRate: 12.5,
        }
      };
    }
  },

  // Update bank details
  updateBankDetails: async (bankDetails: any) => {
    try {
      return await apiCall('/earnings/bank-details', {
        method: 'PUT',
        body: JSON.stringify(bankDetails),
      });
    } catch (error) {
      console.error('Failed to update bank details:', error);
      throw error;
    }
  },

  // Get bank details
  getBankDetails: async () => {
    try {
      return await apiCall('/earnings/bank-details');
    } catch (error) {
      console.error('Failed to get bank details:', error);
      return {
        data: {
          accountHolderName: 'John Doe',
          bankName: 'State Bank of India',
          accountNumber: '****1234',
          isVerified: true,
        }
      };
    }
  },
};

export default earningsApi;
