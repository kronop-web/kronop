// ==================== KRONOP DATABASE SCHEMAS ====================
// Complete database schemas for User Profile, Content Analytics, and Earnings

import { Document } from 'mongodb';

// ==================== USER PROFILE SCHEMA ====================
export interface User extends Document {
  _id?: string;
  id: string; // Unique user identifier
  email: string;
  username: string;
  
  // Profile Information
  displayName: string;
  bio: string;
  avatar_url?: string; // Profile picture URL from BunnyCDN
  cover_url?: string; // Cover photo URL
  
  // Account Details
  isVerified: boolean;
  accountType: 'creator' | 'viewer' | 'business';
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  
  // Content Statistics (Auto-updated)
  contentStats: {
    totalPhotos: number;
    totalVideos: number;
    totalReels: number;
    totalLive: number;
    totalStories: number;
  };
  
  // Engagement Statistics
  engagementStats: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
  };
  
  // Wallet & Earnings
  wallet: {
    totalEarnings: number; // In cents/currency units
    currentBalance: number;
    pendingWithdrawals: number;
    totalWithdrawn: number;
    currency: string; // USD, EUR, etc.
  };
  
  // Subscription & Monetization
  monetization: {
    isMonetized: boolean;
    subscriptionPrice?: number;
    supporterCount: number;
    subscriptionTiers: {
      name: string;
      price: number;
      benefits: string[];
      subscriberCount: number;
    }[];
  };
  
  // Settings
  settings: {
    privacy: 'public' | 'friends' | 'private';
    allowComments: boolean;
    allowDownloads: boolean;
    showEarnings: boolean;
    notifications: {
      likes: boolean;
      comments: boolean;
      supporters: boolean;
      mentions: boolean;
    };
  };
  
  // Social Links
  socialLinks: {
    website?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
}

// ==================== CONTENT ANALYTICS SCHEMA ====================
export interface ContentAnalytics extends Document {
  _id?: string;
  contentId: string; // Reference to video/photo/reel
  contentType: 'photo' | 'video' | 'reel' | 'live' | 'story';
  userId: string; // Content creator
  
  // Engagement Metrics
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    downloads: number;
    saves: number;
  };
  
  // Performance Data
  performance: {
    engagementRate: number; // (likes + comments + shares) / views
    averageWatchTime?: number; // For videos/reels
    completionRate?: number; // For videos/reels
    clickThroughRate?: number; // For links in content
  };
  
  // Audience Demographics
  demographics: {
    ageGroups: Record<string, number>;
    genderSplit: Record<string, number>;
    geographicData: Record<string, number>;
  };
  
  // Time-based Analytics
  timeline: {
    date: Date;
    views: number;
    likes: number;
    comments: number;
    shares: number;
  }[];
  
  // Revenue Data
  revenue: {
    adRevenue: number;
    subscriptionRevenue: number;
    directRevenue: number;
    totalRevenue: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// ==================== CONTENT SCHEMA ====================
export interface Content extends Document {
  _id?: string;
  id: string;
  userId: string;
  
  // Basic Information
  title: string;
  description: string;
  type: 'photo' | 'video' | 'reel' | 'live' | 'story';
  
  // Media URLs (from BunnyCDN)
  urls: {
    primary: string; // Main content URL
    thumbnail?: string; // Thumbnail URL
    preview?: string; // Preview clip URL
    download?: string; // Download URL
  };
  
  // Metadata
  metadata: {
    duration?: number; // For videos/reels (in seconds)
    fileSize: number; // In bytes
    dimensions: {
      width: number;
      height: number;
    };
    format: string; // mp4, jpg, png, etc.
  };
  
  // Content Details
  category: string;
  tags: string[];
  privacy: 'public' | 'friends' | 'private';
  
  // Monetization
  monetization: {
    isMonetized: boolean;
    adBreaks?: number[]; // Timestamps for ad breaks
    subscriptionRequired: boolean;
    price?: number; // For paid content
  };
  
  // Status
  status: 'processing' | 'ready' | 'published' | 'archived' | 'deleted';
  
  // Timestamps
  createdAt: Date;
  publishedAt?: Date;
  updatedAt: Date;
  expiresAt?: Date; // For stories
  
  // Analytics Reference
  analyticsId?: string; // Reference to ContentAnalytics
}

// ==================== TRANSACTION SCHEMA ====================
export interface Transaction extends Document {
  _id?: string;
  id: string;
  userId: string;
  
  // Transaction Details
  type: 'earning' | 'withdrawal' | 'refund' | 'bonus';
  amount: number;
  currency: string;
  
  // Source Information
  source: {
    type: 'ad' | 'subscription' | 'direct' | 'system';
    contentId?: string; // If from specific content
    supporterId?: string; // If from subscription
    description: string;
  };
  
  // Status
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  
  // Processing Details
  processing: {
    initiatedAt: Date;
    completedAt?: Date;
    method?: string; // bank_transfer, paypal, crypto
    transactionId?: string; // External transaction ID
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// ==================== SEARCH INDEX SCHEMA ====================
export interface SearchIndex extends Document {
  _id?: string;
  id: string;
  type: 'user' | 'content';
  
  // Searchable Fields
  searchableText: string; // Combined text for full-text search
  fields: {
    title?: string;
    description?: string;
    username?: string;
    displayName?: string;
    tags: string[];
    category: string;
  };
  
  // Reference
  referenceId: string; // User ID or Content ID
  userId?: string; // For content items
  
  // Metadata
  metadata: {
    type: string; // user, photo, video, reel, live
    popularity: number; // Sort by popularity
    createdAt: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// ==================== COLLECTION NAMES ====================
export const COLLECTIONS = {
  USERS: 'users',
  CONTENT: 'content',
  ANALYTICS: 'content_analytics',
  TRANSACTIONS: 'transactions',
  SEARCH_INDEX: 'search_index',
  USER_SUPPORTS: 'user_supports'
} as const;

export default {
  COLLECTIONS
};
