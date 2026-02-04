// Socket.io Scaling Service for 50,000 Concurrent Users
const socketIo = require('socket.io');
const redis = require('socket.io-redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

class SocketScalingService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Local user tracking
    this.userRooms = new Map(); // User room management
  }

  // Initialize Socket.io with Redis adapter for scaling
  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 1e8 // 100 MB
    });

    // Redis adapter for multiple server instances
    this.setupRedisAdapter();
    
    // Socket event handlers
    this.setupEventHandlers();
    
    console.log('✅ Socket.io initialized for 50K users');
  }

  // Setup Redis adapter for horizontal scaling (DISABLED for Render deployment)
  async setupRedisAdapter() {
    try {
      // Redis disabled for Render deployment - using local memory
      console.log('⚠️ Redis adapter disabled - using local memory for Socket.io scaling');
      console.log('💡 To enable Redis: Set valid REDIS_URL environment variable');
      
      // Alternative: Use socket.io built-in memory adapter
      // this.io.adapter(createMemoryAdapter()); // Available in Socket.io v4+
      
    } catch (error) {
      console.error('❌ Redis adapter failed:', error);
    }
  }

  // Setup optimized event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`👤 User connected: ${socket.id}`);
      
      // Handle user authentication
      socket.on('authenticate', async (userData) => {
        try {
          const { userId, token } = userData;
          
          // Verify token (implement your auth logic)
          if (this.validateUserToken(userId, token)) {
            socket.userId = userId;
            this.connectedUsers.set(userId, socket.id);
            
            // Join user to personal room
            socket.join(`user:${userId}`);
            
            // Join content rooms based on interests
            await this.joinInterestRooms(socket, userId);
            
            socket.emit('authenticated', { success: true });
            console.log(`✅ User ${userId} authenticated`);
          } else {
            socket.emit('authentication_error', { error: 'Invalid token' });
          }
        } catch (error) {
          socket.emit('authentication_error', { error: error.message });
        }
      });

      // Handle real-time content interactions
      socket.on('content_interaction', async (data) => {
        try {
          const { contentId, action, userId } = data;
          
          // Broadcast to content room
          this.io.to(`content:${contentId}`).emit('content_update', {
            contentId,
            action,
            userId,
            timestamp: Date.now()
          });
          
          // Update in Redis cache
          await this.updateContentCache(contentId, action, userId);
          
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Handle live streaming
      socket.on('join_live', (data) => {
        const { streamId } = data;
        socket.join(`live:${streamId}`);
        socket.emit('joined_live', { streamId });
        
        // Notify others in the stream
        socket.to(`live:${streamId}`).emit('viewer_joined', {
          viewerCount: this.getViewerCount(streamId)
        });
      });

      // Handle comments in real-time
      socket.on('new_comment', async (commentData) => {
        const { contentId, comment, userId } = commentData;
        
        // Broadcast to content room
        this.io.to(`content:${contentId}`).emit('comment_added', {
          contentId,
          comment,
          userId,
          timestamp: Date.now()
        });
        
        // Cache comment for quick loading
        await this.cacheComment(contentId, commentData);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          console.log(`👤 User disconnected: ${socket.userId}`);
        }
      });
    });
  }

  // Join users to interest-based rooms
  async joinInterestRooms(socket, userId) {
    try {
      // Get user interests from database/cache
      const userInterests = await this.getUserInterests(userId);
      
      userInterests.forEach(interest => {
        socket.join(`interest:${interest}`);
      });
      
    } catch (error) {
      console.error('Error joining interest rooms:', error);
    }
  }

  // Send targeted notifications
  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Send to interest groups
  sendToInterest(interest, event, data) {
    this.io.to(`interest:${interest}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: this.io.engine.clientsCount,
      rooms: this.io.sockets.adapter.rooms.size
    };
  }

  // Validate user token (implement your logic)
  validateUserToken(userId, token) {
    // Implement JWT validation or your auth method
    return true; // Placeholder
  }

  // Get user interests
  async getUserInterests(userId) {
    // Fetch from database or cache
    return ['technology', 'entertainment']; // Placeholder
  }

  // Update content cache
  async updateContentCache(contentId, action, userId) {
    // Update Redis cache with new interaction
  }

  // Cache comment
  async cacheComment(contentId, commentData) {
    // Cache comment in Redis for quick loading
  }

  // Get live stream viewer count
  getViewerCount(streamId) {
    const room = this.io.sockets.adapter.rooms.get(`live:${streamId}`);
    return room ? room.size : 0;
  }
}

module.exports = new SocketScalingService();
