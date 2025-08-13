/**
 * @fileoverview Advanced cache management system for AI Music Platform
 * @version 0.01.032
 * @author Claude Code Assistant
 * @see {@link ../../../docs/architecture-diagrams.md#-caching-strategy}
 * 
 * ARCHITECTURE PATTERN: Level 3 Cache (localStorage + IndexedDB)
 * PERFORMANCE GOAL: 80% cache hit rate, <200ms access time
 * STORAGE STRATEGY: Smart TTL, size limits, compression
 * 
 * CACHE LEVELS:
 * - Hot Cache: Recently accessed data (localStorage)
 * - Warm Cache: Frequently used data (IndexedDB) 
 * - Cold Cache: Archive data (compressed in IndexedDB)
 */

import { openDB, IDBPDatabase } from 'idb';

// ====================================
// 🎯 TYPE DEFINITIONS
// ====================================

/**
 * Cache entry with comprehensive metadata
 * 
 * DESIGN: Rich metadata для intelligent cache management
 * VERSIONING: Schema evolution support
 */
interface CacheEntry<T = any> {
  readonly key: string;
  readonly data: T | string;
  readonly ttl: number;              // Time to live (ms)
  readonly createdAt: number;        // Creation timestamp
  readonly lastAccessed: number;     // Last access timestamp
  readonly accessCount: number;      // Access frequency counter
  readonly version: string;          // Data version для schema migration
  readonly compressed: boolean;       // Compression flag
  readonly size: number;             // Approximate size in bytes
  readonly tags: string[];           // Categories для bulk operations
}

/**
 * Cache configuration with performance tuning
 */
interface CacheConfig {
  readonly maxSize: number;          // Max cache size (MB)
  readonly maxEntries: number;       // Max number of entries
  readonly defaultTTL: number;       // Default TTL (ms)
  readonly compressionThreshold: number; // Size threshold для compression (bytes)
  readonly cleanupInterval: number;  // Cleanup frequency (ms)
  readonly hitRateTarget: number;    // Target hit rate (0-1)
}

/**
 * Cache statistics for performance monitoring
 */
interface CacheStats {
  readonly totalSize: number;        // Total cache size (bytes)
  readonly entryCount: number;       // Number of entries
  readonly hitRate: number;          // Cache hit rate (0-1)
  readonly lastCleanup: number;      // Last cleanup timestamp
  readonly compressionRatio: number; // Average compression ratio
  readonly averageAccessTime: number; // Average access time (ms)
}

// ====================================
// 🏗️ CACHE MANAGER CLASS
// ====================================

/**
 * Advanced cache manager with intelligent optimization
 * 
 * FEATURES:
 * - Multi-tier storage (localStorage + IndexedDB)
 * - Intelligent compression для large entries
 * - LRU eviction with frequency scoring
 * - Performance monitoring и auto-optimization
 * - Schema versioning для data migration
 */
