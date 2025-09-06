import { supabase } from '@/integrations/supabase/client';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  current: number;
  limit: number;
}

/**
 * Database-backed rate limiter for enhanced security
 * Replaces in-memory rate limiting with persistent storage
 */
export class SecureRateLimiter {
  static async checkLimit(
    identifier: string,
    operation: string,
    maxRequests: number,
    windowMinutes: number = 60
  ): Promise<RateLimitResult> {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_operation: operation,
        p_max_requests: maxRequests,
        p_window_minutes: windowMinutes
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        // Fail open with conservative defaults for service availability
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetTime: Date.now() + (windowMinutes * 60 * 1000),
          current: 1,
          limit: maxRequests
        };
      }

      return data as unknown as RateLimitResult;
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open with conservative defaults
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: Date.now() + (windowMinutes * 60 * 1000),
        current: 1,
        limit: maxRequests
      };
    }
  }

  static async checkUserLimit(
    userId: string,
    operation: string,
    maxRequests: number = 100,
    windowMinutes: number = 60
  ): Promise<RateLimitResult> {
    return this.checkLimit(`user:${userId}`, operation, maxRequests, windowMinutes);
  }

  static async checkIPLimit(
    ipAddress: string,
    operation: string,
    maxRequests: number = 1000,
    windowMinutes: number = 60
  ): Promise<RateLimitResult> {
    return this.checkLimit(`ip:${ipAddress}`, operation, maxRequests, windowMinutes);
  }
}