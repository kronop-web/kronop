// ==================== CORE IMPORTS ====================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { mongoose, connectToDatabase } = require('./config/db');
const cors = require('cors');
const axios = require('axios');
const os = require('os');

// ==================== MODELS ====================
const User = require('./models/User');
const Content = require('./models/Content');

// ==================== SERVICES ====================
const BunnyContentService = require('./services/bunnyContentService');
const BunnySyncService = require('./services/bunnySyncService');
const DatabaseService = require('./services/databaseService');
const autoSyncIntegration = require('./services/autoSyncIntegration');
const AutoSyncService = require('./services/autoSyncService');
const RealtimeService = require('./services/realtimeService');
const RedisCacheService = require('./services/redisCacheService');
const UserInterestTrackingService = require('./services/userInterestTrackingService');
const SignedUrlService = require('./services/signedUrlService');

// ==================== ROUTES ====================
const contentRoutes = require('./api/content');
const userRoutes = require('./api/users');
const earningsRoutes = require('./api/earnings');
const authRoutes = require('./api/auth');
const notificationRoutes = require('./api/notifications');
const autosyncRoutes = require('./api/autosync');
 
const viralRoutes = require('./api/viral');

// New Routes as requested
const userRouteNew = require('./routes/user');
const contentRouteNew = require('./routes/content');

// ==================== APP INITIALIZATION ====================
const app = express();
const PORT = process.env.PORT || (process.env.NODE_ENV === 'development' ? 3000 : 8000); // DYNAMIC: 3000 for local, 8000 for production
const HOST = '0.0.0.0'; // Universal host - works on all networks and mobile devices
const apiRouter = express.Router();

