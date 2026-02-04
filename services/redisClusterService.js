// Enterprise Redis Cluster Service for 100M+ Users
// Using ioredis for high-performance clustering and connection pooling

const Redis = require('ioredis');

class RedisClusterService {
  constructor() {
    this.redis = null;
    this.cluster = null;
    this.connectionPool = [];
    this.isConnected = false;
    this.config = {
      // Redis configuration for production
      host: process.env.REDIS_HOST || '',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '',
      db: process.env.REDIS_DB || 0,
      
      // Connection pooling for high traffic
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxLoadingTimeout: 5000,
      
      // Cluster mode configuration
      enableOfflineQueue: false,
      lazyConnect: true,
      
      // Performance tuning
      keyPrefix: 'kronop:',
      connectTimeout: 10000,
      commandTimeout: 5000,
      
      // Pool configuration
      family: 4,
      keepAlive: 30000,
      
      // Memory management
      enableAutoPipelining: true
    };

    this.initializeRedis();
  }

  // Initialize Redis connection with fallback
  async initializeRedis() {
    try {
      console.log('🔗 Initializing Redis connection...');
      
      // Try cluster mode first (for production)
      if (process.env.REDIS_CLUSTER_MODE === 'true') {
        await this.initializeCluster();
      } else {
        await this.initializeSingleRedis();
      }

      // Test connection
      await this.testConnection();
      
      this.isConnected = true;
      console.log('✅ Redis connected successfully');
      
      // Setup monitoring
      this.setupMonitoring();
      
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      console.log('🔄 Using fallback mode (no Redis caching)');
      
      // Create mock Redis for development
      this.createMockRedis();
    }
  }

