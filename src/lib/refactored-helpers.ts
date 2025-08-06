// Enhanced utility functions for better performance and maintainability

import { z } from "zod";

// Enhanced input sanitization with more security checks
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/data:/gi, '') // Remove data: protocols
    .replace(/vbscript:/gi, '') // Remove vbscript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, '') // Remove script tags
    .trim()
    .substring(0, 10000); // Limit length
};

// Enhanced email validation with domain checking
export const validateEmail = (email: string): boolean => {
  const emailSchema = z.string()
    .email()
    .min(5)
    .max(100)
    .refine(email => !email.includes('..'), 'Invalid email format')
    .refine(email => email.split('@')[1]?.length > 1, 'Invalid domain');
  
  return emailSchema.safeParse(email).success;
};

// Enhanced validation schemas with better security
export const validateProjectInput = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(100, "Title too long")
    .transform(sanitizeInput),
  description: z.string()
    .max(1000, "Description too long")
    .optional()
    .transform(val => val ? sanitizeInput(val) : val),
  type: z.enum(['album', 'single', 'ep']),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  genre: z.string().max(50).optional().transform(val => val ? sanitizeInput(val) : val),
  release_date: z.string().datetime().optional(),
});

export const validateTrackInput = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(100, "Title too long")
    .transform(sanitizeInput),
  track_number: z.number().int().positive().max(999),
  duration: z.number().int().positive().max(86400).optional(), // Max 24 hours
  lyrics: z.string()
    .max(50000, "Lyrics too long")
    .optional()
    .transform(val => val ? sanitizeInput(val) : val),
  genre: z.string().max(50).optional().transform(val => val ? sanitizeInput(val) : val),
  bpm: z.number().int().min(1).max(300).optional(),
});

export const validateArtistInput = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .transform(sanitizeInput),
  description: z.string()
    .max(2000, "Description too long")
    .optional()
    .transform(val => val ? sanitizeInput(val) : val),
  genre: z.string().max(100).optional().transform(val => val ? sanitizeInput(val) : val),
  website: z.string().url().optional(),
  social_links: z.record(z.string().url()).optional(),
});

// Enhanced rate limiting with exponential backoff
export const createAdvancedRateLimit = (
  maxAttempts: number, 
  windowMs: number,
  backoffMultiplier: number = 2
) => {
  const attempts = new Map<string, { 
    count: number; 
    resetTime: number; 
    backoffLevel: number;
  }>();
  
  return (identifier: string): { allowed: boolean; retryAfter?: number } => {
    const now = Date.now();
    const userAttempts = attempts.get(identifier);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(identifier, { 
        count: 1, 
        resetTime: now + windowMs,
        backoffLevel: 0
      });
      return { allowed: true };
    }
    
    if (userAttempts.count >= maxAttempts) {
      const backoffTime = windowMs * Math.pow(backoffMultiplier, userAttempts.backoffLevel);
      userAttempts.backoffLevel = Math.min(userAttempts.backoffLevel + 1, 5); // Max 5 levels
      userAttempts.resetTime = now + backoffTime;
      
      return { 
        allowed: false, 
        retryAfter: Math.ceil(backoffTime / 1000) 
      };
    }
    
    userAttempts.count++;
    return { allowed: true };
  };
};

// Enhanced debounce for better performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate: boolean = false
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (immediate && !timeoutId) {
      func(...args);
    }

    timeoutId = setTimeout(() => {
      if (!immediate && lastArgs) {
        func(...lastArgs);
      }
      timeoutId = null;
      lastArgs = null;
    }, delay);
  };
};

// Enhanced throttle for better performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Memory usage optimization helpers
export const createLRUCache = <K, V>(maxSize: number) => {
  const cache = new Map<K, V>();
  
  return {
    get: (key: K): V | undefined => {
      if (cache.has(key)) {
        const value = cache.get(key)!;
        cache.delete(key);
        cache.set(key, value); // Move to end
        return value;
      }
      return undefined;
    },
    
    set: (key: K, value: V): void => {
      if (cache.has(key)) {
        cache.delete(key);
      } else if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, value);
    },
    
    clear: (): void => cache.clear(),
    size: (): number => cache.size
  };
};

// Performance monitoring helpers
export const performanceTracker = {
  marks: new Map<string, number>(),
  
  start: (name: string): void => {
    performanceTracker.marks.set(name, performance.now());
  },
  
  end: (name: string): number => {
    const start = performanceTracker.marks.get(name);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    performanceTracker.marks.delete(name);
    
    if (duration > 100) { // Log slow operations
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
};