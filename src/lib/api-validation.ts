import { z } from 'zod';

// Edge function name validation
export const VALID_EDGE_FUNCTIONS = {
  SUNO: {
    GENERATE: 'generate-suno-track',
    STATUS: 'get-suno-record-info',
    EXTEND: 'extend-suno-track',
    LYRICS: 'generate-suno-lyrics',
    COVER: 'generate-suno-cover',
    VIDEO: 'generate-suno-video',
    WAV: 'convert-suno-to-wav',
    VOCALS: 'separate-suno-vocals',
  },
  MUREKA: {
    GENERATE: 'generate-mureka-track',
    STATUS: 'get-mureka-task-status',
    EXTEND: 'extend-mureka-song',
    LYRICS: 'generate-mureka-lyrics',
    INSTRUMENTAL: 'generate-mureka-instrumental',
    STEM: 'mureka-stem-separation',
  },
  SHARED: {
    DELETE: 'delete-track',
    DOWNLOAD: 'download-and-save-track',
    SYNC: 'sync-generated-tracks',
    CLEANUP: 'cleanup-tracks',
  },
} as const;

// Validation schemas
export const trackGenerationSchema = z.object({
  prompt: z.string().min(1).max(2000),
  style: z.string().max(500).optional(),
  title: z.string().min(1).max(200).optional(),
  lyrics: z.string().max(10000).optional(),
  instrumental: z.boolean().optional(),
  model: z.enum(['V3_5', 'V4', 'V4_5', 'V4_5PLUS']).optional(),
  service: z.enum(['suno', 'mureka']),
});

export const trackMetadataSchema = z.object({
  external_id: z.string().optional(),
  service: z.enum(['suno', 'mureka']).optional(),
  model: z.string().optional(),
  generation_params: z.record(z.any()).optional(),
  audio_url: z.string().url().optional(),
  deleted: z.boolean().optional(),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

// API call validator
export class APIValidator {
  static validateEdgeFunctionName(functionName: string): boolean {
    const allFunctions = Object.values(VALID_EDGE_FUNCTIONS).flatMap(category => 
      Object.values(category)
    );
    return allFunctions.includes(functionName as any);
  }

  static validateTrackGeneration(data: unknown) {
    return trackGenerationSchema.safeParse(data);
  }

  static validateTrackMetadata(metadata: unknown) {
    return trackMetadataSchema.safeParse(metadata);
  }

  static logAPICall(functionName: string, params: any, userId?: string) {
    if (!this.validateEdgeFunctionName(functionName)) {
      console.error(`❌ Invalid edge function name: ${functionName}`);
      throw new Error(`Invalid edge function: ${functionName}`);
    }
    
    console.log(`🔄 API Call: ${functionName}`, {
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      params: this.sanitizeParams(params),
    });
  }

  private static sanitizeParams(params: any): any {
    if (!params) return {};
    
    // Remove sensitive data from logs
    const sanitized = { ...params };
    if (sanitized.apiKey) sanitized.apiKey = '***';
    if (sanitized.token) sanitized.token = '***';
    if (sanitized.secret) sanitized.secret = '***';
    
    return sanitized;
  }
}

// Error tracker
export class ErrorTracker {
  private static errors: Map<string, number> = new Map();

  static trackError(operation: string, error: Error, context?: any) {
    const key = `${operation}:${error.message}`;
    const count = this.errors.get(key) || 0;
    this.errors.set(key, count + 1);

    console.error(`❌ Error in ${operation}:`, {
      message: error.message,
      count: count + 1,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });

    // Alert on repeated errors
    if (count > 2) {
      console.warn(`⚠️ Repeated error detected: ${operation} (${count + 1} times)`);
    }
  }

  static getErrorStats() {
    return Object.fromEntries(this.errors);
  }

  static clearErrors() {
    this.errors.clear();
  }
}