// ==================== ERROR HANDLING ====================
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// ==================== MIDDLEWARE ====================
app.set('trust proxy', true);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Enhanced request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`📡 ${timestamp} - ${req.method} ${req.originalUrl}`);
  console.log(`🌐 Client IP: ${clientIP}`);
  console.log(`📱 User-Agent: ${userAgent}`);
  console.log(`🔗 Headers:`, JSON.stringify(req.headers, null, 2));
  
  // Log request body for POST/PUT requests
  if (req.method === 'POST' || req.method === 'PUT') {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log(`📤 Request: Multipart form data (size: ${req.headers['content-length'] || 'unknown'} bytes)`);
    } else if (req.body && Object.keys(req.body).length > 0) {
      console.log(`📤 Request Body:`, JSON.stringify(req.body, null, 2));
    }
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📥 Response Status: ${res.statusCode}`);
    if (res.statusCode >= 400) {
      console.log(`❌ Error Response:`, data);
    } else {
      console.log(`✅ Success Response: ${data?.length || 0} bytes`);
    }
    originalSend.call(this, data);
  };
  
  next();
});

app.use(cors({
  origin: '*', // Universal CORS - allow all origins for mobile compatibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Forwarded-For', 'X-Real-IP', 'Origin', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight for 24 hours
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== UTILITIES ====================
const getLocalIPv4 = () => {
  // Return universal host for mobile compatibility
  return '0.0.0.0';
};

const MONGO_URI = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI;

if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables.');
  console.error('Please set MONGODB_URI to your MongoDB connection string (e.g., MongoDB Atlas).');
  console.error('Server will continue running but database features will be disabled.');
}

const ROOT_DIR = path.resolve(process.cwd());
const UPLOADS_DIR = path.resolve(ROOT_DIR, 'uploads');
const HLS_DIR = path.resolve(ROOT_DIR, 'hls');

// Ensure directories exist
[UPLOADS_DIR, HLS_DIR].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.warn(`Warning: Could not create directory ${dir}:`, error.message);
  }
});

// CORS configuration (moved to top)

if (MONGO_URI) {

  mongoose.connection.once('connected', async () => {
    try {
      await BunnyContentService.syncAllContent();
      await DatabaseService.deactivateExpiredStories();

      await User.syncIndexes();
      AutoSyncService.start();

      BunnySyncService.scheduleCleanupOnly();
    } catch (err) {
      console.error('❌ Database service initialization failed:', err.message);
    }
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {});
  mongoose.connection.on('connected', () => {});

  if (MONGO_URI) {
    MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }

  connectToDatabase().catch(err => {
    console.error('❌ Koyeb MongoDB CONNECTION FAILED:');
    console.error('🔍 Error Name:', err.name);
    console.error('📝 Error Message:', err.message);
    console.error('🔢 Error Code:', err.code);
    console.error('🌍 Deployment Platform: Koyeb');
    console.error('🔧 Environment Variables Check:');
    
    // Check if MongoDB URI is set in Koyeb environment
    const mongoUri = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in Koyeb Environment Variables');
      console.error('🔧 Solution: Go to Koyeb Dashboard → Service → Environment Variables');
      console.error('📝 Add: MONGODB_URI=mongodb://...');
    } else {
      console.error('✅ MONGODB_URI found in environment');
      console.error('📍 URI Length:', mongoUri.length, 'characters');
      console.error('🔍 URI Format Check:', mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://') ? '✅ Valid' : '❌ Invalid');
    }

    if (err.name === 'MongoServerSelectionError') {
      console.error('🌐 Koyeb Network Error - MongoDB Atlas Connection:');
      console.error('   • MongoDB Atlas IP whitelist missing Koyeb IP');
      console.error('   • Network connectivity issues between Koyeb and MongoDB');
      console.error('   • MongoDB cluster down or maintenance');
      console.error('   • DNS resolution issues');
      console.error('🔧 Solution Steps:');
      console.error('   1. Go to MongoDB Atlas → Network Access');
      console.error('   2. Add IP: 0.0.0.0/0 (Allow all access)');
      console.error('   3. Or add Koyeb\'s specific IP range');
    } else if (err.name === 'MongoParseError') {
      console.error('📝 MongoDB URI Parse Error - Koyeb Deployment:');
      console.error('   • Invalid MongoDB URI format in Koyeb Environment');
      console.error('   • Special characters in password not URL-encoded');
      console.error('   • Missing @ in connection string');
      console.error('   • Deprecated mongoose options (bufferMaxEntries, etc.)');
      console.error('🔧 Koyeb Solution Steps:');
      console.error('   1. Go to Koyeb Dashboard → Service → Environment Variables');
      console.error('   2. Check MONGODB_URI format');
      console.error('   3. URL-encode special characters: @ → %40, : → %3A');
      console.error('   4. Remove deprecated options from code');
    } else if (err.code === 'AUTH_FAILED') {
      console.error('🔐 MongoDB Authentication Failed:');
      console.error('   • Username or password incorrect');
      console.error('   • Special characters in password need URL encoding');
      console.error('   • User does not have permission to access database');
      console.error('🔧 Solution: Update MongoDB credentials in Koyeb Environment');
    } else if (err.message.includes('ENOTFOUND')) {
      console.error('🌍 MongoDB Server Not Found:');
      console.error('   • MongoDB cluster hostname incorrect');
      console.error('   • DNS resolution failed');
      console.error('   • Network connectivity issues');
      console.error('🔧 Solution: Verify MongoDB Atlas cluster endpoint');
    } else if (err.message.includes('timeout')) {
      console.error('⏰ MongoDB Connection Timeout:');
      console.error('   • High latency between Koyeb and MongoDB');
      console.error('   • Network congestion or slow connection');
      console.error('   • MongoDB cluster overloaded');
      console.error('🔧 Solution: Increase timeout values or check network');
    }
    
    console.error('📊 Full Error Details:', JSON.stringify(err, null, 2));
    console.error('🚀 Server will continue running but database features disabled');
  });
}

// Koyeb-specific health check endpoint
app.get('/koyeb/health', async (req, res) => {
  try {
    const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    const mongoUri = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI;
    
    const health = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      platform: 'Koyeb',
      database: {
        connected: dbConnected,
        state: connectionStates[mongoose.connection.readyState] || 'unknown',
        uriSet: !!mongoUri,
        uriLength: mongoUri ? mongoUri.length : 0,
        host: mongoose.connection.host,
        database: mongoose.connection.name
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        port: PORT,
        mongoUriEnvVar: Object.keys(process.env).filter(key => key.includes('MONGO'))
      }
    };
    
    if (!dbConnected) {
      health.error = 'MongoDB not connected - Check Koyeb Environment Variables';
      health.solution = 'Add MONGODB_URI to Koyeb Environment Variables';
    }
    
    res.status(dbConnected ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Basic routes
app.get('/', (req, res) => res.send('Kronop server running with Bunny routes'));

// Debug route to check database and content
app.get('/debug/database', async (req, res) => {
  try {
    const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    const debug = {
      dbConnected,
      connectionState: connectionStates[connectionState] || 'unknown',
      mongoUri: process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI ? 'SET' : 'NOT SET',
      mongoUriLength: (process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI || '').length,
      nodeEnv: process.env.NODE_ENV || 'not set',
      timestamp: new Date().toISOString()
    };
    
    if (process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI) {
      // Show sanitized URI for debugging
      const uri = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI;
      const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
      debug.sanitizedUri = sanitizedUri;
      
      // Check URI format
      const uriPattern = /^mongodb:\/\/[^@]+@[^\/]+\/|^mongodb\+srv:\/\/[^@]+@[^\/]+\//;
      debug.validFormat = uriPattern.test(uri);
    }
    
    if (dbConnected) {
      const totalContent = await Content.countDocuments();
      const photoCount = await Content.countDocuments({ type: 'Photo', is_active: true });
      const videoCount = await Content.countDocuments({ type: 'Video', is_active: true });
      const reelCount = await Content.countDocuments({ type: 'Reel', is_active: true });
      const storyCount = await Content.countDocuments({ type: 'Story', is_active: true });
      
      debug.content = {
        total: totalContent,
        photos: photoCount,
        videos: videoCount,
        reels: reelCount,
        stories: storyCount
      };
      
      // Get sample content
      const sampleContent = await Content.find({ is_active: true }).limit(5);
      debug.sampleContent = sampleContent.map(c => ({
        type: c.type,
        title: c.title,
        url: c.url,
        created_at: c.created_at
      }));
    }
    
    res.json({ success: true, debug });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/debug/mongodb-test', async (req, res) => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI;
    if (!mongoUri) {
      return res.status(400).json({
        success: false,
        error: 'MONGODB_URI not set in environment variables'
      });
    }
    
    // Test connection
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'MongoDB connection successful',
      responseTime: `${responseTime}ms`,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      readyState: mongoose.connection.readyState
    });
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      timestamp: new Date().toISOString()
    });
  }
});

apiRouter.get('/', (req, res) => res.json({ ok: true }));

apiRouter.get('/health', (req, res) => {
  try {
    const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    res.json({ ok: true, dbConnected });
  } catch (_e) {
    res.status(500).json({ ok: false, error: 'health_check_failed' });
  }
});

apiRouter.use('/content', contentRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/earnings', earningsRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/viral', viralRoutes);

// Auto-Sync Service Routes
apiRouter.get('/sync/status', (req, res) => {
  try {
    const status = AutoSyncService.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/sync/trigger', async (req, res) => {
  try {
    await AutoSyncService.performFullSync();
    const status = AutoSyncService.getStatus();
    res.json({ success: true, message: 'Sync completed', data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api', apiRouter);

// Register content routes with /api prefix
app.use('/api/content', contentRouteNew);
app.use('/api/users', userRouteNew);

// Alias routes (without /api) to avoid non-JSON 404/edge HTML responses from proxies
app.use('/content', contentRouteNew);
app.use('/users', userRouteNew);
app.use('/notifications', notificationRoutes);
app.use('/autosync', autosyncRoutes);

apiRouter.get('/notifications/list', async (_req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/notifications/list', async (_req, res) => {
  res.json({ success: true, data: [] });
});

// Register New Routes at root to resolve 404 for /users/profile and /content/photo/user
app.use('/users', userRouteNew);
app.use('/content', contentRouteNew);

// New GET route for user profile (Basic Data)
app.get('/api/users/profile', async (req, res) => {
  try {
    const { userId, phone } = req.query;
    const User = require('./models/User');
    
    let query = {};
    if (userId) query._id = userId;
    else if (phone) query.phone = phone;
    else {
      // If no identifier, try to return the first user or handle accordingly
      // For now, consistent with other endpoints, we might return a default or error
      // But user asked for "users collection", likely implying the current user or specific user.
      // Given the prompt "Mere MongoDB mein...", I'll assume query params are passed or we fetch one.
      // Let's fallback to finding *any* user if no param, or strict?
      // "Return basic user data". Let's stick to query if present, else first user (dev mode often does this)
       const firstUser = await User.findOne({}, 'username bio profile_pic');
       if (!firstUser) return res.status(404).json({ error: 'User not found' });
       return res.json({ success: true, data: firstUser });
    }

    const user = await User.findOne(query, 'username bio profile_pic');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Cache middleware for API routes
const cacheMiddleware = (cacheKey, ttl = 300) => {
  return async (req, res, next) => {
    try {
      const key = typeof cacheKey === 'function' ? cacheKey(req) : cacheKey;
      const cached = await RedisCacheService.client.get(key);
      
      if (cached) {
        console.log(`🚀 Cache HIT for ${key}`);
        return res.json(JSON.parse(cached));
      }
      
      // Store original res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Cache the response
        RedisCacheService.client.setex(key, ttl, JSON.stringify(data))
          .catch(err => console.error('Cache set error:', err));
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

app.get('/api/reels', cacheMiddleware((req) => `reels:${req.query.userId || 'public'}:${req.query.page || 1}`, 180), async (req, res) => {
  try {
    const { page = 1, limit = 20, userId } = req.query;
    
    // If no userId provided, fall back to trending content
    if (!userId) {
      const trendingReels = await UserInterestTrackingService.getTrendingContent('Reel', parseInt(limit));
      const data = SignedUrlService.generateSignedUrlsForContent(trendingReels);
      return res.json({ success: true, data, message: 'Trending reels' });
    }

    // Get user's interest profile
    const userProfile = await UserInterestTrackingService.getUserInterestProfile(userId);
    
    // If user has no interests yet, show trending content
    if (userProfile.isNewUser || userProfile.totalInteractions < 5) {
      const trendingReels = await UserInterestTrackingService.getTrendingContent('Reel', parseInt(limit));
      const data = SignedUrlService.generateSignedUrlsForContent(trendingReels);
      return res.json({ 
        success: true, 
        data, 
        message: 'Trending reels for new user',
        isSmartFeed: false,
        isNewUser: true
      });
    }

    // Get user's top categories for filtering
    const topCategories = userProfile.topCategories.map(cat => cat.category);
    // Build smart query based on user interests
    const smartQuery = {
      type: 'Reel',
      is_active: true
    };

    if (topCategories.length > 0) {
      smartQuery.$or = [
        { category: { $in: topCategories } },
        { tags: { $in: topCategories } }
      ];
    }

    // Get content with smart filtering
    let reels = await Content.find(smartQuery)
      .sort({ created_at: -1 })
      .limit(parseInt(limit) * 2)
      .select('title url thumbnail tags category views likes created_at user_id');

    // Calculate relevance scores and sort
    const reelsWithRelevance = [];
    for (const reel of reels) {
      const relevance = await UserInterestTrackingService.calculateContentRelevance(userId, reel);
      reelsWithRelevance.push({
        ...reel.toObject(),
        relevanceScore: relevance.score,
        matchedInterests: relevance.matchedInterests
      });
    }

    // Sort by relevance score (highest first)
    reelsWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const paginatedReels = reelsWithRelevance.slice(0, parseInt(limit));

    // Generate signed URLs
    const data = SignedUrlService.generateSignedUrlsForContent(paginatedReels);

    res.json({
      success: true,
      data,
      message: 'Smart feed based on your interests',
      isSmartFeed: true,
      isNewUser: false,
      userInteractions: userProfile.totalInteractions,
      topCategories: userProfile.topCategories.slice(0, 5)
    });

  } catch (error) {
    console.error('❌ Smart reels feed error:', error);
    // Fallback to basic content if smart feed fails
    try {
      const { page = 1, limit = 20, fields } = req.query;
      const fieldList = typeof fields === 'string' ? fields.split(',') : null;
      const data = await BunnyContentService.getContentForFrontend(
        'Reel',
        parseInt(page),
        parseInt(limit),
        fieldList
      );
      res.json({ success: true, data, message: 'Reels (fallback mode)' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message, data: [] });
    }
  }
});

app.get('/api/reels/user', async (req, res) => {
  try {
    const { page = 1, limit = 20, fields } = req.query;
    const fieldList = typeof fields === 'string' ? fields.split(',') : null;
    // Return PUBLIC reels instead of user-specific
    const data = await BunnyContentService.getContentForFrontend(
      'Reel',
      parseInt(page),
      parseInt(limit),
      fieldList
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Reels feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/videos', async (req, res) => {
  try {
    const { page = 1, limit = 20, fields } = req.query;
    const fieldList = typeof fields === 'string' ? fields.split(',') : null;
    const data = await BunnyContentService.getContentForFrontend(
      'Video',
      parseInt(page),
      parseInt(limit),
      fieldList
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/live', async (req, res) => {
  try {
    const { page = 1, limit = 20, fields } = req.query;
    const fieldList = typeof fields === 'string' ? fields.split(',') : null;
    const data = await BunnyContentService.getContentForFrontend(
      'Live',
      parseInt(page),
      parseInt(limit),
      fieldList
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stories', async (req, res) => {
  try {
    const { page = 1, limit = 20, fields } = req.query;
    const fieldList = typeof fields === 'string' ? fields.split(',') : null;
    const data = await BunnyContentService.getContentForFrontend(
      'Story',
      parseInt(page),
      parseInt(limit),
      fieldList
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/photos', cacheMiddleware((req) => `photos:${req.query.userId || 'public'}:${req.query.category || 'all'}:${req.query.page || 1}`, 300), async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, category } = req.query;
    
    // If category is explicitly requested, bypass smart feed for that category
    if (category && category !== 'all') {
      const categoryPhotos = await Content.find({
        type: 'Photo',
        category: category,
        is_active: true
      })
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .select('title url thumbnail tags category views likes created_at user_id');
      
      const data = SignedUrlService.generateSignedUrlsForContent(categoryPhotos);
      return res.json({
        success: true,
        data,
        message: `Photos in category: ${category}`,
        isSmartFeed: false,
        isCategoryFilter: true
      });
    }
    
    // If no userId provided, fall back to trending content
    if (!userId) {
      const trendingPhotos = await UserInterestTrackingService.getTrendingContent('Photo', parseInt(limit));
      const data = SignedUrlService.generateSignedUrlsForContent(trendingPhotos);
      return res.json({ success: true, data, message: 'Trending photos' });
    }

    // Get user's interest profile
    const userProfile = await UserInterestTrackingService.getUserInterestProfile(userId);
    
    // If user has no interests yet, show trending content
    if (userProfile.isNewUser || userProfile.totalInteractions < 5) {
      const trendingPhotos = await UserInterestTrackingService.getTrendingContent('Photo', parseInt(limit));
      const data = SignedUrlService.generateSignedUrlsForContent(trendingPhotos);
      return res.json({ 
        success: true, 
        data, 
        message: 'Trending photos for new user',
        isSmartFeed: false,
        isNewUser: true
      });
    }

    // Get user's top categories for filtering
    const topCategories = userProfile.topCategories.map(cat => cat.category);
    console.log(`🎯 User ${userId} top categories:`, topCategories.slice(0, 5));

    // Build smart query based on user interests
    const smartQuery = {
      type: 'Photo',
      is_active: true
    };

    if (topCategories.length > 0) {
      smartQuery.$or = [
        { category: { $in: topCategories } },
        { tags: { $in: topCategories } }
      ];
    }

    // Get content with smart filtering
    let photos = await Content.find(smartQuery)
      .sort({ created_at: -1 })
      .limit(parseInt(limit) * 2)
      .select('title url thumbnail tags category views likes created_at user_id');

    // Calculate relevance scores and sort
    const photosWithRelevance = [];
    for (const photo of photos) {
      const relevance = await UserInterestTrackingService.calculateContentRelevance(userId, photo);
      photosWithRelevance.push({
        ...photo.toObject(),
        relevanceScore: relevance.score,
        matchedInterests: relevance.matchedInterests
      });
    }

    // Sort by relevance score (highest first)
    photosWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const paginatedPhotos = photosWithRelevance.slice(0, parseInt(limit));

    // Generate signed URLs
    const data = SignedUrlService.generateSignedUrlsForContent(paginatedPhotos);

    res.json({
      success: true,
      data,
      message: 'Smart feed based on your interests',
      isSmartFeed: true,
      isNewUser: false,
      userInteractions: userProfile.totalInteractions,
      topCategories: userProfile.topCategories.slice(0, 5)
    });

  } catch (error) {
    console.error('❌ Smart photos feed error:', error);
    // Fallback to basic content if smart feed fails
    try {
      const { page = 1, limit = 20, fields } = req.query;
      const fieldList = typeof fields === 'string' ? fields.split(',') : null;
      const data = await BunnyContentService.getContentForFrontend(
        'Photo',
        parseInt(page),
        parseInt(limit),
        fieldList
      );
      res.json({ success: true, data, message: 'Photos (fallback mode)' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message, data: [] });
    }
  }
});

app.get('/api/photos/user', async (req, res) => {
  try {
    const { page = 1, limit = 20, fields } = req.query;
    const fieldList = typeof fields === 'string' ? fields.split(',') : null;
    // Return PUBLIC photos instead of user-specific
    const data = await BunnyContentService.getContentForFrontend(
      'Photo',
      parseInt(page),
      parseInt(limit),
      fieldList
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Photos feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// HLS streaming endpoint
app.get('/stream/:filename', (req, res) => {
  const filePath = path.join(HLS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('Stream not found');
  }
});

// Upload endpoints
// POST /upload/url - Get upload URL for any content type
app.post('/upload/url', async (req, res) => {
  try {
    const { contentType, fileName, fileSize, metadata } = req.body;
    
    console.log(`🔗 Upload URL requested for ${contentType}:`, { fileName, fileSize });
    
    // Generate upload URL based on content type
    let uploadUrl, contentId;
    
    switch (contentType?.toLowerCase()) {
      case 'reel':
      case 'video':
      case 'live':
        // Stream API - generate video ID
        const libraryId = contentType === 'reel' ? '593793' : 
                       contentType === 'video' ? '593795' : '594452';
        contentId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        uploadUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${contentId}`;
        break;
        
      case 'photo':
      case 'shayari':
      case 'story':
        // Storage API - generate direct upload URL
        const storageZone = contentType === 'photo' ? 'photu' : 
                         contentType === 'shayari' ? 'shayar' : 'storiy';
        contentId = `${contentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${contentId}`;
        break;
        
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }
    
    res.json({
      success: true,
      uploadUrl,
      contentId,
      contentType,
      fileName,
      fileSize
    });
    
  } catch (error) {
    console.error('❌ Upload URL generation failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate upload URL' 
    });
  }
});

