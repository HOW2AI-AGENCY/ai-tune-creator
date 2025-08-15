/**
 * AI Service Router
 * Routes generation requests to the best available service
 */

import { ServiceAdapter } from '../core/service-adapter';
import { GenerationRequest, GenerationResponse } from '../types';

export interface RouterStrategy {
  name: string;
  selectService(
    request: GenerationRequest,
    availableServices: RegisteredService[]
  ): RegisteredService | null;
}

export interface ServiceRouterConfig {
  fallbackStrategy: 'fail' | 'queue' | 'degraded';
  healthCheckInterval: number;
  maxRetries: number;
  retryDelay: number;
  loadBalancing: 'round-robin' | 'least-loaded' | 'best-performance';
}

export interface RegisteredService {
  adapter: ServiceAdapter;
  priority: number;
  weight: number;
  enabled: boolean;
  tags: string[];
}

export class ServiceRouter {
  private services: Map<string, RegisteredService> = new Map();
  private strategies: Map<string, RouterStrategy> = new Map();
  private currentIndex = 0;
  private config: ServiceRouterConfig;

  constructor(config: Partial<ServiceRouterConfig> = {}) {
    this.config = {
      fallbackStrategy: 'queue',
      healthCheckInterval: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      loadBalancing: 'best-performance',
      ...config
    };

    // Register default strategies
    this.registerStrategy('best-performance', new BestPerformanceStrategy());
    this.registerStrategy('lowest-cost', new LowestCostStrategy());
    this.registerStrategy('fastest', new FastestStrategy());
    this.registerStrategy('round-robin', new RoundRobinStrategy());
  }

  /**
   * Register a service adapter
   */
  registerService(
    id: string, 
    adapter: ServiceAdapter, 
    options: {
      priority?: number;
      weight?: number;
      enabled?: boolean;
      tags?: string[];
      autoHealthCheck?: boolean;
    } = {}
  ): void {
    const service: RegisteredService = {
      adapter,
      priority: options.priority || 1,
      weight: options.weight || 1,
      enabled: options.enabled !== false,
      tags: options.tags || []
    };

    this.services.set(id, service);

    if (options.autoHealthCheck !== false) {
      adapter.startHealthChecks(this.config.healthCheckInterval);
    }
  }

  /**
   * Unregister a service
   */
  unregisterService(id: string): void {
    const service = this.services.get(id);
    if (service) {
      service.adapter.destroy();
      this.services.delete(id);
    }
  }

  /**
   * Register a routing strategy
   */
  registerStrategy(name: string, strategy: RouterStrategy): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Generate using the best available service
   */
  async generate(
    request: GenerationRequest, 
    options: {
      strategy?: string;
      excludeServices?: string[];
      requiredTags?: string[];
      maxCost?: number;
    } = {}
  ): Promise<GenerationResponse> {
    const availableServices = this.getAvailableServices(options);
    
    if (availableServices.length === 0) {
      throw new Error('No available services for this request');
    }

    const strategyName = options.strategy || 'best-performance';
    const strategy = this.strategies.get(strategyName);
    
    if (!strategy) {
      throw new Error(`Unknown strategy: ${strategyName}`);
    }

    const selectedService = strategy.selectService(request, availableServices);
    
    if (!selectedService) {
      throw new Error('No suitable service found for this request');
    }

    let lastError: Error;
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      try {
        const result = await selectedService.adapter.generate(request);
        
        // Track successful generation for metrics
        this.updateServiceMetrics(selectedService.adapter, true);
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        this.updateServiceMetrics(selectedService.adapter, false);
        
        if (attempt < this.config.maxRetries) {
          await this.wait(this.config.retryDelay * attempt);
          
          // Try fallback service if available
          const fallbackServices = availableServices.filter(s => s !== selectedService);
          if (fallbackServices.length > 0) {
            const fallbackService = strategy.selectService(request, fallbackServices);
            if (fallbackService) {
              try {
                const result = await fallbackService.adapter.generate(request);
                this.updateServiceMetrics(fallbackService.adapter, true);
                return result;
              } catch (fallbackError) {
                this.updateServiceMetrics(fallbackService.adapter, false);
              }
            }
          }
        }
      }
    }

