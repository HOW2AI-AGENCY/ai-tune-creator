/**
 * Base Service Adapter for AI Services
 * Provides a standard interface for all AI service integrations
 */

import { APIClient, APIResponse } from './api-client';
import { GenerationRequest, GenerationResponse, ServiceMetrics, AIServiceCapabilities } from '../types';

export interface ServiceAdapterConfig {
  apiKey: string;
  baseUrl: string;
  name: string;
  version: string;
  timeout?: number;
  retries?: number;
  rateLimits?: {
    rpm: number;
    rph: number;
    daily?: number;
  };
}

export interface HealthCheckResult {
  healthy: boolean;
  status: 'online' | 'offline' | 'limited' | 'checking';
  message?: string;
  responseTime?: number;
  credits?: {
    remaining: number;
    total?: number;
  };
  rateLimits?: {
    remaining: number;
    resetTime?: Date;
  };
}

export abstract class ServiceAdapter {
  protected client: APIClient;
  protected config: ServiceAdapterConfig;
  protected lastHealthCheck?: HealthCheckResult;
  protected healthCheckInterval?: NodeJS.Timeout;

  constructor(config: ServiceAdapterConfig) {
    this.config = config;
    this.client = new APIClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
      retries: config.retries
    });
  }

  // Abstract properties that must be implemented
  abstract readonly capabilities: AIServiceCapabilities;

  // Abstract methods that must be implemented
  abstract generate(request: GenerationRequest): Promise<GenerationResponse>;
  abstract getStatus(generationId: string): Promise<GenerationResponse>;
  abstract cancel(generationId: string): Promise<boolean>;
  abstract healthCheck(): Promise<HealthCheckResult>;

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
      capabilities: this.capabilities,
      rateLimits: this.config.rateLimits
    };
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMs: number = 30000): void {
    this.stopHealthChecks();
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        this.lastHealthCheck = await this.healthCheck();
      } catch (error) {
        console.error(`Health check failed for ${this.config.name}:`, error);
        this.lastHealthCheck = {
          healthy: false,
          status: 'offline',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }, intervalMs);

    // Run initial health check
    this.healthCheck().then(result => {
      this.lastHealthCheck = result;
    }).catch(error => {
      this.lastHealthCheck = {
        healthy: false,
        status: 'offline',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    });
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Check if service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.healthCheck();
      return result.healthy;
    } catch {
      return false;
    }
  }

  /**
   * Validate generation request
   */
  validateRequest(request: GenerationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!request.type) {
      errors.push('Request type is required');
    }

    // Check if service supports the request type
    if (request.type === 'text-to-music' && !this.capabilities.features.textToMusic) {
      errors.push('Service does not support text-to-music generation');
    }

    if (request.type === 'style-transfer' && !this.capabilities.features.styleTransfer) {
      errors.push('Service does not support style transfer');
    }

    if (request.type === 'voice-synthesis' && !this.capabilities.features.voiceCloning) {
      errors.push('Service does not support voice synthesis');
    }

    // Check duration limits
    if (request.duration && request.duration > this.capabilities.maxDuration) {
      errors.push(`Duration ${request.duration}s exceeds maximum ${this.capabilities.maxDuration}s`);
    }

    // Check format support
    if (request.format && !this.capabilities.supportedFormats.includes(request.format.container)) {
      errors.push(`Format ${request.format.container} is not supported`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Estimate generation cost
   */
  async estimateCost(request: GenerationRequest): Promise<number> {
    // Default implementation - override in specific adapters
    const baseCost = 0.1;
    const durationMultiplier = (request.duration || 30) / 30;
    const qualityMultiplier = request.format?.quality === 'lossless' ? 2 : 1;
    
    return baseCost * durationMultiplier * qualityMultiplier;
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<ServiceMetrics> {
    const healthCheck = this.lastHealthCheck;
    const uptime = healthCheck?.healthy ? 99.5 : 50.0;
    
    return {
      uptime,
      avgResponseTime: healthCheck?.responseTime || 2500,
      successRate: healthCheck?.healthy ? 98.2 : 50.0,
      errorRate: healthCheck?.healthy ? 1.8 : 50.0,
      costEfficiency: 0.85,
      qualityScore: 4.2
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(updates: Partial<ServiceAdapterConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (updates.apiKey || updates.baseUrl || updates.timeout || updates.retries) {
      this.client.updateConfig({
        apiKey: updates.apiKey || this.config.apiKey,
        baseUrl: updates.baseUrl || this.config.baseUrl,
        timeout: updates.timeout || this.config.timeout,
        retries: updates.retries || this.config.retries
      });
    }
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(endpoint: string = '/') {
    return this.client.getRateLimitInfo(endpoint);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopHealthChecks();
  }

  // Protected helper methods

  protected async makeRequest<T>(endpoint: string, options: any = {}): Promise<APIResponse<T>> {
    return this.client.request<T>(endpoint, options);
  }

  protected async get<T>(endpoint: string, options: any = {}): Promise<APIResponse<T>> {
    return this.client.get<T>(endpoint, options);
  }

  protected async post<T>(endpoint: string, body?: any, options: any = {}): Promise<APIResponse<T>> {
    return this.client.post<T>(endpoint, body, options);
  }

  protected async uploadFile<T>(endpoint: string, file: File | Blob, options: any = {}): Promise<APIResponse<T>> {
    return this.client.uploadFile<T>(endpoint, file, options);
  }

  protected handleError(error: any, context: string): Error {
    const message = error?.message || 'Unknown error';
    console.error(`${this.config.name} ${context}:`, error);
    
    return new Error(`${this.config.name}: ${message}`);
  }

  protected formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  protected parseCredits(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return parseFloat(value) || 0;
    }
    return 0;
  }
}