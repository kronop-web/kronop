const mongoose = require('mongoose');

let isConnecting = false;

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1 || isConnecting) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MongoDB URI not found in environment variables');
    console.error('🔍 Available env vars:', Object.keys(process.env).filter(key => key.includes('MONGO')));
    throw new Error('MONGODB_URI is not defined');
  }

  console.log('🔗 Connecting to MongoDB...');
  console.log('📍 MongoDB URI:', mongoUri.replace(/:([^:@]+)@/, ':***@')); // Hide password in logs

  isConnecting = true;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      family: 4,
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 100,
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 10,
      maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_TIME_MS) || 30000,
      waitQueueTimeoutMS: Number(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS) || 5000
    });
    
    console.log('✅ MongoDB connected successfully!');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  } finally {
    isConnecting = false;
  }
};

module.exports = {
  mongoose,
  connectToDatabase
};
