import { supabase } from '@/integrations/supabase/client';
import { APIValidator, ErrorTracker } from './api-validation';

// Safe edge function caller with validation
export async function callEdgeFunction<T = any>(
  functionName: string, 
  body?: any,
  options?: { retries?: number; timeout?: number }
): Promise<T> {
  const { retries = 2, timeout = 30000 } = options || {};
  
  // Validate function name
  APIValidator.validateEdgeFunctionName(functionName);
  
  // Get current user for logging
  const { data: { user } } = await supabase.auth.getUser();
  APIValidator.logAPICall(functionName, body, user?.id);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      console.log(`✅ API Success: ${functionName}`, {
        attempt: attempt + 1,
        timestamp: new Date().toISOString(),
      });

      return data;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      ErrorTracker.trackError(`${functionName}:attempt_${attempt + 1}`, 
        error instanceof Error ? error : new Error(errorMessage), 
        { body, attempt: attempt + 1 }
      );

      if (isLastAttempt) {
        throw new Error(`Failed to call ${functionName} after ${retries + 1} attempts: ${errorMessage}`);
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Unexpected end of retry loop for ${functionName}`);
}

// Safe database operations with validation
export class SafeDatabase {
  static async insertTrack(trackData: {
    title: string;
    project_id: string;
    track_number: number;
    audio_url?: string;
    lyrics?: string;
    metadata?: any;
  }) {
    try {
      // Validate metadata if provided
      if (trackData.metadata) {
        const validation = APIValidator.validateTrackMetadata(trackData.metadata);
        if (!validation.success) {
          throw new Error(`Invalid track metadata: ${validation.error.message}`);
        }
      }

      // Ensure track number is valid
      if (trackData.track_number < 1) {
        throw new Error('Track number must be positive');
      }

      const { data, error } = await supabase
        .from('tracks')
        .insert(trackData)
        .select()
        .single();

      if (error) {
        throw new Error(`Database insert error: ${error.message}`);
      }

      console.log(`✅ Track inserted: ${data.id}`, {
        title: trackData.title,
        project_id: trackData.project_id,
        timestamp: new Date().toISOString(),
      });

      return data;
    } catch (error) {
      ErrorTracker.trackError('database:insert_track', 
        error instanceof Error ? error : new Error('Unknown database error'), 
        trackData
      );
      throw error;
    }
  }

  static async updateTrack(trackId: string, updates: any) {
    try {
      // Validate metadata if being updated
      if (updates.metadata) {
        const validation = APIValidator.validateTrackMetadata(updates.metadata);
        if (!validation.success) {
          throw new Error(`Invalid track metadata: ${validation.error.message}`);
        }
      }

      const { data, error } = await supabase
        .from('tracks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trackId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database update error: ${error.message}`);
      }

      console.log(`✅ Track updated: ${trackId}`, {
        updates: Object.keys(updates),
        timestamp: new Date().toISOString(),
      });

      return data;
    } catch (error) {
      ErrorTracker.trackError('database:update_track', 
        error instanceof Error ? error : new Error('Unknown database error'), 
        { trackId, updates }
      );
      throw error;
    }
  }

  static async deleteTrack(trackId: string) {
    try {
      // Soft delete by marking as deleted in metadata
      const { data, error } = await supabase
        .from('tracks')
        .update({
          metadata: { deleted: true },
          updated_at: new Date().toISOString(),
        })
        .eq('id', trackId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database delete error: ${error.message}`);
      }

      console.log(`✅ Track soft deleted: ${trackId}`, {
        timestamp: new Date().toISOString(),
      });

      return data;
    } catch (error) {
      ErrorTracker.trackError('database:delete_track', 
        error instanceof Error ? error : new Error('Unknown database error'), 
        { trackId }
      );
      throw error;
    }
  }
}

// System health checker
export class SystemHealthChecker {
  static async checkAPIHealth(): Promise<{ 
    status: 'healthy' | 'degraded' | 'down'; 
    issues: string[] 
  }> {
    const issues: string[] = [];
    
    try {
      // Test auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        issues.push(`Auth error: ${authError.message}`);
      }

      // Test database connection
      const { error: dbError } = await supabase.from('tracks').select('id').limit(1);
      if (dbError) {
        issues.push(`Database error: ${dbError.message}`);
      }

      // Check error rate
      const errorStats = ErrorTracker.getErrorStats();
      const totalErrors = Object.values(errorStats).reduce((sum, count) => sum + count, 0);
      if (totalErrors > 10) {
        issues.push(`High error rate: ${totalErrors} errors logged`);
      }

      const status = issues.length === 0 ? 'healthy' : 
                   issues.length <= 2 ? 'degraded' : 'down';

      console.log(`🏥 System Health: ${status}`, {
        issues,
        errorStats,
        timestamp: new Date().toISOString(),
      });

      return { status, issues };
    } catch (error) {
      return {
        status: 'down',
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}