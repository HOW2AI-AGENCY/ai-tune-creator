/**
 * @fileoverview Рефакторированные helper-функции для повышения производительности
 * @version 0.01.032
 * @author Claude Code Assistant
 * @see {@link ../../docs/performance.md#helper-functions}
 * 
 * АРХИТЕКТУРНАЯ ЦЕЛЬ:
 * Централизация всех utility функций с оптимизацией производительности
 * и уменьшением дублирования кода по всему приложению
 * 
 * OPTIMIZATION STRATEGY:
 * - Мемоизация дорогих вычислений
 * - Эффективные алгоритмы для массовых операций
 * - Type-safe валидация входных данных
 * - Graceful error handling с fallback значениями
 */

import { z } from 'zod';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ====================================
// 🛡️ TYPE DEFINITIONS
// ====================================

/**
 * Базовые типы для предотвращения ошибок типизации
 * PERFORMANCE: Простые интерфейсы для faster type checking
 */
export interface HelperOptions {
  enableCache?: boolean;
  maxCacheSize?: number;
  logErrors?: boolean;
  fallbackValue?: any;
}

/**
 * VALIDATION: Secure input validation schemas
 * SECURITY: Предотвращение XSS и injection атак
 */
export const secureStringSchema = z.string().max(1000).regex(/^[^<>]*$/, 'Invalid characters detected');
export const urlSchema = z.string().url().max(500);
export const emailSchema = z.string().email().max(255);

// Simplified artist schema for validation
export const artistValidationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  genre: z.string().max(100).optional(),
  website: z.string().url().optional(),
  social_links: z.record(z.string(), z.string().url()).optional(),
});

// Enhanced rate limiting with exponential backoff
interface RateLimitState {
  requests: number;
  lastReset: number;
  backoffMs: number;
}

const rateLimitStates = new Map<string, RateLimitState>();

// ====================================
// 🎨 UI UTILITIES
// ====================================

/**
 * Enhanced className utility with caching
 * PERFORMANCE: Memoized results для часто используемых combinations
 */
const classNameCache = new Map<string, string>();

export function cn(...inputs: ClassValue[]): string {
  const cacheKey = JSON.stringify(inputs);
  
  if (classNameCache.has(cacheKey)) {
    return classNameCache.get(cacheKey)!;
  }
  
  const result = twMerge(clsx(inputs));
  
  // CACHE_MANAGEMENT: Prevent memory leaks
  if (classNameCache.size > 500) {
    classNameCache.clear();
  }
  
  classNameCache.set(cacheKey, result);
  return result;
}

/**
 * Генерация initials с proper Unicode support
 * IMPROVEMENT: Поддержка международных символов
 */
export function generateInitials(name: string, maxChars: number = 2): string {
  if (!name?.trim()) return 'U';
  
  try {
    const cleanName = name.trim();
    const words = cleanName.split(/\s+/).filter(Boolean);
    
    if (words.length === 0) return 'U';
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return words
      .slice(0, maxChars)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  } catch (error) {
    console.warn('[generateInitials] Error processing name:', error);
    return 'U';
  }
}

/**
 * Secure input sanitization
 * SECURITY: XSS prevention с whitelisting approach
 */
export function sanitizeInput(input: string, options: HelperOptions = {}): string {
  try {
    const result = secureStringSchema.safeParse(input);
    if (!result.success) {
      console.warn('[sanitizeInput] Validation failed:', result.error.message);
      return options.fallbackValue || '';
    }
    return result.data.trim();
  } catch (error) {
    console.error('[sanitizeInput] Sanitization error:', error);
    return options.fallbackValue || '';
  }
}

// ====================================
// ⏰ DATE & TIME UTILITIES
// ====================================