// Upload and transcode endpoint
app.post('/upload', express.raw({ type: 'video/*', limit: '100mb' }), (req, res) => {
  const inputPath = path.join(UPLOADS_DIR, `input_${Date.now()}.mp4`);
  const outputPath = path.join(HLS_DIR, `stream_${Date.now()}`);

  fs.writeFileSync(inputPath, req.body);

  ffmpeg(inputPath)
    .outputOptions([
      '-profile:v baseline',
      '-level 3.0',
      '-start_number 0',
      '-hls_time 10',
      '-hls_list_size 0',
      '-f hls'
    ])
    .output(`${outputPath}.m3u8`)
    .on('end', () => {
      fs.unlinkSync(inputPath); // Clean up original file
      res.json({ streamUrl: `/stream/${path.basename(outputPath)}.m3u8` });
    })
    .on('error', err => {
      console.error('FFmpeg error:', err);
      res.status(500).send('Transcoding failed');
    })
    .run();
});

// Serve static HLS files
app.use('/hls', express.static(HLS_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// ==================== MISSING ROUTES FIX ====================

// Cache user profile endpoint
apiRouter.get('/users/profile', cacheMiddleware((req) => `profile:${req.query.userId || req.query.firebaseUid || 'anon'}`, 600), async (req, res) => {
  try {
    const { userId, firebaseUid, phone } = req.query;
    let query = {};
    
    if (userId) query._id = userId;
    else if (firebaseUid) query.firebaseUid = firebaseUid;
    else if (phone) query.phone = phone;
    else return res.status(400).json({ error: 'Missing identifier (userId, firebaseUid, or phone)' });

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fix for /api/content/photo/user route - NOW PUBLIC!
apiRouter.get('/content/photo/user', async (req, res) => {
  try {
    // Ignore userId - return ALL public photos
    const data = await BunnyContentService.getContentForFrontend(
      'Photo',
      1, // page
      50, // limit - show more photos
      null // fields
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Public Photos feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fix for /api/content/story route
apiRouter.get('/content/story', async (req, res) => {
  try {
    const { page = 1, limit = 20, fields } = req.query;
    const fieldList = typeof fields === 'string' ? fields.split(',') : null;
    const data = await BunnyContentService.getContentForFrontend(
      'Story',
      parseInt(page),
      parseInt(limit),
      fieldList
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PUBLIC UPLOAD ENDPOINTS (NO LOGIN REQUIRED) ====================

// Helper function to create dummy user if needed
const getOrCreateDummyUser = async (userId = null) => {
  const effectiveUserId = userId || 'guest_user_' + Date.now();
  
  let user = await User.findOne({ _id: effectiveUserId });
  if (!user) {
    user = new User({
      _id: effectiveUserId,
      displayName: 'Guest User',
      email: 'guest@example.com',
      phone: '0000000000'
    });
    await user.save();
  }
  return effectiveUserId;
};

// POST /upload/reel - Public Reel Upload (NO LOGIN)
app.post('/upload/reel', async (req, res) => {
  try {
    const { title, url, bunny_id, thumbnail, description, tags, userId } = req.body;
    const effectiveUserId = await getOrCreateDummyUser(userId);
    
    if (!url || !bunny_id) {
      return res.status(400).json({ error: 'url and bunny_id are required' });
    }

    const newReel = new Content({
      user_id: effectiveUserId,
      type: 'Reel',
      title: title || 'Untitled Reel (NO LOGIN)',
      url,
      bunny_id,
      thumbnail,
      description,
      tags,
      is_active: true
    });

    await newReel.save();
    res.status(201).json({ success: true, data: newReel, message: 'Reel uploaded successfully (NO LOGIN)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /upload/video - Public Video Upload (NO LOGIN)
app.post('/upload/video', async (req, res) => {
  try {
    const { title, url, bunny_id, thumbnail, description, tags, userId } = req.body;
    const effectiveUserId = await getOrCreateDummyUser(userId);
    
    if (!url || !bunny_id) {
      return res.status(400).json({ error: 'url and bunny_id are required' });
    }

    const newVideo = new Content({
      user_id: effectiveUserId,
      type: 'Video',
      title: title || 'Untitled Video (NO LOGIN)',
      url,
      bunny_id,
      thumbnail,
      description,
      tags,
      is_active: true
    });

    await newVideo.save();
    res.status(201).json({ success: true, data: newVideo, message: 'Video uploaded successfully (NO LOGIN)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /upload/live - Public Live Content Upload (NO LOGIN)
app.post('/upload/live', async (req, res) => {
  try {
    const { title, url, bunny_id, thumbnail, description, tags, userId, streamKey } = req.body;
    const effectiveUserId = await getOrCreateDummyUser(userId);
    
    if (!url || !bunny_id) {
      return res.status(400).json({ error: 'url and bunny_id are required' });
    }

    const newLive = new Content({
      user_id: effectiveUserId,
      type: 'Live',
      title: title || 'Untitled Live Stream (NO LOGIN)',
      url,
      bunny_id,
      thumbnail,
      description,
      tags,
      streamKey,
      is_active: true
    });

    await newLive.save();
    res.status(201).json({ success: true, data: newLive, message: 'Live content uploaded successfully (NO LOGIN)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /upload/story - Public Story Upload (NO LOGIN)
app.post('/upload/story', async (req, res) => {
  try {
    const { title, url, bunny_id, thumbnail, description, tags, userId } = req.body;
    const effectiveUserId = await getOrCreateDummyUser(userId);
    
    if (!url || !bunny_id) {
      return res.status(400).json({ error: 'url and bunny_id are required' });
    }

    const newStory = new Content({
      user_id: effectiveUserId,
      type: 'Story',
      title: title || 'Untitled Story (NO LOGIN)',
      url,
      bunny_id,
      thumbnail,
      description,
      tags,
      is_active: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Stories expire in 24 hours
    });

    await newStory.save();
    res.status(201).json({ success: true, data: newStory, message: 'Story uploaded successfully (NO LOGIN)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /upload/shayari - Public Shayari Upload (NO LOGIN)
app.post('/upload/shayari', async (req, res) => {
  try {
    const { title, url, bunny_id, thumbnail, description, tags, userId, shayari_text, shayari_author } = req.body;
    const effectiveUserId = await getOrCreateDummyUser(userId);
    
    if (!url || !bunny_id) {
      return res.status(400).json({ error: 'url and bunny_id are required' });
    }

    const newShayari = new Content({
      user_id: effectiveUserId,
      type: 'ShayariPhoto',
      title: title || 'Untitled Shayari (NO LOGIN)',
      url,
      bunny_id,
      thumbnail,
      description,
      tags,
      shayari_text,
      shayari_author,
      is_active: true
    });

    await newShayari.save();
    res.status(201).json({ success: true, data: newShayari, message: 'Shayari uploaded successfully (NO LOGIN)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /upload/photo - Public Photo Upload (NO LOGIN) - Alternative to content save
app.post('/upload/photo', async (req, res) => {
  try {
    const { title, url, bunny_id, thumbnail, description, tags, userId, category } = req.body;
    const effectiveUserId = await getOrCreateDummyUser(userId);
    
    if (!url || !bunny_id) {
      return res.status(400).json({ error: 'url and bunny_id are required' });
    }

    const newPhoto = new Content({
      user_id: effectiveUserId,
      type: 'Photo',
      title: title || 'Untitled Photo (NO LOGIN)',
      url,
      bunny_id,
      thumbnail,
      description,
      tags,
      category,
      is_active: true
    });

    await newPhoto.save();
    res.status(201).json({ success: true, data: newPhoto, message: 'Photo uploaded successfully (NO LOGIN)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ONESIGNAL AUTHORIZATION FIX ====================

// Override OneSignal client to add proper Authorization header
const originalOneSignalClient = require('./services/oneSignalClient');

originalOneSignalClient.createNotification = async (notification) => {
  const url = process.env.EXPO_PUBLIC_ONESIGNAL_API_URL || process.env.ONESIGNAL_API_URL || 'https://onesignal.com/api/v1/notifications';
  const apiKey = (
    process.env.ONESIGNAL_REST_API_KEY ||
    process.env.ONE_SIGNAL_REST_API_KEY ||
    process.env.ONESIGNAL_API_KEY ||
    process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY ||
    ''
  ).trim();
  if (!apiKey) throw new Error('OneSignal REST API key is missing (set ONESIGNAL_REST_API_KEY)');

  const trySend = async (authorizationValue) => {
    const response = await axios.post(url, notification, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorizationValue
      }
    });
    return response.data;
  };

  const isV2Key = apiKey.startsWith('os_v2_');
  const primaryAuth = isV2Key ? `Key ${apiKey}` : `Basic ${apiKey}`;
  const fallbackAuth = isV2Key ? `Basic ${apiKey}` : `Key ${apiKey}`;

  try {
    return await trySend(primaryAuth);
  } catch (error) {
    const status = error?.response?.status;
    if ((status === 401 || status === 403) && fallbackAuth !== primaryAuth) {
      try {
        return await trySend(fallbackAuth);
      } catch (retryError) {
        console.error('OneSignal API Error:', retryError.response?.data || retryError.message);
        throw new Error(retryError.response?.data?.message || retryError.message);
      }
    }
    console.error('OneSignal API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Shayari endpoint for random shayari
apiRouter.get('/shayari/random', async (req, res) => {
  try {
    const shayari = await Content.aggregate([
      { $match: { type: 'ShayariPhoto', is_active: true } },
      { $sample: { size: 1 } }
    ]);
    
    if (shayari.length === 0) {
      // Fallback shayari if none in database
      const fallbackShayari = {
        _id: 'fallback',
        type: 'ShayariPhoto',
        shayari_text: 'दिल की बात जुबां पर आना आसान नहीं है,\nहर किसी को अपनी मोहब्बत का इज़हार करना आसान नहीं है।',
        shayari_author: 'Anonymous',
        title: 'Romantic Shayari'
      };
      return res.json({ success: true, data: fallbackShayari });
    }
    
    res.json({ success: true, data: shayari[0] });
  } catch (error) {
    console.error('❌ Random shayari error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'not_found', path: req.originalUrl });
});

app.use('/notifications', (req, res) => {
  res.status(404).json({ ok: false, error: 'not_found', path: req.originalUrl });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err?.status || err?.statusCode || 500;
  const isApi = typeof req.originalUrl === 'string' && (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/notifications'));
  if (isApi) {
    return res.status(status).json({ ok: false, error: err?.message || 'server_error' });
  }
  return res.status(status).send(err?.message || 'Server Error');
});

const server = app.listen(PORT, HOST, async () => {
  const ip = getLocalIPv4();
  console.log(`Kronop server listening on http://${ip}:${PORT}`);
  
  // Wait for MongoDB to be fully connected before starting scaling system
  const waitForMongoDBConnection = () => {
    return new Promise((resolve, reject) => {
      const maxWaitTime = 30000; // 30 seconds timeout
      const startTime = Date.now();
      
      const checkConnection = () => {
        const elapsed = Date.now() - startTime;
        
        if (mongoose.connection.readyState === 1) {
          console.log('✅ MongoDB fully connected, proceeding with scaling system...');
          resolve();
        } else if (elapsed > maxWaitTime) {
          console.error('❌ MongoDB connection timeout after 30 seconds');
          reject(new Error('MongoDB connection timeout'));
        } else {
          console.log(`⏳ Waiting for MongoDB connection... (${Math.floor(elapsed/1000)}s)`);
          setTimeout(checkConnection, 1000);
        }
      };
      checkConnection();
    });
  };
  
  try {
    // Wait for MongoDB connection with timeout
    await waitForMongoDBConnection();
    
    // Initialize Scaling System for 50,000 Users
    const ScalingOrchestrator = require('./services/scalingOrchestrator');
    await ScalingOrchestrator.initializeScalingSystem(server);
    console.log('🚀 Scaling System Active - Ready for 50,000 Users!');
  } catch (error) {
    console.error('❌ Scaling System Failed:', error.message);
    console.log('⚠️ Server will continue without scaling system');
    console.log('💡 To fix: Check MongoDB connection and restart server');
  }
  
  // Initialize Realtime WebSocket Service (existing)
  RealtimeService.initialize(server);
  
  // Set up ping interval to keep connections alive
  setInterval(() => {
    RealtimeService.pingAllClients();
  }, 30000); // Ping every 30 seconds
}
);

// ==================== AUTO-SYNC CLEANUP ENDPOINTS ====================
// DELETE endpoints for auto-sync cleanup

// DELETE /api/reels/:id - Delete broken reel
app.delete('/api/reels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await Content.deleteOne({ 
      _id: id, 
      type: 'Reel' 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    
    res.json({ success: true, message: 'Reel deleted successfully' });
  } catch (error) {
    console.error('❌ Delete reel error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/videos/:id - Delete broken video
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await Content.deleteOne({ 
      _id: id, 
      type: 'Video' 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('❌ Delete video error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/photos/:id - Delete broken photo
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await Content.deleteOne({ 
      _id: id, 
      type: 'Photo' 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('❌ Delete photo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shayari/:id - Delete broken shayari
app.delete('/api/shayari/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await Content.deleteOne({ 
      _id: id, 
      type: 'Shayari' 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Shayari not found' });
    }
    
    res.json({ success: true, message: 'Shayari deleted successfully' });
  } catch (error) {
    console.error('❌ Delete shayari error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/stories/:id - Delete broken story
app.delete('/api/stories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await Content.deleteOne({ 
      _id: id, 
      type: 'Story' 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error('❌ Delete story error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== REAL-TIME WEBSOCKET SERVER ====================
// WebSocket server for real-time data synchronization
// No polling - push notifications only

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

console.log('🚀 WebSocket Server started on port 8080');

// Connected clients
const clients = new Set();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log(`[WEBSOCKET]: New client connected from ${req.socket.remoteAddress}`);
  clients.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connection established',
    timestamp: new Date().toISOString()
  }));

  // Handle messages from clients
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('[WEBSOCKET]: Received message:', message.type);
      
      switch (message.type) {
        case 'connect':
          // Client is ready to receive updates
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
        default:
          console.log('[WEBSOCKET]: Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[WEBSOCKET]: Failed to parse message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', (code, reason) => {
    console.log(`[WEBSOCKET]: Client disconnected - Code: ${code}, Reason: ${reason}`);
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('[WEBSOCKET]: WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast function to send messages to all connected clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  console.log(`[WEBSOCKET]: Broadcasting to ${clients.size} clients:`, message.type);
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
      } catch (error) {
        console.error('[WEBSOCKET]: Failed to send to client:', error);
        clients.delete(client);
      }
    } else {
      clients.delete(client);
    }
  });
}

// MongoDB Change Stream for real-time updates

// Function to setup change streams for all content collections
function setupChangeStreams() {
  console.log('[WEBSOCKET]: Setting up MongoDB Change Streams...');
  
  // Watch Content collection for changes
  const contentSchema = mongoose.models.Content;
  if (contentSchema) {
    const changeStream = contentSchema.watch();
    
    changeStream.on('change', (change) => {
      console.log('[WEBSOCKET]: MongoDB change detected:', change.operationType);
      
      const fullDocument = change.fullDocument;
      if (fullDocument) {
        const eventType = change.operationType === 'insert' ? 'content_added' :
                         change.operationType === 'update' ? 'content_updated' :
                         change.operationType === 'delete' ? 'content_deleted' : 'content_changed';
        
        // Broadcast to all connected clients
        broadcast({
          type: eventType,
          contentType: fullDocument.type.toLowerCase(),
          data: {
            id: fullDocument._id.toString(),
            bunny_id: fullDocument.bunny_id,
            url: fullDocument.url,
            thumbnail_url: fullDocument.thumbnail,
            title: fullDocument.title,
            type: fullDocument.type.toLowerCase(),
            created_at: fullDocument.created_at,
            updated_at: fullDocument.updated_at
          },
          timestamp: new Date().toISOString()
        });
      }
    });
    
    changeStream.on('error', (error) => {
      console.error('[WEBSOCKET]: Change Stream error:', error);
    });
    
    console.log('[WEBSOCKET]: Change Stream setup complete');
  }
}

// Setup change streams after MongoDB connection
mongoose.connection.once('open', () => {
  setupChangeStreams();
  
  // Initialize Auto-Sync Scheduler in background
  console.log('🔄 Initializing Auto-Sync Scheduler...');
  autoSyncIntegration.initialize()
    .then((success) => {
      if (success) {
        console.log('✅ Auto-Sync Scheduler started successfully!');
        console.log('📅 Background sync will run every minute');
        console.log('🔗 BunnyCDN ↔ MongoDB sync active');
      } else {
        console.log('❌ Failed to start Auto-Sync Scheduler');
      }
    })
    .catch((error) => {
      console.error('❌ Auto-Sync initialization error:', error);
    });
});

// Manual broadcast function for testing
global.broadcastToClients = broadcast;

console.log('🚀 Real-time WebSocket system loaded');


