/**
 * Suno AI Service Adapter
 * Implements the unified interface for Suno API
 */

import { BaseAIService } from '../base-service';
import { GenerationRequest, GenerationResponse, AIServiceCapabilities } from '../types';

export class SunoAdapter extends BaseAIService {
  readonly name = 'suno';
  readonly version = '2.0.0';
  readonly capabilities: AIServiceCapabilities = {
    supportedFormats: ['mp3', 'wav'],
    maxDuration: 240, // 4 minutes
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
    genres: ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk'],
    features: {
      textToMusic: true,
      styleTransfer: true,
      voiceCloning: false,
      instrumentSeparation: false,
      mastering: false,
      realTimeGeneration: false
    }
  };
  
  constructor(apiKey: string) {
    super(apiKey, 'https://api.sunoapi.org/v2');
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    await this.validateRequest(request);
    
    const payload = {
      prompt: request.prompt,
      style: request.style,
      duration: request.duration || 30,
      format: request.format?.container || 'mp3',
      quality: request.format?.quality || 'high',
      ...request.options
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
        id: data.id,
        status: 'processing',
        metadata: {
          duration: payload.duration,
          format: payload.format,
          sampleRate: 44100,
          channels: 2
        },
        estimatedCompletion: new Date(Date.now() + data.estimated_time * 1000)
      };
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }
  
  async getStatus(generationId: string): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${generationId}`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw this.handleAPIError({ response });
      }
      
      const data = await response.json();
      
      return {
        id: generationId,
        status: this.mapStatus(data.status),
        audioUrl: data.audio_url,
        metadata: {
          duration: data.metadata?.duration,
          format: data.metadata?.format,
          sampleRate: data.metadata?.sample_rate,
          size: data.metadata?.file_size
        },
        progress: data.progress || 0,
        error: data.error_message
      };
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }
  
  async cancel(generationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/cancel/${generationId}`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private mapStatus(sunoStatus: string): GenerationResponse['status'] {
    const statusMap: Record<string, GenerationResponse['status']> = {
      'queued': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'error': 'failed'
    };
    
    return statusMap[sunoStatus] || 'pending';
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    const baseCost = 0.12; // $0.12 per generation
    const durationMultiplier = Math.ceil((request.duration || 30) / 30);
    const qualityMultiplier = request.format?.quality === 'lossless' ? 1.5 : 1;
    
    return baseCost * durationMultiplier * qualityMultiplier;
  }
}