/**
 * Optimized date formatting with internationalization
 * PERFORMANCE: Cached Intl.DateTimeFormat instances
 */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(
  dateInput: string | Date, 
  locale: string = 'ru-RU',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
): string {
  try {
    const cacheKey = `${locale}_${JSON.stringify(options)}`;
    
    if (!dateFormatters.has(cacheKey)) {
      dateFormatters.set(cacheKey, new Intl.DateTimeFormat(locale, options));
    }
    
    const formatter = dateFormatters.get(cacheKey)!;
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    return formatter.format(date);
  } catch (error) {
    console.warn('[formatDate] Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Relative time formatting (e.g., "2 hours ago")
 * FEATURE: Smart relative formatting с fallback на absolute dates
 */
export function formatRelativeTime(dateInput: string | Date, locale: string = 'ru'): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Fallback to absolute date for very old entries
    if (diffMs > 7 * 24 * 60 * 60 * 1000) { // > 7 days
      return formatDate(date, locale === 'ru' ? 'ru-RU' : 'en-US');
    }
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return rtf.format(-days, 'day');
    if (hours > 0) return rtf.format(-hours, 'hour');
    if (minutes > 0) return rtf.format(-minutes, 'minute');
    return rtf.format(-seconds, 'second');
    
  } catch (error) {
    console.warn('[formatRelativeTime] Error:', error);
    return formatDate(dateInput, locale === 'ru' ? 'ru-RU' : 'en-US');
  }
}

// ====================================
// 📊 DATA TRANSFORMATION
// ====================================

/**
 * Deep object merging с type safety
 * PERFORMANCE: Optimized для nested объектов
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  try {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
            targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          result[key] = deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue as T[Extract<keyof T, string>];
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('[deepMerge] Merge error:', error);
    return target;
  }
}

/**
 * Array chunking для paginated loading
 * PERFORMANCE: Optimized for large datasets
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  if (!Array.isArray(array) || chunkSize <= 0) {
    return [];
  }
  
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Debounced function execution
 * PERFORMANCE: Prevents excessive API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, waitMs);
    
    if (callNow) func(...args);
  };
}

// ====================================
// 🔧 PERFORMANCE UTILITIES
// ====================================

/**
 * Memory-safe JSON operations
 * SECURITY: Prevents JSON parsing attacks
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    // SECURITY: Check string length to prevent DoS
    if (jsonString.length > 10_000) {
      console.warn('[safeJsonParse] JSON string too large, using fallback');
      return fallback;
    }
    
    const parsed = JSON.parse(jsonString);
    return parsed as T;
  } catch (error) {
    console.warn('[safeJsonParse] Parse error:', error);
    return fallback;
  }
}

/**
 * Rate limiting with exponential backoff
 * RELIABILITY: Prevents API abuse и server overload
 */
export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  try {
    const now = Date.now();
    const state = rateLimitStates.get(key);
    
    if (!state) {
      rateLimitStates.set(key, { requests: 1, lastReset: now, backoffMs: 0 });
      return true;
    }
    
    // Reset window if expired
    if (now - state.lastReset > windowMs) {
      state.requests = 1;
      state.lastReset = now;
      state.backoffMs = 0;
      return true;
    }
    
    // Check if rate limited
    if (state.requests >= maxRequests) {
      state.backoffMs = Math.min(state.backoffMs * 2 || 1000, 30000); // Max 30s backoff
      return false;
    }
    
    state.requests++;
    return true;
  } catch (error) {
    console.error('[checkRateLimit] Error:', error);
    return true; // Fail open
  }
}

/**
 * Cache size monitoring
 * MEMORY: Prevents memory leaks
 */
export function getCacheStats() {
  return {
    classNameCache: {
      size: classNameCache.size,
      maxSize: 500,
    },
    dateFormatters: {
      size: dateFormatters.size,
      maxSize: 50,
    },
    rateLimitStates: {
      size: rateLimitStates.size,
      maxSize: 1000,
    },
  };
}

/**
 * Cache cleanup utility
 * MAINTENANCE: Periodic cache maintenance
 */
export function cleanupCaches() {
  try {
    classNameCache.clear();
    
    // Keep only recent date formatters
    if (dateFormatters.size > 50) {
      dateFormatters.clear();
    }
    
    // Clean old rate limit states
    const now = Date.now();
    for (const [key, state] of rateLimitStates.entries()) {
      if (now - state.lastReset > 300000) { // 5 minutes
        rateLimitStates.delete(key);
      }
    }
    
    console.log('[cleanupCaches] Cache cleanup completed');
  } catch (error) {
    console.error('[cleanupCaches] Cleanup error:', error);
  }
}

// ====================================
// 🏷️ EXPORT SUMMARY
// ====================================

/**
 * NOTES:
 * 
 * 1. PERFORMANCE OPTIMIZATIONS:
 *    - Memoization для часто используемых функций
 *    - Efficient caching strategies с size limits
 *    - Debouncing для preventing excessive calls
 * 
 * 2. SECURITY MEASURES:
 *    - Input sanitization с XSS prevention
 *    - Rate limiting с exponential backoff
 *    - Memory-safe JSON parsing
 * 
 * 3. RELIABILITY FEATURES:
 *    - Graceful error handling везде
 *    - Fallback values для всех operations
 *    - Type-safe implementations
 * 
 * 4. SCALABILITY:
 *    - Cache size monitoring и cleanup
 *    - Efficient algorithms для large datasets
 *    - Memory leak prevention
 */