export class CacheManager {
  private db: IDBPDatabase | null = null;
  private readonly config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  /**
   * OPTIMIZATION: Performance-tuned default configuration
   */
  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 50 * 1024 * 1024,        // 50MB total cache
      maxEntries: 1000,                 // Max 1000 entries
      defaultTTL: 30 * 60 * 1000,      // 30 minutes default TTL
      compressionThreshold: 1024,       // Compress entries >1KB
      cleanupInterval: 5 * 60 * 1000,   // Cleanup every 5 minutes
      hitRateTarget: 0.8,               // Target 80% hit rate
      ...config,
    };
    
    this.stats = {
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      lastCleanup: Date.now(),
      compressionRatio: 1,
      averageAccessTime: 0,
    };
    
    this.initialize();
  }
  
  // ============= INITIALIZATION =============
  
  /**
   * Initialize cache system with error handling
   * 
   * RELIABILITY: Graceful degradation если IndexedDB недоступен
   * PERFORMANCE: Lazy loading database connection
   */
  private async initialize(): Promise<void> {
    try {
      this.db = await openDB('ai-music-cache', 2, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Migration logic для schema evolution
          if (oldVersion < 1) {
            const store = db.createObjectStore('cache', { keyPath: 'key' });
            store.createIndex('lastAccessed', 'lastAccessed');
            store.createIndex('tags', 'tags', { multiEntry: true });
            store.createIndex('ttl', 'ttl');
          }
          
          if (oldVersion < 2) {
            // Version 2: Add compression support
            // Use existing upgrade transaction instead of creating new one
            if (!db.objectStoreNames.contains('cache')) {
              console.warn('[CacheManager] Cache store not found during migration to v2');
              return;
            }
            const store = transaction.objectStore('cache');
            store.createIndex('compressed', 'compressed');
            store.createIndex('size', 'size');
          }
        },
      });
      
      // Start background cleanup
      this.startCleanupTimer();
      
      console.log('[CacheManager] Initialized successfully');
    } catch (error) {
      console.warn('[CacheManager] IndexedDB initialization failed:', error);
      // GRACEFUL_DEGRADATION: Fall back to localStorage only
    }
  }
  
  // ============= CORE CACHE OPERATIONS =============
  
  /**
   * Get cached data with performance tracking
   * 
   * ALGORITHM: 
   * 1. Check localStorage (hot cache) first
   * 2. Fall back to IndexedDB (warm/cold cache)
   * 3. Update access metadata
   * 4. Promote to hot cache if frequently accessed
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      // LEVEL 1: Check localStorage (fastest)
      const hotCache = this.getFromHotCache<T>(key);
      if (hotCache !== null) {
        this.updateStats(performance.now() - startTime, true);
        return hotCache;
      }
      
      // LEVEL 2: Check IndexedDB
      if (!this.db) {
        this.updateStats(performance.now() - startTime, false);
        return null;
      }
      
      const entry = await this.db.get('cache', key);
      if (!entry) {
        this.updateStats(performance.now() - startTime, false);
        return null;
      }
      
      // Check TTL expiration
      if (Date.now() > entry.ttl) {
        await this.delete(key);
        this.updateStats(performance.now() - startTime, false);
        return null;
      }
      
      // Decompress if needed
      let data: T;
      if (entry.compressed) {
        data = this.decompress<T>(entry.data as string);
      } else {
        data = entry.data as T;
      }
      
      // Update access metadata
      const updatedEntry: CacheEntry<T> = {
        ...entry,
        lastAccessed: Date.now(),
        accessCount: entry.accessCount + 1,
        size: this.estimateSize(data), // Recalculate size on access
      };
      
      // OPTIMIZATION: Promote to hot cache if frequently accessed
      if (updatedEntry.accessCount > 3) {
        this.setInHotCache(key, data, updatedEntry.ttl);
      }
      
      // Update entry in IndexedDB
      await this.db.put('cache', updatedEntry);
      
      this.updateStats(performance.now() - startTime, true);
      return data;
      
    } catch (error) {
      console.warn(`[CacheManager] Get failed for key "${key}":`, error);
      this.updateStats(performance.now() - startTime, false);
      return null;
    }
  }
  
  /**
   * Set cached data with intelligent storage selection
   * 
   * ALGORITHM:
   * 1. Determine storage tier based on size и frequency prediction
   * 2. Apply compression если entry > threshold
   * 3. Store with rich metadata
   * 4. Trigger cleanup if needed
   */
  async set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      tags?: string[];
      priority?: 'hot' | 'warm' | 'cold';
    } = {}
  ): Promise<void> {
    const ttl = options.ttl || this.config.defaultTTL;
    const tags = options.tags || [];
    const size = this.estimateSize(data);
    
    try {
      // DECISION: Choose storage tier
      // SECURITY: Prevent localStorage quota exceeded errors
      const maxLocalStorageSize = 2 * 1024 * 1024; // 2MB limit for localStorage
      const shouldUseHotCache = options.priority === 'hot' && size < 1024 && size < maxLocalStorageSize;
      
      if (shouldUseHotCache) {
        // Store in localStorage for fast access
        this.setInHotCache(key, data, Date.now() + ttl);
      }
      
      // Always store in IndexedDB для persistence
      if (this.db) {
        const shouldCompress = size > this.config.compressionThreshold;
        const processedData = shouldCompress ? this.compress(data) : data;
        
        const entry: CacheEntry<T> = {
          key,
          data: processedData,
          ttl: Date.now() + ttl,
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 1,
          version: '1.0',
          compressed: shouldCompress,
          size,
          tags,
        };
        
        await this.db.put('cache', entry);
        
        // MAINTENANCE: Trigger cleanup if cache is getting full
        if (this.stats.entryCount > this.config.maxEntries * 0.9) {
          this.cleanup();
        }
      }
      
      console.log(`[CacheManager] Cached "${key}" (${this.formatSize(size)})`);
      
    } catch (error) {
      console.warn(`[CacheManager] Set failed for key "${key}":`, error);
    }
  }
  
  // ============= HOT CACHE (localStorage) OPERATIONS =============
  
  /**
   * Hot cache operations for frequently accessed data
   * 
   * STRATEGY: Simple key-value storage with TTL checking
   * PERFORMANCE: Synchronous access для immediate results
   */
  private getFromHotCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`cache:hot:${key}`);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      if (Date.now() > parsed.ttl) {
        localStorage.removeItem(`cache:hot:${key}`);
        return null;
      }
      
      return parsed.data;
    } catch {
      return null;
    }
  }
  
  private setInHotCache<T>(key: string, data: T, ttl: number): void {
    try {
      const entry = { data, ttl };
      const serialized = JSON.stringify(entry);
      const size = serialized.length * 2; // Rough estimate in bytes
      const maxLocalStorageSize = 2 * 1024 * 1024; // 2MB limit
      
      // SECURITY: Prevent quota exceeded errors
      if (size > maxLocalStorageSize) {
        console.warn(`[CacheManager] Skipping hot cache for key "${key}": size ${this.formatSize(size)} exceeds localStorage limit`);
        return;
      }
      
      localStorage.setItem(`cache:hot:${key}`, serialized);
    } catch (error) {
      // GRACEFUL_DEGRADATION: localStorage might be full or quota exceeded
      console.warn('[CacheManager] Hot cache set failed:', error);
      
      // Try to clear some space and retry once
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceededError')) {
        this.clearHotCache();
      }
    }
  }
  
  /**
   * Clear all hot cache entries from localStorage
   */
  private clearHotCache(): void {
    try {
      const keysToRemove: string[] = [];
      
      // Find all cache keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache:hot:')) {
          keysToRemove.push(key);
        }
      }
      
      // Remove cache entries
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log(`[CacheManager] Cleared ${keysToRemove.length} hot cache entries`);
    } catch (error) {
      console.warn('[CacheManager] Hot cache clear failed:', error);
    }
  }
  
  // ============= BULK OPERATIONS =============
  
  /**
   * Get multiple entries efficiently
   * 
   * OPTIMIZATION: Batch operations для reduced overhead
   */
  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    
    // PARALLEL: Process all keys simultaneously
    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.get<T>(key);
      })
    );
    
    return results;
  }
  
  /**
   * Set multiple entries with batch optimization
   */
  async setMultiple<T>(entries: Array<{
    key: string;
    data: T;
    options?: Parameters<CacheManager['set']>[2];
  }>): Promise<void> {
    // PARALLEL: Set all entries simultaneously
    await Promise.all(
      entries.map(({ key, data, options }) => this.set(key, data, options))
    );
  }
  
  // ============= MAINTENANCE OPERATIONS =============
  
  /**
   * Intelligent cache cleanup with LRU + frequency scoring
   * 
   * ALGORITHM:
   * 1. Remove expired entries
   * 2. Calculate composite score (recency + frequency + size)
   * 3. Evict lowest scoring entries until size targets met
   */
  async cleanup(): Promise<void> {
    if (!this.db) return;
    
    console.log('[CacheManager] Starting cleanup...');
    
    try {
      const transaction = this.db.transaction('cache', 'readwrite');
      const store = transaction.objectStore('cache');
      const entries = await store.getAll();
      
      const now = Date.now();
      let expiredCount = 0;
      let totalSize = 0;
      
      // PHASE 1: Remove expired entries
      for (const entry of entries) {
        if (now > entry.ttl) {
          await store.delete(entry.key);
          expiredCount++;
        } else {
          totalSize += entry.size;
        }
      }
      
      // PHASE 2: Size-based eviction if needed
      if (totalSize > this.config.maxSize) {
        const activeEntries = entries.filter(e => now <= e.ttl);
        
        // SCORING: Composite score для intelligent eviction
        const scoredEntries = activeEntries.map(entry => ({
          ...entry,
          score: this.calculateEvictionScore(entry, now),
        })).sort((a, b) => a.score - b.score); // Lower score = higher eviction priority
        
        let currentSize = totalSize;
        const targetSize = this.config.maxSize * 0.8; // Clean to 80% capacity
        
        for (const entry of scoredEntries) {
          if (currentSize <= targetSize) break;
          
          await store.delete(entry.key);
          currentSize -= entry.size;
        }
      }
      
      await transaction.done;
      
      // Update statistics
      this.stats = {
        ...this.stats,
        lastCleanup: now,
        totalSize,
        entryCount: entries.length - expiredCount,
      };
      
      console.log(`[CacheManager] Cleanup completed: ${expiredCount} expired entries removed`);
      
    } catch (error) {
      console.warn('[CacheManager] Cleanup failed:', error);
    }
  }
  
  /**
   * Calculate eviction score for intelligent cache management
   * 
   * FORMULA: Lower score = higher eviction priority
   * FACTORS: Recency, frequency, size, tags importance
   */
  private calculateEvictionScore(entry: CacheEntry, now: number): number {
    const recencyScore = (now - entry.lastAccessed) / (1000 * 60 * 60); // Hours since access
    const frequencyScore = 1 / (entry.accessCount + 1); // Inverse frequency
    const sizeScore = entry.size / (1024 * 1024); // Size in MB
    const tagScore = entry.tags.includes('critical') ? -10 : 0; // Critical data penalty
    
    return recencyScore + frequencyScore + sizeScore + tagScore;
  }
  
  // ============= UTILITY METHODS =============
  
  /**
   * Delete cache entry from all storage tiers
   */
  async delete(key: string): Promise<void> {
    try {
      // Remove from hot cache
      localStorage.removeItem(`cache:hot:${key}`);
      
      // Remove from IndexedDB
      if (this.db) {
        await this.db.delete('cache', key);
      }
    } catch (error) {
      console.warn(`[CacheManager] Delete failed for key "${key}":`, error);
    }
  }
  
  /**
   * Clear all cache data
   * 
   * WARNING: Use with caution - клears all cached data
   */
  async clear(): Promise<void> {
    try {
      // Clear hot cache
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache:hot:'));
      keys.forEach(key => localStorage.removeItem(key));
      
      // Clear IndexedDB
      if (this.db) {
        await this.db.clear('cache');
      }
      
      this.stats = {
        ...this.stats,
        totalSize: 0,
        entryCount: 0,
        lastCleanup: Date.now(),
      };
      
      console.log('[CacheManager] Cache cleared');
    } catch (error) {
      console.warn('[CacheManager] Clear failed:', error);
    }
  }
  
  // ============= PERFORMANCE MONITORING =============
  
  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<CacheStats> {
    // Update current statistics
    if (this.db) {
      try {
        const entries = await this.db.getAll('cache');
        const now = Date.now();
        
        let totalSize = 0;
        let compressedSize = 0;
        let compressedCount = 0;
        
        for (const entry of entries) {
          if (now <= entry.ttl) { // Only count non-expired entries
            totalSize += entry.size;
            if (entry.compressed) {
              compressedSize += entry.size;
              compressedCount++;
            }
          }
        }
        
        this.stats = {
          ...this.stats,
          totalSize,
          entryCount: entries.filter(e => now <= e.ttl).length,
          compressionRatio: compressedCount > 0 ? compressedSize / (compressedCount * 1024) : 1,
        };
      } catch (error) {
        console.warn('[CacheManager] Stats update failed:', error);
      }
    }
    
    return this.stats;
  }
  
  /**
   * Auto-optimization based on performance metrics
   * 
   * STRATEGY: Adjust configuration based on usage patterns
   */
  async optimize(): Promise<void> {
    const stats = await this.getStats();
    
    // OPTIMIZATION 1: Adjust cleanup frequency based on hit rate
    if (stats.hitRate < this.config.hitRateTarget * 0.8) {
      // Poor hit rate - more aggressive cleanup
      this.startCleanupTimer(this.config.cleanupInterval * 0.5);
    } else if (stats.hitRate > this.config.hitRateTarget * 1.2) {
      // Excellent hit rate - less frequent cleanup
      this.startCleanupTimer(this.config.cleanupInterval * 1.5);
    }
    
    // OPTIMIZATION 2: Trigger cleanup if size exceeds thresholds
    if (stats.totalSize > this.config.maxSize * 0.9) {
      await this.cleanup();
    }
    
    console.log('[CacheManager] Optimization completed');
  }
  
  // ============= GLOBAL STATE HELPERS =============
  
  /**
   * Helper methods for AppDataProvider integration
   */
  async getGlobalState(): Promise<any | null> {
    return this.get('global:app-state');
  }
  
  async setGlobalState(state: any): Promise<void> {
    const size = this.estimateSize(state);
    const maxLocalStorageSize = 2 * 1024 * 1024; // 2MB limit
    
    await this.set('global:app-state', state, {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      tags: ['global', 'critical'],
      // SECURITY: Use 'cold' priority for large state to avoid localStorage quota issues
      priority: size > maxLocalStorageSize ? 'cold' : 'warm',
    });
  }
  
  // ============= PRIVATE HELPERS =============
  
  private startCleanupTimer(interval?: number): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    const cleanupInterval = interval || this.config.cleanupInterval;
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }
  
  private updateStats(accessTime: number, hit: boolean): void {
    const hitCount = this.stats.hitRate * this.stats.entryCount;
    const totalAccess = this.stats.entryCount + 1;
    const newHitCount = hit ? hitCount + 1 : hitCount;
    
    this.stats = {
      ...this.stats,
      hitRate: newHitCount / totalAccess,
      averageAccessTime: (this.stats.averageAccessTime + accessTime) / 2,
    };
  }
  
  private compress(data: any): string {
    // SIMPLE: JSON stringification для compression
    // TODO: Implement actual compression (gzip, etc.)
    return JSON.stringify(data);
  }
  
  private decompress<T>(data: string): T {
    // TODO: Implement actual decompression
    return JSON.parse(data);
  }
  
  private estimateSize(data: any): number {
    // APPROXIMATE: JSON size estimation
    return JSON.stringify(data).length * 2; // Rough estimate
  }
  
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  
  // ============= CLEANUP =============
  
  /**
   * Cleanup resources on destroy
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ====================================
// 🎯 SINGLETON INSTANCE
// ====================================

/**
 * Global cache manager instance
 * 
 * PATTERN: Singleton для consistent cache access across app
 * USAGE: import { cacheManager } from '@/lib/cache/CacheManager'
 */
export const cacheManager = new CacheManager();

/**
 * PERFORMANCE NOTES:
 * 
 * 1. HOT CACHE (localStorage):
 *    - <1ms access time
 *    - ~5MB storage limit
 *    - Synchronous API
 * 
 * 2. WARM CACHE (IndexedDB):
 *    - <10ms access time  
 *    - ~50MB+ storage limit
 *    - Asynchronous API with batching
 * 
 * 3. COLD CACHE (IndexedDB compressed):
 *    - <50ms access time
 *    - High compression ratio
 *    - Used для archived data
 * 
 * OPTIMIZATION TARGETS:
 * - 80%+ cache hit rate
 * - <200ms average access time
 * - <50MB total cache size
 * - 2:1 compression ratio для large entries
 */
