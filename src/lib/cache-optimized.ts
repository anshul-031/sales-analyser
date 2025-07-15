/**
 * Client-side caching utilities to reduce redundant database queries
 * and minimize bandwidth consumption
 */

import React from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export class OptimizedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize !== undefined ? options.maxSize : 100;
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  set(key: string, data: T, ttl?: number): void {
    // Don't cache if maxSize is 0
    if (this.maxSize === 0) {
      return;
    }

    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    const validEntries = Array.from(this.cache.values()).filter(
      entry => entry.expiresAt > now
    );

    return {
      size: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: this.cache.size - validEntries.length,
      maxSize: this.maxSize,
      memoryUsage: this.getApproximateSize(),
    };
  }

  private getApproximateSize(): string {
    const sizeBytes = JSON.stringify(Array.from(this.cache.entries())).length;
    if (sizeBytes < 1024) return `${sizeBytes}B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)}KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

// Global cache instances for different data types
export const uploadsCache = new OptimizedCache<any>({
  ttl: 10 * 60 * 1000, // 10 minutes for uploads list
  maxSize: 50,
});

export const analysisCache = new OptimizedCache<any>({
  ttl: 30 * 60 * 1000, // 30 minutes for analysis results
  maxSize: 100,
});

export const analyticsCache = new OptimizedCache<any>({
  ttl: 15 * 60 * 1000, // 15 minutes for analytics
  maxSize: 10,
});

// API wrapper with caching
export class OptimizedApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch uploads with caching and pagination
   */
  async getUploads(page = 1, limit = 20, search?: string, forceRefresh = false) {
    const cacheKey = `uploads_${page}_${limit}_${search || 'all'}`;
    
    if (!forceRefresh && uploadsCache.has(cacheKey)) {
      console.log('[OptimizedApiClient] Cache hit for uploads:', cacheKey);
      return uploadsCache.get(cacheKey);
    }

    console.log('[OptimizedApiClient] Cache miss, fetching uploads:', cacheKey);
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    const response = await fetch(`${this.baseUrl}/api/uploads-optimized?${params}`);
    const data = await response.json();

    if (data.success) {
      uploadsCache.set(cacheKey, data);
    }

    return data;
  }

  /**
   * Fetch analysis with selective content loading and caching
   */
  async getAnalysis(analysisId: string, include = 'summary', forceRefresh = false) {
    const cacheKey = `analysis_${analysisId}_${include}`;
    
    if (!forceRefresh && analysisCache.has(cacheKey)) {
      console.log('[OptimizedApiClient] Cache hit for analysis:', cacheKey);
      return analysisCache.get(cacheKey);
    }

    console.log('[OptimizedApiClient] Cache miss, fetching analysis:', cacheKey);
    
    const response = await fetch(`${this.baseUrl}/api/analysis-optimized/${analysisId}?include=${include}`);
    const data = await response.json();

    if (data.success) {
      // Cache with different TTL based on content type
      const ttl = include === 'summary' ? 30 * 60 * 1000 : 60 * 60 * 1000; // Summary: 30min, Full: 1hour
      analysisCache.set(cacheKey, data, ttl);
    }

    return data;
  }

  /**
   * Fetch analytics with caching
   */
  async getAnalytics(includeActivity = false, forceRefresh = false) {
    const cacheKey = `analytics_${includeActivity}`;
    
    if (!forceRefresh && analyticsCache.has(cacheKey)) {
      console.log('[OptimizedApiClient] Cache hit for analytics:', cacheKey);
      return analyticsCache.get(cacheKey);
    }

    console.log('[OptimizedApiClient] Cache miss, fetching analytics:', cacheKey);
    
    const params = new URLSearchParams();
    if (includeActivity) {
      params.append('includeActivity', 'true');
    }

    const response = await fetch(`${this.baseUrl}/api/analytics-optimized?${params}`);
    const data = await response.json();

    if (data.success) {
      analyticsCache.set(cacheKey, data);
    }

    return data;
  }

  /**
   * Invalidate cache entries for a specific resource
   */
  invalidateCache(resource: 'uploads' | 'analysis' | 'analytics', identifier?: string) {
    switch (resource) {
      case 'uploads':
        // Clear all upload-related cache entries
        uploadsCache.clear();
        console.log('[OptimizedApiClient] Cleared uploads cache');
        break;
        
      case 'analysis':
        if (identifier) {
          // Clear specific analysis cache entries
          for (const include of ['summary', 'result', 'transcription', 'all']) {
            analysisCache.delete(`analysis_${identifier}_${include}`);
          }
          console.log('[OptimizedApiClient] Cleared analysis cache for:', identifier);
        } else {
          analysisCache.clear();
          console.log('[OptimizedApiClient] Cleared all analysis cache');
        }
        break;
        
      case 'analytics':
        analyticsCache.clear();
        console.log('[OptimizedApiClient] Cleared analytics cache');
        break;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      uploads: uploadsCache.getStats(),
      analysis: analysisCache.getStats(),
      analytics: analyticsCache.getStats(),
    };
  }

  /**
   * Preload commonly accessed data
   */
  async preloadData(userId: string) {
    try {
      console.log('[OptimizedApiClient] Preloading data for user:', userId);
      
      // Preload first page of uploads
      await this.getUploads(1, 20);
      
      // Preload analytics
      await this.getAnalytics(false);
      
      console.log('[OptimizedApiClient] Data preloading completed');
    } catch (error) {
      console.error('[OptimizedApiClient] Error preloading data:', error);
    }
  }
}

// Export a singleton instance
export const optimizedApiClient = new OptimizedApiClient();

// React hook for cache management
export function useCacheStats() {
  const [stats, setStats] = React.useState(optimizedApiClient.getCacheStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(optimizedApiClient.getCacheStats());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return stats;
}

// Utility to clear all caches
export function clearAllCaches() {
  uploadsCache.clear();
  analysisCache.clear();
  analyticsCache.clear();
  console.log('[OptimizedApiClient] Cleared all caches');
}

export default OptimizedApiClient;