  // Initialize single Redis instance
  async initializeSingleRedis() {
    this.redis = new Redis({
      port: this.config.port,
      host: this.config.host,
      password: this.config.password,
      db: this.config.db,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      enableReadyCheck: this.config.enableReadyCheck,
      maxLoadingTimeout: this.config.maxLoadingTimeout,
      enableOfflineQueue: this.config.enableOfflineQueue,
      lazyConnect: this.config.lazyConnect,
      keyPrefix: this.config.keyPrefix,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout,
      family: this.config.family,
      keepAlive: this.config.keepAlive,
      enableAutoPipelining: this.config.enableAutoPipelining
    });

    // Connection event handlers
    this.redis.on('connect', () => {
      console.log('🔌 Redis connected');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis error:', err);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    await this.redis.connect();
  }

  // Initialize Redis cluster for production
  async initializeCluster() {
    const clusterNodes = this.getClusterNodes();
    
    this.cluster = new Redis.Cluster(clusterNodes, {
      redisOptions: {
        password: this.config.password,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        enableReadyCheck: this.config.enableReadyCheck,
        maxLoadingTimeout: this.config.maxLoadingTimeout,
        enableOfflineQueue: this.config.enableOfflineQueue,
        lazyConnect: this.config.lazyConnect,
        keyPrefix: this.config.keyPrefix,
        connectTimeout: this.config.connectTimeout,
        commandTimeout: this.config.commandTimeout,
        family: this.config.family,
        keepAlive: this.config.keepAlive,
        enableAutoPipelining: this.config.enableAutoPipelining
      },
      enableOfflineQueue: false,
      retryDelayOnFailover: 100
    });

    // Cluster event handlers
    this.cluster.on('connect', () => {
      console.log('🔌 Redis cluster connected');
    });

    this.cluster.on('error', (err) => {
      console.error('❌ Redis cluster error:', err);
      this.isConnected = false;
    });

    this.cluster.on('close', () => {
      console.log('🔌 Redis cluster connection closed');
      this.isConnected = false;
    });

    this.cluster.on('node error', (err, node) => {
      console.error(`❌ Redis cluster node error ${node.options.host}:${node.options.port}:`, err);
    });

    await this.cluster.connect();
    this.redis = this.cluster; // Use cluster as primary redis instance
  }

  // Get cluster nodes from environment
  getClusterNodes() {
    const clusterConfig = process.env.REDIS_CLUSTER_NODES;
    if (!clusterConfig) {
      throw new Error('REDIS_CLUSTER_NODES not configured');
    }

    return clusterConfig.split(',').map(node => {
      const [host, port] = node.trim().split(':');
      return {
        host: host || '',
        port: parseInt(port) || 6379
      };
    });
  }

  // Test Redis connection
  async testConnection() {
    try {
      const testKey = 'test:connection';
      const testValue = Date.now().toString();
      
      await this.redis.set(testKey, testValue, 'EX', 10);
      const retrieved = await this.redis.get(testKey);
      
      if (retrieved === testValue) {
        console.log('✅ Redis connection test passed');
        await this.redis.del(testKey);
        return true;
      } else {
        throw new Error('Redis connection test failed');
      }
    } catch (error) {
      throw new Error(`Redis connection test failed: ${error.message}`);
    }
  }

  // Setup performance monitoring
  setupMonitoring() {
    // Monitor memory usage every 30 seconds
    setInterval(async () => {
      if (this.isConnected) {
        try {
          const info = await this.redis.info('memory');
          const memoryUsage = this.parseMemoryInfo(info);
          
          console.log(`📊 Redis Memory: ${memoryUsage.used}MB, Keys: ${memoryUsage.keys}`);
          
          // Alert if memory usage is high
          if (memoryUsage.used > 1000) { // 1GB
            console.warn('⚠️ Redis memory usage is high:', memoryUsage.used);
          }
        } catch (error) {
          console.error('❌ Error monitoring Redis:', error);
        }
      }
    }, 30000);
  }

  // Parse Redis memory info
  parseMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memory = {};
    
    lines.forEach(line => {
      if (line.includes('used_memory_human:')) {
        memory.used = line.split(':')[1].trim();
      }
      if (line.includes('db0:')) {
        const keys = line.split(':')[1].split(',')[0].split('=')[1];
        memory.keys = parseInt(keys) || 0;
      }
    });
    
    return memory;
  }

  // Create mock Redis for development/fallback
  createMockRedis() {
    const mockCache = new Map();
    
    this.redis = {
      get: async (key) => mockCache.get(key) || null,
      set: async (key, value, ...args) => {
        mockCache.set(key, value);
        return 'OK';
      },
      setex: async (key, ttl, value) => {
        mockCache.set(key, value);
        setTimeout(() => mockCache.delete(key), ttl * 1000);
        return 'OK';
      },
      del: async (key) => {
        mockCache.delete(key);
        return 1;
      },
      exists: async (key) => mockCache.has(key) ? 1 : 0,
      expire: async (key, ttl) => {
        setTimeout(() => mockCache.delete(key), ttl * 1000);
        return 1;
      },
      sadd: async (key, ...members) => {
        const set = mockCache.get(key) || new Set();
        let added = 0;
        members.forEach(member => {
          if (!set.has(member)) {
            set.add(member);
            added++;
          }
        });
        mockCache.set(key, set);
        return added;
      },
      srem: async (key, ...members) => {
        const set = mockCache.get(key) || new Set();
        let removed = 0;
        members.forEach(member => {
          if (set.has(member)) {
            set.delete(member);
            removed++;
          }
        });
        mockCache.set(key, set);
        return removed;
      },
      sismember: async (key, member) => {
        const set = mockCache.get(key) || new Set();
        return set.has(member) ? 1 : 0;
      },
      smembers: async (key) => {
        const set = mockCache.get(key) || new Set();
        return Array.from(set);
      },
      scard: async (key) => {
        const set = mockCache.get(key) || new Set();
        return set.size;
      },
      incr: async (key) => {
        const value = (mockCache.get(key) || 0) + 1;
        mockCache.set(key, value);
        return value;
      },
      decr: async (key) => {
        const value = (mockCache.get(key) || 0) - 1;
        mockCache.set(key, value);
        return value;
      },
      hset: async (key, field, value) => {
        const hash = mockCache.get(key) || {};
        hash[field] = value;
        mockCache.set(key, hash);
        return 1;
      },
      hget: async (key, field) => {
        const hash = mockCache.get(key) || {};
        return hash[field] || null;
      },
      hgetall: async (key) => {
        return mockCache.get(key) || {};
      },
      hdel: async (key, ...fields) => {
        const hash = mockCache.get(key) || {};
        let deleted = 0;
        fields.forEach(field => {
          if (hash[field]) {
            delete hash[field];
            deleted++;
          }
        });
        mockCache.set(key, hash);
        return deleted;
      },
      bitfield: async (key, ...operations) => {
        // Simplified bitfield implementation
        const bits = mockCache.get(key) || new Array(1000).fill(0);
        let result = [];
        
        operations.forEach(op => {
          if (op.includes('SET')) {
            const match = op.match(/SET (\d+) (\d+) (\d+)/);
            if (match) {
              const [, offset, bitsize, value] = match;
              bits[parseInt(offset)] = parseInt(value);
              result.push(parseInt(value));
            }
          } else if (op.includes('GET')) {
            const match = op.match(/GET (\d+) (\d+)/);
            if (match) {
              const [, offset, bitsize] = match;
              result.push(bits[parseInt(offset)] || 0);
            }
          }
        });
        
        mockCache.set(key, bits);
        return result;
      },
      pipeline: () => ({
        exec: async () => []
      }),
      multi: () => ({
        exec: async () => []
      })
    };
    
    console.log('🔄 Using mock Redis (development mode)');
    this.isConnected = true;
  }

  // Get Redis instance
  getClient() {
    return this.redis;
  }

  // Check if connected
  isReady() {
    return this.isConnected && this.redis;
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isReady()) {
        return { status: 'disconnected', error: 'Redis not connected' };
      }

      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      const info = await this.redis.info('memory');
      const memory = this.parseMemoryInfo(info);

      return {
        status: 'connected',
        latency,
        memory: memory.used,
        keys: memory.keys,
        uptime: await this.redis.info('server').then(info => {
          const match = info.match(/uptime_in_seconds:(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down Redis connection...');
    
    if (this.cluster) {
      await this.cluster.disconnect();
    } else if (this.redis) {
      await this.redis.quit();
    }
    
    this.isConnected = false;
    console.log('✅ Redis connection closed');
  }
}

// Singleton instance
const redisClusterService = new RedisClusterService();

module.exports = redisClusterService;
