// Redis Caching Service for 50,000 Users
const redis = require('redis');

class RedisCacheService {
  constructor() {
    this.isEnabled = false;
    this.client = null;
    
    // Check if Redis is configured
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      console.log('⚠️ Redis not configured - running without cache (set REDIS_URL or REDIS_HOST)');
      return;
    }

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`,
        password: process.env.REDIS_PASSWORD,
        db: 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.log('⚠️ Redis connection refused - running without cache');
            return false; // Stop retrying
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
          console.log('⚠️ Redis server not available - running without cache');
        } else {
          console.log('⚠️ Redis Error - running without cache:', err.message);
        }
        this.isEnabled = false;
      });
      
      this.client.on('connect', () => {
        console.log('✅ Redis Connected');
        this.isEnabled = true;
      });

      // Try to connect
      this.client.connect().catch(err => {
        if (err.code === 'ECONNREFUSED') {
          console.log('⚠️ Redis server not available - running without cache');
        } else {
          console.log('⚠️ Redis connection failed - running without cache:', err.message);
        }
        this.isEnabled = false;
      });
    } catch (error) {
      console.log('⚠️ Redis initialization failed - running without cache:', error.message);
    }
  }

  // Helper method to handle Redis operations gracefully
  async executeRedisOperation(operation, fallbackValue = null) {
    if (!this.isEnabled || !this.client) {
      return fallbackValue;
    }
    
    try {
      return await operation();
    } catch (error) {
      console.log('⚠️ Redis operation failed:', error.message);
      return fallbackValue;
    }
  }

  // Cache user feed for 5 minutes
  async cacheUserFeed(userId, feedData) {
    return this.executeRedisOperation(async () => {
      const key = `feed:user:${userId}`;
      await this.client.setEx(key, 300, JSON.stringify(feedData));
    });
  }

  // Get cached user feed
  async getUserFeed(userId) {
    return this.executeRedisOperation(async () => {
      const key = `feed:user:${userId}`;
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    }, null);
  }

  // Cache trending content for 10 minutes
  async cacheTrending(contentType, data) {
    return this.executeRedisOperation(async () => {
      const key = `trending:${contentType}`;
      await this.client.setEx(key, 600, JSON.stringify(data));
    });
  }

  // Cache content metadata for 1 hour
  async cacheContent(contentId, data) {
    return this.executeRedisOperation(async () => {
      const key = `content:${contentId}`;
      await this.client.setEx(key, 3600, JSON.stringify(data));
    });
  }

  // Cache user profile for 30 minutes
  async cacheUserProfile(userId, profileData) {
    return this.executeRedisOperation(async () => {
      const key = `profile:${userId}`;
      await this.client.setEx(key, 1800, JSON.stringify(profileData));
    });
  }

  // Cache video URLs for 2 hours
  async cacheVideoUrl(videoId, url) {
    return this.executeRedisOperation(async () => {
      const key = `video:${videoId}`;
      await this.client.setEx(key, 7200, url);
    });
  }

  // Invalidate user cache
  async invalidateUserCache(userId) {
    return this.executeRedisOperation(async () => {
      const pattern = `*:${userId}*`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    });
  }

  // Cache analytics for performance monitoring
  async trackApiCall(endpoint, responseTime) {
    return this.executeRedisOperation(async () => {
      const key = `analytics:${endpoint}`;
      await this.client.incr(key);
      await this.client.expire(key, 3600);
      
      const timeKey = `analytics:${endpoint}:time`;
      await this.client.lPush(timeKey, responseTime.toString());
      await this.client.lTrim(timeKey, 0, 999); // Keep last 1000 calls
      await this.client.expire(timeKey, 3600);
    });
  }

  // Get cache statistics
  async getCacheStats() {
    return this.executeRedisOperation(async () => {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.isEnabled
      };
    }, { connected: false, memory: 'N/A', keyspace: 'N/A' });
  }

  // Batch operations for better performance
  async mgetMultiple(keys) {
    return this.executeRedisOperation(async () => {
      const values = await this.client.mGet(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    }, keys.map(() => null));
  }

  async msetMultiple(keyValuePairs, ttl = 3600) {
    return this.executeRedisOperation(async () => {
      const pipeline = this.client.multi();
      
      keyValuePairs.forEach(([key, value]) => {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      });
      
      return pipeline.exec();
    });
  }
}

module.exports = new RedisCacheService();
