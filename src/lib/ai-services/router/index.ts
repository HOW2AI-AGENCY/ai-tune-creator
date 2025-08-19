/**
 * AI Services Router Singleton
 * 
 * Pre-configured ServiceRouter with Suno and Mureka services
 * Ready for production use with health checks and routing strategies
 */

import { ServiceRouter } from './service-router';
import { SupabaseServiceAdapter } from '../adapters/supabase-service-adapter';

// Create singleton router instance
let routerInstance: ServiceRouter | null = null;

export function getServiceRouter(): ServiceRouter {
  if (!routerInstance) {
    // Create router with optimal configuration
    routerInstance = new ServiceRouter({
      defaultStrategy: 'best-performance',
      healthCheckInterval: 60000, // 1 minute
      maxRetries: 2,
      retryDelay: 1000,
      enableLoadBalancing: true,
      fallbackEnabled: true
    });

    // Register Suno service
    const sunoAdapter = new SupabaseServiceAdapter('suno', {
      name: 'suno',
      version: '3.5',
      baseUrl: 'https://api.sunoapi.org',
      timeout: 30000,
      maxRetries: 2,
      rateLimits: {
        rpm: 10,
        rph: 100,
        daily: 1000
      }
    });

    routerInstance.registerService('suno', sunoAdapter, {
      priority: 1,
      weight: 0.6,
      enabled: true,
      tags: ['music', 'vocals', 'lyrics', 'popular']
    });

    // Register Mureka service  
    const murekaAdapter = new SupabaseServiceAdapter('mureka', {
      name: 'mureka',
      version: '7.0',
      baseUrl: 'https://api.mureka.ai',
      timeout: 45000,
      maxRetries: 2,
      rateLimits: {
        rpm: 8,
        rph: 80,
        daily: 800
      }
    });

    routerInstance.registerService('mureka', murekaAdapter, {
      priority: 2,
      weight: 0.4,
      enabled: true,
      tags: ['music', 'instrumental', 'advanced', 'experimental']
    });

    // Start health monitoring
    routerInstance.startHealthChecks();
    
    console.log('🎵 AI Services Router initialized with Suno and Mureka');
  }

  return routerInstance;
}

// Convenience functions for common operations
export async function generateWithRouter(request: any, strategy?: string) {
  const router = getServiceRouter();
  return router.generate(request, { strategy });
}

export async function getRouterStatus(generationId: string) {
  const router = getServiceRouter();
  return router.getStatus(generationId);
}

export async function getServicesHealth() {
  const router = getServiceRouter();
  return router.getServicesHealth();
}

export async function cancelWithRouter(generationId: string) {
  const router = getServiceRouter();
  return router.cancel(generationId);
}

// Flag to enable router usage (can be toggled for gradual rollout)
export const ENABLE_SERVICE_ROUTER = false; // Set to true when ready to use router

// Cleanup function
export function destroyRouter() {
  if (routerInstance) {
    routerInstance.destroy();
    routerInstance = null;
    console.log('🔄 AI Services Router destroyed');
  }
}