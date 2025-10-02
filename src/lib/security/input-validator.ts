import { z } from 'zod';
import DOMPurify from 'dompurify';

/**
 * Enhanced input validation and sanitization for client-side forms
 * Prevents XSS, injection attacks, and malicious payloads
 */

// HTML tag removal - preserve text content only
export const sanitizeHTML = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

// Remove dangerous patterns from text
export const sanitizeText = (input: string): string => {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: URIs
    .trim();
};

// Validate and sanitize URLs
export const sanitizeURL = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.href;
  } catch {
    return '';
  }
};

// Validate metadata/JSONB fields
export const sanitizeMetadata = (metadata: any): any => {
  if (!metadata || typeof metadata !== 'object') return {};
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(metadata)) {
    // Sanitize keys
    const cleanKey = sanitizeText(key);
    
    // Sanitize values based on type
    if (typeof value === 'string') {
      sanitized[cleanKey] = sanitizeText(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[cleanKey] = value;
    } else if (Array.isArray(value)) {
      sanitized[cleanKey] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[cleanKey] = sanitizeMetadata(value);
    }
  }
  
  return sanitized;
};

// Schema for track creation/update
export const trackInputSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters')
    .transform(sanitizeText),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  lyrics: z.string()
    .max(10000, 'Lyrics must be less than 10,000 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  style_prompt: z.string()
    .max(1000, 'Style prompt must be less than 1,000 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  genre_tags: z.array(z.string().max(50).transform(sanitizeText))
    .optional(),
  metadata: z.any()
    .optional()
    .transform(sanitizeMetadata),
});

// Schema for artist creation/update
export const artistInputSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .transform(sanitizeText),
  bio: z.string()
    .max(1000, 'Bio must be less than 1,000 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  genre: z.string()
    .max(50, 'Genre must be less than 50 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  contact_info: z.any()
    .optional()
    .transform(sanitizeMetadata),
  social_links: z.any()
    .optional()
    .transform(sanitizeMetadata),
  metadata: z.any()
    .optional()
    .transform(sanitizeMetadata),
});

// Schema for project creation/update
export const projectInputSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters')
    .transform(sanitizeText),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  type: z.enum(['album', 'single', 'ep', 'mixtape']),
  status: z.enum(['draft', 'active', 'published', 'archived']),
  metadata: z.any()
    .optional()
    .transform(sanitizeMetadata),
});

// Schema for AI generation prompts
export const generationPromptSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(5000, 'Prompt must be less than 5,000 characters')
    .transform(sanitizeText),
  style: z.string()
    .max(500, 'Style must be less than 500 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  lyrics: z.string()
    .max(10000, 'Lyrics must be less than 10,000 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  parameters: z.any()
    .optional()
    .transform(sanitizeMetadata),
});

// Schema for profile updates
export const profileInputSchema = z.object({
  display_name: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be less than 100 characters')
    .transform(sanitizeText),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  preferences: z.any()
    .optional()
    .transform(sanitizeMetadata),
});

// Export validation helpers
export const validateTrackInput = (data: any) => trackInputSchema.parse(data);
export const validateArtistInput = (data: any) => artistInputSchema.parse(data);
export const validateProjectInput = (data: any) => projectInputSchema.parse(data);
export const validateGenerationPrompt = (data: any) => generationPromptSchema.parse(data);
export const validateProfileInput = (data: any) => profileInputSchema.parse(data);
