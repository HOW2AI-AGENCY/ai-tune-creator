/**
 * Performance Optimizer - централизованная система оптимизации
 * Управляет кешированием, debouncing и мемоизацией
 */

interface OptimizationConfig {
  enableCache: boolean;
  enableDebounce: boolean;
  cacheSize: number;
  debounceDelay: number;
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private config: OptimizationConfig;

  private constructor() {
    this.config = {
      enableCache: true,
      enableDebounce: true,
      cacheSize: 1000,
      debounceDelay: 300
    };
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Мемоизация с TTL
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl: number = 5 * 60 * 1000 // 5 минут по умолчанию
  ): T {
    return ((...args: Parameters<T>) => {
      if (!this.config.enableCache) return fn(...args);

      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      const cached = this.cache.get(key);
      const now = Date.now();

      if (cached && now - cached.timestamp < cached.ttl) {
        return cached.value;
      }

      const result = fn(...args);
      
      // Очистка кеша при превышении лимита
      if (this.cache.size >= this.config.cacheSize) {
        const oldest = Array.from(this.cache.entries())
          .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
        this.cache.delete(oldest[0]);
      }

      this.cache.set(key, { value: result, timestamp: now, ttl });
      return result;
    }) as T;
  }

  // Debounce с автоматической очисткой
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay?: number,
    key?: string
  ): T {
    const actualDelay = delay !== undefined ? delay : this.config.debounceDelay;
    const debounceKey = key !== undefined ? key : (fn.name || 'anonymous');

    return ((...args: Parameters<T>) => {
      if (!this.config.enableDebounce) return fn(...args);

      const timer = this.debounceTimers.get(debounceKey);
      if (timer) clearTimeout(timer);

      const newTimer = setTimeout(() => {
        fn(...args);
        this.debounceTimers.delete(debounceKey);
      }, actualDelay);

      this.debounceTimers.set(debounceKey, newTimer);
    }) as T;
  }

  // Throttle для тяжелых операций
  throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number = 1000
  ): T {
    let inThrottle = false;
    
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  }

  // Очистка кеша
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Статистика производительности
  getStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.config.cacheSize,
      activeDebounceTimers: this.debounceTimers.size,
      config: this.config
    };
  }

  // Принудительная очистка просроченного кеша
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Утилиты для быстрого использования
export const memoize = performanceOptimizer.memoize.bind(performanceOptimizer);
export const debounce = performanceOptimizer.debounce.bind(performanceOptimizer);
export const throttle = performanceOptimizer.throttle.bind(performanceOptimizer);