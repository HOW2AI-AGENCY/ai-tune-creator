/**
 * Database-Backed Rate Limiter for AI Services Edge Functions
 * Provides persistent rate limiting across function restarts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

  /**
   * Get Supabase client for database operations
   */
  private static getSupabaseClient() {
    return createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

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

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
      const supabase = this.getSupabaseClient();

      // Use RPC function for atomic rate limit checking
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_user_id: userId,
        p_service: service,
        p_window_start: windowStart.toISOString(),
        p_max_requests: config.maxRequests,
        p_window_ms: config.windowMs
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // Fail open - allow request if DB check fails
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime: new Date(now.getTime() + config.windowMs)
        };
      }

      const result = data as { allowed: boolean; count: number; reset_time: string };
      
      return {
        allowed: result.allowed,
        remaining: Math.max(0, config.maxRequests - result.count),
        resetTime: new Date(result.reset_time),
        retryAfter: result.allowed ? undefined : 
          Math.ceil((new Date(result.reset_time).getTime() - now.getTime()) / 1000)
      };

    } catch (dbError) {
      console.error('Database rate limiter error:', dbError);
      // Fail open on database errors
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now.getTime() + config.windowMs)
      };
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  static async getStatus(
    userId: string,
    service: keyof typeof this.DEFAULT_CONFIGS
  ): Promise<RateLimitResult> {
    const config = this.DEFAULT_CONFIGS[service];
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
      const supabase = this.getSupabaseClient();

      const { data, error } = await supabase.rpc('get_rate_limit_status', {
        p_user_id: userId,
        p_service: service,
        p_window_start: windowStart.toISOString()
      });

      if (error) {
        console.error('Rate limit status error:', error);
        return {
          allowed: true,
          remaining: config.maxRequests,
          resetTime: new Date(now.getTime() + config.windowMs)
        };
      }

      const result = data as { count: number; oldest_request: string };
      const remaining = Math.max(0, config.maxRequests - result.count);
      const allowed = remaining > 0;
      
      // Calculate reset time based on oldest request in window
      const resetTime = result.oldest_request ? 
        new Date(new Date(result.oldest_request).getTime() + config.windowMs) :
        new Date(now.getTime() + config.windowMs);

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter: allowed ? undefined : 
          Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
      };

    } catch (dbError) {
      console.error('Database rate limiter status error:', dbError);
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: new Date(now.getTime() + config.windowMs)
      };
    }
  }

  /**
   * Clean up old rate limit records
   */
  static async cleanup(): Promise<void> {
    try {
      const supabase = this.getSupabaseClient();
      const { error } = await supabase.rpc('cleanup_rate_limits');
      if (error) {
        console.error('Rate limit cleanup error:', error);
      }
    } catch (cleanupError) {
      console.error('Rate limit cleanup exception:', cleanupError);
    }
  }

  /**
   * Reset rate limit for a user (admin function)
   */
  static async resetLimit(userId: string, service: string): Promise<void> {
    try {
      const supabase = this.getSupabaseClient();
      const { error } = await supabase.rpc('reset_rate_limit', {
        p_user_id: userId,
        p_service: service
      });

      if (error) {
        console.error('Rate limit reset error:', error);
        throw new Error('Failed to reset rate limit');
      }
    } catch (resetError) {
      console.error('Rate limit reset exception:', resetError);
      throw resetError;
    }
  }
}