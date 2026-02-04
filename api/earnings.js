const express = require('express');
const router = express.Router();

// Get earnings data
router.get('/data', async (req, res) => {
  try {
    // Mock earnings data matching frontend expectations
    const earningsData = {
      totalRevenue: 1250.50,
      currentBalance: 850.25,
      availableBalance: 650.00,
      pendingBalance: 200.25,
      totalEarned: 2500.75,
      thisMonth: 350.50,
      lastMonth: 400.25,
      currency: 'USD',
      stats: {
        dailyAverage: 11.67,
        weeklyGrowth: 12.5,
        monthlyProjection: 1050.75
      }
    };
    
    res.json({ 
      success: true, 
      data: earningsData 
    });
  } catch (error) {
    console.error('Earnings data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user balance
router.get('/balance', async (req, res) => {
  try {
    const balanceData = {
      availableBalance: 650.00,
      currentBalance: 850.25,
      pendingBalance: 200.25,
      lastUpdated: new Date().toISOString()
    };
    
    res.json({ 
      success: true, 
      data: balanceData 
    });
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user points
router.get('/points', async (req, res) => {
  try {
    const pointsData = {
      totalPoints: 300,
      availablePoints: 300,
      redeemedPoints: 0,
      pointsHistory: [
        { type: 'earned', points: 50, description: 'Video upload', date: new Date('2024-01-14') },
        { type: 'earned', points: 25, description: 'Daily login', date: new Date('2024-01-13') }
      ]
    };
    
    res.json({ 
      success: true, 
      data: pointsData 
    });
  } catch (error) {
    console.error('Points error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get earnings history
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const history = [
      {
        id: 'earn_001',
        type: 'earning',
        amount: 45.50,
        description: 'Reel views revenue',
        date: new Date('2024-01-14'),
        status: 'completed'
      },
      {
        id: 'earn_002',
        type: 'earning', 
        amount: 32.75,
        description: 'Video views revenue',
        date: new Date('2024-01-13'),
        status: 'completed'
      },
      {
        id: 'withdraw_001',
        type: 'withdrawal',
        amount: -100.00,
        description: 'Bank transfer withdrawal',
        date: new Date('2024-01-12'),
        status: 'completed'
      }
    ];
    
    res.json({ 
      success: true, 
      data: history,
      pagination: {
        currentPage: parseInt(page),
        totalPages: 1,
        totalItems: history.length,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Earnings history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Withdraw earnings
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }
    
    if (amount > 650.00) { // Available balance
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Mock withdrawal processing
    const withdrawal = {
      id: 'withdraw_' + Date.now(),
      amount: amount,
      bankDetails: {
        accountNumber: '****' + bankDetails?.accountNumber?.slice(-4),
        bankName: bankDetails?.bankName || 'Bank'
      },
      status: 'processing',
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      createdAt: new Date()
    };
    
    res.json({ 
      success: true, 
      message: 'Withdrawal request submitted successfully',
      data: withdrawal 
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get earnings stats
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalEarnings: 2500.75,
      thisMonth: 350.50,
      lastMonth: 400.25,
      averageDaily: 11.67,
      growthRate: 12.5,
      topEarningContent: [
        { type: 'Reel', earnings: 145.50, count: 12 },
        { type: 'Video', earnings: 125.25, count: 8 },
        { type: 'Photo', earnings: 79.75, count: 15 }
      ]
    };
    
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    console.error('Earnings stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update bank details
router.put('/bank-details', async (req, res) => {
  try {
    const bankDetails = req.body;
    
    // Mock update
    const updatedDetails = {
      accountHolderName: bankDetails.accountHolderName,
      bankName: bankDetails.bankName,
      accountNumber: '****' + bankDetails.accountNumber?.slice(-4),
      isVerified: true,
      updatedAt: new Date()
    };
    
    res.json({ 
      success: true, 
      message: 'Bank details updated successfully',
      data: updatedDetails 
    });
  } catch (error) {
    console.error('Bank details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get bank details
router.get('/bank-details', async (req, res) => {
  try {
    const bankDetails = {
      accountHolderName: 'Demo User',
      bankName: 'State Bank of India',
      accountNumber: '****1234',
      isVerified: true,
      updatedAt: new Date('2024-01-15')
    };
    
    res.json({ 
      success: true, 
      data: bankDetails 
    });
  } catch (error) {
    console.error('Get bank details error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;



