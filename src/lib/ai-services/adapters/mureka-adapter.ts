/**
 * Mureka AI Service Adapter
 * Implements the unified interface for Mureka API
 */

import { BaseAIService } from '../base-service';
import { GenerationRequest, GenerationResponse, AIServiceCapabilities } from '../types';

export class MurekaAdapter extends BaseAIService {
  readonly name = 'mureka';
  readonly version = '1.2.0';
  readonly capabilities: AIServiceCapabilities = {
    supportedFormats: ['wav', 'mp3', 'flac'],
    maxDuration: 300, // 5 minutes
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'],
    genres: ['ambient', 'electronic', 'classical', 'world', 'experimental', 'cinematic'],
    features: {
      textToMusic: true,
      styleTransfer: true,
      voiceCloning: false,
      instrumentSeparation: true,
      mastering: true,
      realTimeGeneration: false
    }
  };
  
  constructor(apiKey: string) {
    super(apiKey, 'https://api.mureka.ai/v1');
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    await this.validateRequest(request);
    
    const payload = {
      text_prompt: request.prompt,
      style_descriptor: request.style,
      duration_seconds: request.duration || 30,
      output_format: request.format?.container || 'wav',
      quality_level: this.mapQuality(request.format?.quality || 'high'),
      advanced_options: {
        creativity_level: request.options?.creativity || 0.7,
        coherence_weight: request.options?.coherence || 0.8,
        tempo_stability: request.options?.tempoStability || 0.9
      }
    };
    
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw this.handleAPIError({ response });
      }
      
      const data = await response.json();
      
      return {
        id: data.generation_id,
        status: 'processing',
        metadata: {
          duration: payload.duration_seconds,
          format: payload.output_format,
          sampleRate: 48000,
          bitDepth: 24,
          channels: 2
        },
        estimatedCompletion: new Date(Date.now() + (data.estimated_duration_ms || 30000))
      };
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }
  
  async getStatus(generationId: string): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${generationId}`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw this.handleAPIError({ response });
      }
      
      const data = await response.json();
      
      return {
        id: generationId,
        status: this.mapStatus(data.status),
        audioUrl: data.result?.audio_url,
        metadata: {
          duration: data.result?.metadata?.duration,
          format: data.result?.metadata?.format,
          sampleRate: data.result?.metadata?.sample_rate,
          bitDepth: data.result?.metadata?.bit_depth,
          size: data.result?.metadata?.file_size_bytes
        },
        progress: data.progress_percentage || 0,
        error: data.error?.message,
        cost: data.cost_usd
      };
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }
  
  async cancel(generationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${generationId}/cancel`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private mapStatus(murekaStatus: string): GenerationResponse['status'] {
    const statusMap: Record<string, GenerationResponse['status']> = {
      'queued': 'pending',
      'running': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'failed'
    };
    
    return statusMap[murekaStatus] || 'pending';
  }
  
  private mapQuality(quality: string): string {
    const qualityMap: Record<string, string> = {
      'low': 'draft',
      'medium': 'standard',
      'high': 'premium',
      'lossless': 'professional'
    };
    
    return qualityMap[quality] || 'standard';
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    const baseCost = 0.15; // $0.15 per generation
    const durationMultiplier = Math.ceil((request.duration || 30) / 30);
    const qualityMultiplier = request.format?.quality === 'lossless' ? 2.0 : 1;
    const featureMultiplier = request.options?.mastering ? 1.3 : 1;
    
    return baseCost * durationMultiplier * qualityMultiplier * featureMultiplier;
  }
}