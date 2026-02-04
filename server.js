// ==================== CORE IMPORTS ====================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
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
 
const viralRoutes = require('./api/viral');

// New Routes as requested
const userRouteNew = require('./routes/user');
const contentRouteNew = require('./routes/content');

// ==================== APP INITIALIZATION ====================
const app = express();
const PORT = Number(process.env.PORT) || 10000;
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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== UTILITIES ====================
const getLocalIPv4 = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '0.0.0.0';
};

const MONGO_URI = process.env.MONGODB_URI;

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
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
    console.error('❌ MongoDB CONNECTION FAILED:');
    console.error('🔍 Error Name:', err.name);
    console.error('📝 Error Message:', err.message);
    console.error('🔢 Error Code:', err.code);
    console.error('📊 Error Details:', JSON.stringify(err, null, 2));

    if (err.name === 'MongoServerSelectionError') {
      console.error('🌐 Server Selection Error - Possible causes:');
      console.error('   • Network connectivity issues');
      console.error('   • Wrong MongoDB URL/credentials');
      console.error('   • Firewall blocking connection');
      console.error('   • MongoDB server down');
    } else if (err.name === 'MongoParseError') {
      console.error('📝 Parse Error - Check MongoDB URI format');
    } else if (err.code === 'AUTH_FAILED') {
      console.error('🔐 Authentication Failed - Check username/password');
    }
  });
}

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
      mongoUri: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
      nodeEnv: process.env.NODE_ENV || 'not set',
      timestamp: new Date().toISOString()
    };
    
    if (process.env.MONGODB_URI) {
      // Show sanitized URI for debugging
      const sanitizedUri = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
      debug.sanitizedUri = sanitizedUri;
      
      // Check URI format
      const uriPattern = /^mongodb:\/\/[^@]+@[^\/]+\/|^mongodb\+srv:\/\/[^@]+@[^\/]+\//;
      debug.validFormat = uriPattern.test(process.env.MONGODB_URI);
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

// MongoDB connection test endpoint
app.get('/debug/mongodb-test', async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) {
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

// Alias routes (without /api) to avoid non-JSON 404/edge HTML responses from proxies
app.use('/notifications', notificationRoutes);

apiRouter.get('/notifications/list', async (_req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/notifications/list', async (_req, res) => {
  res.json({ success: true, data: [] });
});

// Register New Routes at root to resolve 404 for /users/profile and /content/photo/user
app.use('/users', userRouteNew);
app.use('/content', contentRouteNew);

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

// ==================== ONESIGNAL AUTHORIZATION FIX ====================

// Override OneSignal client to add proper Authorization header
const originalOneSignalClient = require('./services/oneSignalClient');

originalOneSignalClient.createNotification = async (notification) => {
  const url = 'https://onesignal.com/api/v1/notifications';
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

// const HOST = '0.0.0.0';
const server = app.listen(PORT, '0.0.0.0', async () => {
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
});


