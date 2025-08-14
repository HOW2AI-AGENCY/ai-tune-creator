/**
 * AI Service Registry
 * Manages registration and health monitoring of all AI services
 */

import { AIServiceProvider, ServiceRegistryEntry, AIServiceConfig, ServiceMetrics } from './types';

export class ServiceRegistry {
  private services: Map<string, ServiceRegistryEntry> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  
  /**
   * Register a new AI service
   */
  register(provider: AIServiceProvider, config: AIServiceConfig): void {
    const entry: ServiceRegistryEntry = {
      provider,
      config,
      lastHealthCheck: new Date(),
      isHealthy: true,
      metrics: {
        uptime: 100,
        avgResponseTime: 0,
        successRate: 100,
        errorRate: 0,
        costEfficiency: 1,
        qualityScore: 5
      }
    };
    
    this.services.set(provider.name, entry);
    console.log(`Registered AI service: ${provider.name} v${provider.version}`);
  }
  
  /**
   * Unregister a service
   */
  unregister(serviceName: string): boolean {
    return this.services.delete(serviceName);
  }
  
  /**
   * Get a specific service
   */
  getService(serviceName: string): ServiceRegistryEntry | undefined {
    return this.services.get(serviceName);
  }
  
  /**
   * Get all registered services
   */
  getAllServices(): ServiceRegistryEntry[] {
    return Array.from(this.services.values());
  }
  
  /**
   * Get all healthy services
   */
  getHealthyServices(): ServiceRegistryEntry[] {
    return this.getAllServices().filter(service => 
      service.config.enabled && service.isHealthy
    );
  }
  
  /**
   * Get services by capability
   */
  getServicesByCapability(capability: keyof ServiceRegistryEntry['provider']['capabilities']['features']): ServiceRegistryEntry[] {
    return this.getHealthyServices().filter(service => 
      service.provider.capabilities.features[capability]
    );
  }
  
  /**
   * Get services sorted by priority
   */
  getServicesByPriority(): ServiceRegistryEntry[] {
    return this.getHealthyServices().sort((a, b) => 
      a.config.priority - b.config.priority
    );
  }
  
  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
    
    console.log('Started AI service health monitoring');
  }
  
  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.services.entries()).map(async ([name, entry]) => {
      try {
        const startTime = Date.now();
        const isHealthy = await entry.provider.isAvailable();
        const responseTime = Date.now() - startTime;
        
        // Update health status
        entry.isHealthy = isHealthy;
        entry.lastHealthCheck = new Date();
        
        // Update metrics
        if (isHealthy) {
          const newMetrics = await entry.provider.getMetrics();
          entry.metrics = {
            ...newMetrics,
            avgResponseTime: responseTime
          };
        }
        
        console.log(`Health check for ${name}: ${isHealthy ? 'healthy' : 'unhealthy'} (${responseTime}ms)`);
      } catch (error) {
        entry.isHealthy = false;
        entry.lastHealthCheck = new Date();
        console.error(`Health check failed for ${name}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Get service statistics
   */
  getStatistics(): {
    total: number;
    healthy: number;
    enabled: number;
    avgResponseTime: number;
    avgSuccessRate: number;
  } {
    const services = this.getAllServices();
    const healthy = services.filter(s => s.isHealthy);
    const enabled = services.filter(s => s.config.enabled);
    
    const avgResponseTime = healthy.length > 0 
      ? healthy.reduce((sum, s) => sum + s.metrics.avgResponseTime, 0) / healthy.length
      : 0;
      
    const avgSuccessRate = healthy.length > 0
      ? healthy.reduce((sum, s) => sum + s.metrics.successRate, 0) / healthy.length
      : 0;
    
    return {
      total: services.length,
      healthy: healthy.length,
      enabled: enabled.length,
      avgResponseTime,
      avgSuccessRate
    };
  }
  
  /**
   * Update service configuration
   */
  updateServiceConfig(serviceName: string, config: Partial<AIServiceConfig>): boolean {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }
    
    service.config = { ...service.config, ...config };
    return true;
  }
  
  /**
   * Get service with fallback
   */
  getServiceWithFallback(serviceName: string): ServiceRegistryEntry | null {
    let service = this.getService(serviceName);
    
    // If primary service is not healthy, try fallback
    if (!service?.isHealthy && service?.config.fallback) {
      service = this.getService(service.config.fallback);
    }
    
    // If still no healthy service, get the highest priority healthy service
    if (!service?.isHealthy) {
      const healthyServices = this.getServicesByPriority();
      service = healthyServices[0] || null;
    }
    
    return service;
  }
}

// Export singleton instance
export const serviceRegistry = new ServiceRegistry();