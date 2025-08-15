/**
 * Core types for AI service integrations
 */

export interface AIServiceConfig {
  enabled: boolean;
  priority: number;
  fallback?: string;
  rateLimits: {
    rpm: number; // requests per minute
    rph: number; // requests per hour
    daily?: number;
  };
  features: string[];
  pricing?: {
    costPerGeneration: number;
    currency: string;
  };
}

export interface GenerationRequest {
  type: 'text-to-music' | 'style-transfer' | 'voice-synthesis' | 'mastering';
  prompt?: string;
  style?: string;
  duration?: number;
  format?: AudioFormat;
  metadata?: Record<string, any>;
  options?: Record<string, any>;
}

export interface GenerationResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl?: string;
  metadata: {
    duration?: number;
    format?: string;
    sampleRate?: number;
    bitRate?: number;
    bitDepth?: number;
    channels?: number;
    size?: number;
    model?: string;
    created_at?: number;
    finished_at?: number;
    title?: string;
  };
  progress?: number;
  error?: string;
  estimatedCompletion?: Date;
  cost?: number;
}

export interface AudioFormat {
  container: 'wav' | 'mp3' | 'flac' | 'aiff' | 'ogg';
  quality: 'low' | 'medium' | 'high' | 'lossless';
  sampleRate: 44100 | 48000 | 96000 | 192000;
  bitDepth: 16 | 24 | 32;
  channels: 1 | 2;
}

export interface AIServiceCapabilities {
  supportedFormats: AudioFormat['container'][];
  maxDuration: number; // in seconds
  supportedLanguages?: string[];
  voiceStyles?: string[];
  genres?: string[];
  features: {
    textToMusic: boolean;
    styleTransfer: boolean;
    voiceCloning: boolean;
    instrumentSeparation: boolean;
    mastering: boolean;
    realTimeGeneration: boolean;
  };
}

export interface ServiceMetrics {
  uptime: number;
  avgResponseTime: number;
  successRate: number;
  errorRate: number;
  costEfficiency: number;
  qualityScore: number;
}

export abstract class AIServiceProvider {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: AIServiceCapabilities;
  
  abstract isAvailable(): Promise<boolean>;
  abstract generate(request: GenerationRequest): Promise<GenerationResponse>;
  abstract getStatus(generationId: string): Promise<GenerationResponse>;
  abstract cancel(generationId: string): Promise<boolean>;
  abstract getMetrics(): Promise<ServiceMetrics>;
  
  // Optional methods for advanced features
  async validateRequest?(request: GenerationRequest): Promise<boolean>;
  async estimateCost?(request: GenerationRequest): Promise<number>;
  async preProcess?(request: GenerationRequest): Promise<GenerationRequest>;
  async postProcess?(response: GenerationResponse): Promise<GenerationResponse>;
}

export interface ServiceRegistryEntry {
  provider: AIServiceProvider;
  config: AIServiceConfig;
  lastHealthCheck: Date;
  isHealthy: boolean;
  metrics: ServiceMetrics;
}

export interface RouterStrategy {
  name: string;
  selectService(
    request: GenerationRequest,
    availableServices: ServiceRegistryEntry[]
  ): ServiceRegistryEntry | null;
}

export interface ServiceRoute {
  serviceId: string;
  confidence: number;
  estimatedCost: number;
  estimatedTime: number;
  reason: string;
}