const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  totalEarning: { type: Number, default: 0 },
  transactionHistory: [{
    amount: Number,
    type: { type: String, enum: ['credit', 'debit'] },
    description: String,
    timestamp: { type: Date, default: Date.now }
  }],
  dailyIncome: { type: Number, default: 0 },
  monthlyIncome: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Earning', earningSchema, 'Earnings');
