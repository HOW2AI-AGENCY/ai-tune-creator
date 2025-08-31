/**
 * Simple Rate Limiter for AI Services
 * Provides basic rate limiting without database dependencies
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  service: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export class DatabaseRateLimiter {
  private static readonly DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    suno: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 5,
      service: 'suno'
    },
    mureka: {
      windowMs: 10 * 60 * 1000, // 10 minutes  
      maxRequests: 10,
      service: 'mureka'
    },
    openai: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      service: 'openai'
    }
  };

  private static requestCounts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if user can make a request and update counters
   */
  static async checkLimit(
    userId: string, 
    service: keyof typeof this.DEFAULT_CONFIGS
  ): Promise<RateLimitResult> {
    const config = this.DEFAULT_CONFIGS[service];
    if (!config) {
      throw new Error(`No rate limit config found for service: ${service}`);
    }

    const now = Date.now();
    const key = `${userId}:${service}`;
    const existing = this.requestCounts.get(key);

    // Check if window has expired
    if (!existing || now > existing.resetTime) {
      // Reset the window
      this.requestCounts.set(key, { count: 1, resetTime: now + config.windowMs });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now + config.windowMs)
      };
    }

    // Check if we're over the limit
    if (existing.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(existing.resetTime),
        retryAfter: Math.ceil((existing.resetTime - now) / 1000)
      };
    }

    // Increment the count
    existing.count++;
    this.requestCounts.set(key, existing);

    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: new Date(existing.resetTime)
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  static async getStatus(
    userId: string,
    service: keyof typeof this.DEFAULT_CONFIGS
  ): Promise<RateLimitResult> {
    const config = this.DEFAULT_CONFIGS[service];
    const now = Date.now();
    const key = `${userId}:${service}`;
    const existing = this.requestCounts.get(key);

    if (!existing || now > existing.resetTime) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: new Date(now + config.windowMs)
      };
    }

    const remaining = Math.max(0, config.maxRequests - existing.count);
    
    return {
      allowed: remaining > 0,
      remaining,
      resetTime: new Date(existing.resetTime),
      retryAfter: remaining > 0 ? undefined : Math.ceil((existing.resetTime - now) / 1000)
    };
  }

  /**
   * Clean up old rate limit records
   */
  static async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a user (admin function)
   */
  static async resetLimit(userId: string, service: string): Promise<void> {
    const key = `${userId}:${service}`;
    this.requestCounts.delete(key);
  }
}