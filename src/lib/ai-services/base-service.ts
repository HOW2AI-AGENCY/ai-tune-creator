/**
 * Base implementation for AI service providers
 */

import { AIServiceProvider, GenerationRequest, GenerationResponse, ServiceMetrics, AIServiceCapabilities } from './types';

export abstract class BaseAIService implements AIServiceProvider {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: AIServiceCapabilities;
  
  protected apiKey: string;
  protected baseUrl: string;
  protected rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  /**
   * Check if service is available and healthy
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate generation request
   */
  async validateRequest(request: GenerationRequest): Promise<boolean> {
    // Check rate limits
    if (!this.checkRateLimit()) {
      throw new Error(`Rate limit exceeded for ${this.name}`);
    }
    
    // Validate duration
    if (request.duration && request.duration > this.capabilities.maxDuration) {
      throw new Error(`Duration ${request.duration}s exceeds maximum ${this.capabilities.maxDuration}s`);
    }
    
    // Validate format
    if (request.format && !this.capabilities.supportedFormats.includes(request.format.container)) {
      throw new Error(`Format ${request.format.container} not supported by ${this.name}`);
    }
    
    return true;
  }
  
  /**
   * Estimate generation cost
   */
  async estimateCost(request: GenerationRequest): Promise<number> {
    // Base cost calculation - override in specific services
    const baseCost = 0.1;
    const durationMultiplier = (request.duration || 30) / 30;
    const qualityMultiplier = request.format?.quality === 'lossless' ? 2 : 1;
    
    return baseCost * durationMultiplier * qualityMultiplier;
  }
  
  /**
   * Get service metrics
   */
  async getMetrics(): Promise<ServiceMetrics> {
    return {
      uptime: 99.5,
      avgResponseTime: 2500,
      successRate: 98.2,
      errorRate: 1.8,
      costEfficiency: 0.85,
      qualityScore: 4.2
    };
  }
  
  /**
   * Get authentication headers
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Check rate limits
   */
  protected checkRateLimit(): boolean {
    const now = Date.now();
    const minuteKey = `${this.name}_${Math.floor(now / 60000)}`;
    
    const current = this.rateLimiter.get(minuteKey) || { count: 0, resetTime: now + 60000 };
    
    if (now > current.resetTime) {
      this.rateLimiter.set(minuteKey, { count: 1, resetTime: now + 60000 });
      return true;
    }
    
    if (current.count >= 60) { // Default RPM limit
      return false;
    }
    
    current.count++;
    this.rateLimiter.set(minuteKey, current);
    return true;
  }
  
  /**
   * Handle API errors consistently
   */
  protected handleAPIError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      switch (status) {
        case 401:
          return new Error(`Authentication failed for ${this.name}: ${message}`);
        case 429:
          return new Error(`Rate limit exceeded for ${this.name}: ${message}`);
        case 500:
          return new Error(`Internal server error in ${this.name}: ${message}`);
        default:
          return new Error(`API error in ${this.name}: ${message}`);
      }
    }
    
    return new Error(`Network error in ${this.name}: ${error.message}`);
  }
  
  // Abstract methods that must be implemented by concrete services
  abstract generate(request: GenerationRequest): Promise<GenerationResponse>;
  abstract getStatus(generationId: string): Promise<GenerationResponse>;
  abstract cancel(generationId: string): Promise<boolean>;
}