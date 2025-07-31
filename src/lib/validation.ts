import { z } from "zod";

// Security: Input validation schemas
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .trim();
};

export const validateEmail = (email: string): boolean => {
  const emailSchema = z.string().email();
  return emailSchema.safeParse(email).success;
};

export const validateProjectInput = z.object({
  title: z.string().min(1).max(100).transform(sanitizeInput),
  description: z.string().max(500).optional().transform(val => val ? sanitizeInput(val) : val),
  type: z.enum(['album', 'single', 'ep']),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export const validateTrackInput = z.object({
  title: z.string().min(1).max(100).transform(sanitizeInput),
  track_number: z.number().int().positive(),
  duration: z.number().int().positive().optional(),
  lyrics: z.string().max(10000).optional().transform(val => val ? sanitizeInput(val) : val),
});

export const validateArtistInput = z.object({
  name: z.string().min(1).max(100).transform(sanitizeInput),
  description: z.string().max(500).optional().transform(val => val ? sanitizeInput(val) : val),
});

// Rate limiting helper
export const createRateLimit = (maxAttempts: number, windowMs: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (identifier: string): boolean => {
    const now = Date.now();
    const userAttempts = attempts.get(identifier);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (userAttempts.count >= maxAttempts) {
      return false;
    }
    
    userAttempts.count++;
    return true;
  };
};