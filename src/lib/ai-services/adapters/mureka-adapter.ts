/**
 * Mureka AI Service Adapter
 * Implements the unified interface for Mureka API based on official documentation
 */

import { BaseAIService } from '../base-service';
import { GenerationRequest, GenerationResponse, AIServiceCapabilities } from '../types';

export interface MurekaGenerationRequest {
  lyrics: string;
  model?: 'auto' | 'mureka-6' | 'mureka-7' | 'mureka-o1';
  prompt?: string;
  reference_id?: string;
  vocal_id?: string;
  melody_id?: string;
  stream?: boolean;
}

export interface MurekaTaskResponse {
  id: string;
  created_at: number;
  finished_at?: number;
  model: string;
  status: 'preparing' | 'queued' | 'running' | 'streaming' | 'succeeded' | 'failed' | 'timeouted' | 'cancelled';
  failed_reason?: string;
  choices?: Array<{
    audio_url: string;
    duration: number;
    title?: string;
  }>;
}

export class MurekaAdapter extends BaseAIService {
  readonly name = 'mureka';
  readonly version = '2.0.0';
  readonly capabilities: AIServiceCapabilities = {
    supportedFormats: ['wav', 'mp3', 'flac'],
    maxDuration: 480, // 8 minutes
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'],
    genres: ['ambient', 'electronic', 'classical', 'world', 'experimental', 'cinematic', 'pop', 'rock', 'jazz', 'r&b'],
    features: {
      textToMusic: true,
      styleTransfer: true,
      voiceCloning: true,
      instrumentSeparation: true,
      mastering: false,
      realTimeGeneration: true
    }
  };
  
  constructor(apiKey: string) {
    super(apiKey, 'https://api.mureka.ai/v1');
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    await this.validateRequest(request);
    
    const payload: MurekaGenerationRequest = {
      lyrics: request.metadata?.lyrics || request.prompt || 'Generate lyrics for a song',
      model: request.metadata?.model || 'auto',
      prompt: request.style || request.prompt,
      stream: request.options?.stream || false
    };

    // Add control options if provided
    if (request.metadata?.reference_id) {
      payload.reference_id = request.metadata.reference_id;
      delete payload.prompt; // Cannot use prompt with reference_id
    }
    if (request.metadata?.vocal_id) {
      payload.vocal_id = request.metadata.vocal_id;
      delete payload.prompt; // Cannot use prompt with vocal_id
      delete payload.melody_id;
    }
    if (request.metadata?.melody_id) {
      payload.melody_id = request.metadata.melody_id;
      delete payload.prompt; // Cannot use prompt with melody_id
      delete payload.reference_id;
      delete payload.vocal_id;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/song/generate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.handleAPIError({ 
          response, 
          message: errorData.error?.message || `HTTP ${response.status}` 
        });
      }
      
      const data: MurekaTaskResponse = await response.json();
      
      return {
        id: data.id,
        status: this.mapStatus(data.status),
        metadata: {
          model: data.model,
          created_at: data.created_at
        },
        estimatedCompletion: new Date(Date.now() + 120000) // 2 minutes estimate
      };
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }
  
  async getStatus(generationId: string): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/song/query/${generationId}`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.handleAPIError({ 
          response, 
          message: errorData.error?.message || `HTTP ${response.status}` 
        });
      }
      
      const data: MurekaTaskResponse = await response.json();
      
      return {
        id: generationId,
        status: this.mapStatus(data.status),
        audioUrl: data.choices?.[0]?.audio_url,
        metadata: {
          duration: data.choices?.[0]?.duration,
          model: data.model,
          created_at: data.created_at,
          finished_at: data.finished_at,
          title: data.choices?.[0]?.title
        },
        error: data.failed_reason
      };
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }
  
  async cancel(generationId: string): Promise<boolean> {
    // Mureka API doesn't provide a cancel endpoint in the official docs
    // Return false to indicate cancellation is not supported
    return false;
  }
  
  private mapStatus(murekaStatus: string): GenerationResponse['status'] {
    const statusMap: Record<string, GenerationResponse['status']> = {
      'preparing': 'pending',
      'queued': 'pending', 
      'running': 'processing',
      'streaming': 'processing',
      'succeeded': 'completed',
      'failed': 'failed',
      'timeouted': 'failed',
      'cancelled': 'failed'
    };
    
    return statusMap[murekaStatus] || 'pending';
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    // Mureka uses credit-based pricing
    // Based on official pricing: approximately $0.20-0.50 per generation
    const baseCost = 0.30;
    const modelMultiplier = this.getModelMultiplier(request.metadata?.model);
    const streamMultiplier = request.options?.stream ? 1.2 : 1;
    
    return baseCost * modelMultiplier * streamMultiplier;
  }

  private getModelMultiplier(model?: string): number {
    switch (model) {
      case 'mureka-o1':
        return 2.0; // Premium model
      case 'mureka-7':
        return 1.5;
      case 'mureka-6':
        return 1.0;
      case 'auto':
      default:
        return 1.3; // Latest model
    }
  }

  // New methods for Mureka-specific features
  async generateLyrics(prompt: string): Promise<{ title: string; lyrics: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/lyrics/generate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw this.handleAPIError({ response });
      }

      return await response.json();
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async extendLyrics(lyrics: string): Promise<{ lyrics: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/lyrics/extend`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ lyrics })
      });

      if (!response.ok) {
        throw this.handleAPIError({ response });
      }

      return await response.json();
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async extendSong(songId?: string, uploadAudioId?: string, lyrics?: string, extendAt?: number): Promise<MurekaTaskResponse> {
    try {
      const requestBody: any = {
        lyrics,
        extend_at: extendAt
      };

      if (songId) {
        requestBody.song_id = songId;
      } else if (uploadAudioId) {
        requestBody.upload_audio_id = uploadAudioId;
      } else {
        throw new Error('Either songId or uploadAudioId is required');
      }

      const response = await fetch(`${this.baseUrl}/song/extend`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw this.handleAPIError({ response });
      }

      return await response.json();
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async generateInstrumental(model: string = 'auto', prompt?: string, instrumentalId?: string, stream: boolean = false): Promise<MurekaTaskResponse> {
    try {
      const requestBody: any = {
        model,
        stream
      };

      if (prompt) {
        requestBody.prompt = prompt;
      } else if (instrumentalId) {
        requestBody.instrumental_id = instrumentalId;
      } else {
        throw new Error('Either prompt or instrumentalId is required');
      }

      const response = await fetch(`${this.baseUrl}/instrumental/generate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw this.handleAPIError({ response });
      }

      return await response.json();
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async getInstrumentalStatus(taskId: string): Promise<MurekaTaskResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/instrumental/query/${taskId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw this.handleAPIError({ response });
      }

      return await response.json();
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async createUpload(uploadName: string, purpose: 'fine-tuning', bytes?: number): Promise<any> {
    try {
      const requestBody: any = {
        upload_name: uploadName,
        purpose
      };

      if (bytes) {
        requestBody.bytes = bytes;
      }

      const response = await fetch(`${this.baseUrl}/uploads/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw this.handleAPIError({ response });
      }

      return await response.json();
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async stemSong(url: string): Promise<{ zip_url: string; expires_at: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/song/stem`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw this.handleAPIError({ response });
      }

      return await response.json();
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }
}