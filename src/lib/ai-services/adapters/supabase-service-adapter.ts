/**
 * Supabase Service Adapter
 * 
 * Implements ServiceAdapter for routing through Supabase Edge Functions
 * Provides unified interface for Suno and Mureka services
 */

import { ServiceAdapter, ServiceAdapterConfig, HealthCheckResult } from '../core/service-adapter';
import { GenerationRequest, GenerationResponse, AIServiceCapabilities } from '../types';
import { supabase } from '@/integrations/supabase/client';

export class SupabaseServiceAdapter extends ServiceAdapter {
  private serviceName: 'suno' | 'mureka';
  
  constructor(serviceName: 'suno' | 'mureka', config: ServiceAdapterConfig) {
    super(config);
    this.serviceName = serviceName;
  }

  get capabilities(): AIServiceCapabilities {
    const baseCapabilities = {
      supportedFormats: ['mp3' as const],
      maxDuration: this.serviceName === 'suno' ? 240 : 180, // seconds
      supportedLanguages: ['en', 'ru', 'auto'],
      voiceStyles: ['default', 'energetic', 'calm', 'powerful'],
      genres: ['pop', 'rock', 'electronic', 'jazz', 'classical', 'hip-hop', 'blues'],
      features: {
        textToMusic: true,
        styleTransfer: true,
        voiceCloning: false,
        instrumentSeparation: this.serviceName === 'suno',
        mastering: false,
        realTimeGeneration: false
      }
    };

    if (this.serviceName === 'mureka') {
      baseCapabilities.features.instrumentSeparation = true;
      baseCapabilities.maxDuration = 300; // 5 minutes for Mureka
    }

    return baseCapabilities;
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const functionName = this.getFunctionName(request);
      const requestBody = this.mapRequest(request);
      
      console.log(`📡 [${this.serviceName}] Calling function:`, functionName, 'with body:', requestBody);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      if (error) {
        throw new Error(`Supabase function error: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || `${this.serviceName} generation failed`);
      }

      // Map response to unified format
      return this.mapResponse(data);
      
    } catch (error: any) {
      console.error(`❌ [${this.serviceName}] Generation error:`, error);
      throw error;
    }
  }

  async getStatus(generationId: string): Promise<GenerationResponse> {
    try {
      const statusFunction = this.getStatusFunction();
      
      const { data, error } = await supabase.functions.invoke(statusFunction, {
        body: { taskId: generationId }
      });

      if (error) {
        throw new Error(`Status check error: ${error.message}`);
      }

      return this.mapStatusResponse(data);
      
    } catch (error: any) {
      console.error(`❌ [${this.serviceName}] Status check error:`, error);
      throw error;
    }
  }

  async cancel(generationId: string): Promise<boolean> {
    // Supabase edge functions don't support direct cancellation
    // This would need to be implemented as a separate function
    console.warn(`⚠️ [${this.serviceName}] Cancellation not supported via edge functions`);
    return false;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      const checkFunction = this.serviceName === 'suno' ? 'check-suno-status' : 'check-mureka-status';
      
      const { data, error } = await supabase.functions.invoke(checkFunction);
      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          healthy: false,
          responseTime,
          error: error.message
        };
      }

      const isHealthy = data?.status === 'online';
      
      return {
        healthy: isHealthy,
        responseTime,
        credits: data?.creditsRemaining ? {
          remaining: data.creditsRemaining,
          total: data.creditsTotal
        } : undefined,
        rateLimit: data?.rateLimit ? {
          remaining: data.rateLimit.remaining,
          resetTime: data.rateLimit.resetTime ? new Date(data.rateLimit.resetTime) : undefined
        } : undefined
      };
      
    } catch (error: any) {
      console.error(`❌ [${this.serviceName}] Health check error:`, error);
      return {
        healthy: false,
        responseTime: 0,
        error: error.message
      };
    }
  }

  private getFunctionName(request: GenerationRequest): string {
    if (this.serviceName === 'suno') {
      return 'generate-suno-track';
    } else {
      // Mureka has different functions for different types
      const isInstrumental = request.options?.instrumental;
      return isInstrumental ? 'generate-mureka-instrumental' : 'generate-mureka-track';
    }
  }

  private getStatusFunction(): string {
    if (this.serviceName === 'suno') {
      return 'get-suno-record-info';
    } else {
      return 'get-mureka-task-status';
    }
  }

  private mapRequest(request: GenerationRequest): any {
    if (this.serviceName === 'suno') {
      return {
        prompt: request.prompt || '',
        style: request.style || '',
        title: `AI Generated Track ${new Date().toLocaleDateString('ru-RU')}`,
        make_instrumental: request.options?.instrumental || false,
        wait_audio: false,
        model: 'chirp-v3-5',
        mode: request.options?.mode || 'generate',
        projectId: request.options?.projectId || null,
        artistId: request.options?.artistId || null,
        useInbox: request.options?.useInbox || true
      };
    } else {
      // Mureka format
      return {
        prompt: request.prompt || '',
        lyrics: request.options?.lyrics || request.prompt || '',
        instrumental: request.options?.instrumental || false,
        model: 'auto',
        style: request.style || '',
        duration: request.duration || 120,
        genre: request.options?.genre || 'electronic',
        mood: request.options?.mood || 'energetic',
        tempo: request.options?.tempo || 'medium',
        language: request.options?.language || 'auto',
        projectId: request.options?.projectId || null,
        artistId: request.options?.artistId || null,
        useInbox: request.options?.useInbox || true
      };
    }
  }

  private mapResponse(data: any): GenerationResponse {
    const taskId = data.data?.taskId || data.data?.id || 'unknown';
    
    return {
      id: taskId,
      status: 'pending',
      metadata: {
        model: this.serviceName,
        created_at: Date.now(),
        service: this.serviceName
      },
      progress: 0,
      estimatedCompletion: new Date(Date.now() + (this.serviceName === 'suno' ? 60000 : 120000))
    };
  }

  private mapStatusResponse(data: any): GenerationResponse {
    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';
    let audioUrl: string | undefined;
    let progress = 50;

    if (data?.status === 'SUCCESS' || data?.completed || data?.response?.sunoData?.length > 0) {
      status = 'completed';
      progress = 100;
      
      if (this.serviceName === 'suno') {
        const tracks = data.tracks || data.response?.sunoData || data.all_tracks || [];
        if (tracks.length > 0) {
          audioUrl = tracks[0].audioUrl || tracks[0].audio_url;
        }
      } else if (this.serviceName === 'mureka') {
        audioUrl = data.mureka?.choices?.[0]?.url;
      }
    } else if (data?.status === 'FAILED' || data?.failed) {
      status = 'failed';
      progress = 0;
    }

    return {
      id: data.taskId || 'unknown',
      status,
      audioUrl,
      metadata: {
        model: this.serviceName,
        duration: data.duration,
        finished_at: status === 'completed' ? Date.now() : undefined
      },
      progress,
      error: data?.error || undefined
    };
  }
}