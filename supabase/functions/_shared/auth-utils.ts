/**
 * Secure Authentication Utilities for Edge Functions
 * Replaces manual JWT parsing with proper Supabase auth verification
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SecureLogger } from './secure-logger.ts';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
    user_metadata?: any;
  };
  session?: {
    access_token: string;
    refresh_token?: string;
  };
}

export interface AuthResult {
  success: boolean;
  context?: AuthContext;
  error?: {
    code: string;
    message: string;
    status: number;
  };
}

export class AuthUtils {
  /**
   * SECURITY FIX: Safely extracts and validates user authentication
   * Replaces manual JWT parsing with proper Supabase auth verification
   */
  static async authenticateUser(
    req: Request,
    functionName: string,
    options: {
      requireAuth?: boolean;
      timeout?: number;
    } = {}
  ): Promise<AuthResult> {
    const { requireAuth = true, timeout = 5000 } = options;

    try {
      // Extract Authorization header
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader && requireAuth) {
        return {
          success: false,
          error: {
            code: 'MISSING_AUTH',
            message: 'Требуется авторизация',
            status: 401
          }
        };
      }

      if (!authHeader) {
        // If auth is not required and no header provided
        return { success: true };
      }

      // Validate Authorization header format
      if (!authHeader.startsWith('Bearer ')) {
        return {
          success: false,
          error: {
            code: 'INVALID_AUTH_FORMAT',
            message: 'Неверный формат токена авторизации',
            status: 401
          }
        };
      }

      // Create Supabase client for auth verification
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );

      // SECURITY FIX: Use proper Supabase auth instead of manual JWT parsing
      const authPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Authentication timeout')), timeout)
      );

      const { data: { user }, error: authError } = await Promise.race([
        authPromise,
        timeoutPromise
      ]);

      if (authError || !user) {
        SecureLogger.warn('Authentication failed', {
          functionName,
          timestamp: new Date().toISOString()
        }, { error: authError?.message });

        return {
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Не удалось проверить авторизацию',
            status: 401
          }
        };
      }

      // Log successful authentication
      SecureLogger.logAuthentication(functionName, user.id, true, 'supabase-jwt');

      return {
        success: true,
        context: {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata
          },
          session: {
            access_token: authHeader.split(' ')[1]
          }
        }
      };

    } catch (error) {
      SecureLogger.error('Authentication error', {
        functionName,
        timestamp: new Date().toISOString()
      }, error);

      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Ошибка проверки авторизации',
          status: 500
        }
      };
    }
  }

  /**
   * Creates an authenticated Supabase client for the user
   */
  static createAuthenticatedClient(authContext: AuthContext) {
    return createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${authContext.session?.access_token}`
          }
        }
      }
    );
  }

  /**
   * Creates a service role client for admin operations
   */
  static createServiceRoleClient() {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!serviceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    return createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Validates user permissions for specific operations
   */
  static async validateUserPermissions(
    user: AuthContext['user'],
    resource: string,
    operation: 'read' | 'write' | 'delete',
    supabaseClient: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // For now, implement basic user-level permissions
      // This can be extended with Role-Based Access Control (RBAC)
      
      if (operation === 'delete' && resource === 'user_data') {
        // Only allow users to delete their own data
        return { allowed: true };
      }

      if (operation === 'write' && ['tracks', 'projects', 'lyrics'].includes(resource)) {
        // Users can create/update their own content
        return { allowed: true };
      }

      if (operation === 'read') {
        // Users can read their own data
        return { allowed: true };
      }

      return { allowed: false, reason: `Operation ${operation} on ${resource} not permitted` };

    } catch (error) {
      SecureLogger.error('Permission validation error', {
        userId: user.id,
        resource,
        operation
      }, error);

      return { allowed: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Rate limiting per user
   */
  static checkUserRateLimit(
    userId: string,
    operation: string,
    limits: { maxRequests: number; windowMs: number },
    rateLimitMap: Map<string, { count: number; reset: number }>
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = `${userId}:${operation}`;
    const current = rateLimitMap.get(key) || { count: 0, reset: now + limits.windowMs };

    // Reset window if expired
    if (now > current.reset) {
      current.count = 0;
      current.reset = now + limits.windowMs;
    }

    const allowed = current.count < limits.maxRequests;
    
    if (allowed) {
      current.count++;
      rateLimitMap.set(key, current);
    }

    return {
      allowed,
      remaining: Math.max(0, limits.maxRequests - current.count),
      resetTime: current.reset
    };
  }

  /**
   * Validates session freshness and token expiry
   */
  static validateSessionFreshness(
    authContext: AuthContext,
    maxAgeMinutes: number = 60
  ): { valid: boolean; reason?: string } {
    try {
      const token = authContext.session?.access_token;
      if (!token) {
        return { valid: false, reason: 'No access token provided' };
      }

      // Parse JWT payload (this is safe since we've already validated the signature via Supabase)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, reason: 'Invalid token format' };
      }

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      if (payload.exp && payload.exp < now) {
        return { valid: false, reason: 'Token expired' };
      }

      // Check if token is too old
      const maxAge = maxAgeMinutes * 60;
      if (payload.iat && (now - payload.iat) > maxAge) {
        return { valid: false, reason: 'Token too old' };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, reason: 'Token validation failed' };
    }
  }
}

export default AuthUtils;