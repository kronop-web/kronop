const mongoose = require('mongoose');

let isConnecting = false;

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1 || isConnecting) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined');
  }

  isConnecting = true;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 100,
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 10,
      maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_TIME_MS) || 30000,
      waitQueueTimeoutMS: Number(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS) || 5000
    });
    return mongoose.connection;
  } finally {
    isConnecting = false;
  }
};

module.exports = {
  mongoose,
  connectToDatabase
};