    throw lastError!;
  }

  /**
   * Get status of a generation across all services
   */
  async getStatus(generationId: string): Promise<GenerationResponse> {
    const errors: Error[] = [];

    for (const [serviceId, service] of this.services) {
      if (!service.enabled) continue;

      try {
        const result = await service.adapter.getStatus(generationId);
        return result;
      } catch (error) {
        errors.push(error as Error);
      }
    }

    throw new Error(`Generation not found: ${errors.map(e => e.message).join(', ')}`);
  }

  /**
   * Cancel generation across all services
   */
  async cancel(generationId: string): Promise<boolean> {
    let cancelled = false;

    for (const [serviceId, service] of this.services) {
      if (!service.enabled) continue;

      try {
        const result = await service.adapter.cancel(generationId);
        if (result) cancelled = true;
      } catch (error) {
        console.warn(`Failed to cancel on ${serviceId}:`, error);
      }
    }

    return cancelled;
  }

  /**
   * Get service health status
   */
  getServicesHealth(): Record<string, any> {
    const health: Record<string, any> = {};

    for (const [serviceId, service] of this.services) {
      const lastCheck = service.adapter.getLastHealthCheck();
      health[serviceId] = {
        enabled: service.enabled,
        healthy: lastCheck?.healthy || false,
        status: lastCheck?.status || 'unknown',
        message: lastCheck?.message,
        responseTime: lastCheck?.responseTime,
        credits: lastCheck?.credits,
        rateLimits: lastCheck?.rateLimits
      };
    }

    return health;
  }

  /**
   * Get available services for a request
   */
  private getAvailableServices(options: {
    excludeServices?: string[];
    requiredTags?: string[];
    maxCost?: number;
  } = {}): RegisteredService[] {
    const available: RegisteredService[] = [];

    for (const [serviceId, service] of this.services) {
      // Skip disabled services
      if (!service.enabled) continue;

      // Skip excluded services
      if (options.excludeServices?.includes(serviceId)) continue;

      // Check required tags
      if (options.requiredTags?.length && 
          !options.requiredTags.every(tag => service.tags.includes(tag))) {
        continue;
      }

      // Check if service is healthy
      const healthCheck = service.adapter.getLastHealthCheck();
      if (!healthCheck?.healthy) continue;

      available.push(service);
    }

    return available.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update service metrics
   */
  private updateServiceMetrics(adapter: ServiceAdapter, success: boolean): void {
    // Implementation would track success/failure rates
    // This could be stored in a metrics database or in-memory
  }

  /**
   * Wait utility
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up all services
   */
  destroy(): void {
    for (const [serviceId, service] of this.services) {
      service.adapter.destroy();
    }
    this.services.clear();
  }
}

// Built-in routing strategies

class BestPerformanceStrategy implements RouterStrategy {
  name = 'best-performance';

  selectService(request: GenerationRequest, services: RegisteredService[]): RegisteredService | null {
    if (services.length === 0) return null;

    // Score services based on health, response time, and success rate
    const scored = services.map(service => {
      const health = service.adapter.getLastHealthCheck();
      let score = service.priority * 10;
      
      if (health?.healthy) score += 50;
      if (health?.responseTime) score -= Math.min(health.responseTime / 100, 30);
      if (health?.status === 'online') score += 20;
      
      return { service, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].service;
  }
}

class LowestCostStrategy implements RouterStrategy {
  name = 'lowest-cost';

  selectService(request: GenerationRequest, services: Array<RegisteredService & { id: string }>): (RegisteredService & { id: string }) | null {
    if (services.length === 0) return null;

    // Select service with lowest estimated cost
    // This would require implementing cost estimation in adapters
    return services[0]; // Simplified implementation
  }
}

class FastestStrategy implements RouterStrategy {
  name = 'fastest';

  selectService(request: GenerationRequest, services: Array<RegisteredService & { id: string }>): (RegisteredService & { id: string }) | null {
    if (services.length === 0) return null;

    // Select service with fastest response time
    const fastest = services.reduce((best, current) => {
      const currentHealth = current.adapter.getLastHealthCheck();
      const bestHealth = best.adapter.getLastHealthCheck();
      
      if (!currentHealth?.responseTime) return best;
      if (!bestHealth?.responseTime) return current;
      
      return currentHealth.responseTime < bestHealth.responseTime ? current : best;
    });

    return fastest;
  }
}

class RoundRobinStrategy implements RouterStrategy {
  name = 'round-robin';
  private currentIndex = 0;

  selectService(request: GenerationRequest, services: Array<RegisteredService & { id: string }>): (RegisteredService & { id: string }) | null {
    if (services.length === 0) return null;

    const service = services[this.currentIndex % services.length];
    this.currentIndex++;
    
    return service;
  }
}