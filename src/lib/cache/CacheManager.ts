/**
 * Enhanced Cache Manager with Quota Management
 * Implements LRU cache with localStorage fallback and quota handling
 */

import { quotaManager } from '../storage/quotaManager';

interface CacheItem<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxItems: number;
  maxAge: number; // milliseconds
  compressionThreshold: number; // bytes
}

export class CacheManager<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxItems: 100,
      maxAge: 30 * 60 * 1000, // 30 minutes
      compressionThreshold: 1024, // 1KB
      ...config
    };
  }

  /**
   * Store item in cache with quota management
   */
  set(key: string, value: T, ttl?: number): boolean {
    try {
      // Remove expired items first
      this.cleanup();

      // Enforce size limits
      if (this.cache.size >= this.config.maxItems) {
        this.evictLeastRecentlyUsed();
      }

      const item: CacheItem<T> = {
        value,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now()
      };

      this.cache.set(key, item);

      // Try to persist to localStorage with quota handling
      this.persistToStorage(key, item, ttl);

      return true;
    } catch (error) {
      console.warn(`[CacheManager] Failed to set cache item ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieve item from cache
   */
  get(key: string): T | null {
    // Check memory cache first
    const item = this.cache.get(key);
    if (item && !this.isExpired(item)) {
      item.accessCount++;
      item.lastAccessed = Date.now();
      return item.value;
    }

    // Fallback to localStorage
    return this.getFromStorage(key);
  }

  /**
   * Check if item exists and is valid
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    return (item && !this.isExpired(item)) || this.hasInStorage(key);
  }

  /**
   * Remove item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.removeFromStorage(key);
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    // Clear cache-related items from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Persist item to localStorage with compression
   */
  private persistToStorage(key: string, item: CacheItem<T>, ttl?: number): void {
    try {
      const storageKey = `cache_${key}`;
      const storageItem = {
        ...item,
        expires: ttl ? Date.now() + ttl : Date.now() + this.config.maxAge
      };

      let serialized = JSON.stringify(storageItem);
      
      // Use quota manager for safe storage
      quotaManager.safeSetItem(storageKey, serialized);
    } catch (error) {
      console.warn(`[CacheManager] Failed to persist ${key} to storage:`, error);
    }
  }

  /**
   * Retrieve item from localStorage
   */
  private getFromStorage(key: string): T | null {
    try {
      const storageKey = `cache_${key}`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const item = JSON.parse(stored) as CacheItem<T> & { expires: number };

      if (Date.now() > item.expires) {
        this.removeFromStorage(key);
        return null;
      }

      // Restore to memory cache
      this.cache.set(key, {
        value: item.value,
        timestamp: item.timestamp,
        accessCount: item.accessCount + 1,
        lastAccessed: Date.now()
      });

      return item.value;
    } catch (error) {
      console.warn(`[CacheManager] Failed to retrieve ${key} from storage:`, error);
      this.removeFromStorage(key);
      return null;
    }
  }

  /**
   * Check if item exists in localStorage
   */
  private hasInStorage(key: string): boolean {
    const storageKey = `cache_${key}`;
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Remove item from localStorage
   */
  private removeFromStorage(key: string): void {
    const storageKey = `cache_${key}`;
    localStorage.removeItem(storageKey);
  }

  /**
   * Check if cache item is expired
   */
  private isExpired(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp > this.config.maxAge;
  }

  /**
   * Remove expired items from memory cache
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.config.maxAge) {
        this.cache.delete(key);
        this.removeFromStorage(key);
      }
    }
  }

  /**
   * Evict least recently used items
   */
  private evictLeastRecentlyUsed(): void {
    const items = Array.from(this.cache.entries());
    items.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 20% of items
    const toRemove = Math.ceil(items.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      const [key] = items[i];
      this.cache.delete(key);
      this.removeFromStorage(key);
    }
  }
}

// Global cache instances
export const userDataCache = new CacheManager({
  maxItems: 20,
  maxAge: 10 * 60 * 1000 // 10 minutes for user data
});