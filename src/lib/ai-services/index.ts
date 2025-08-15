/**
 * AI Services Module
 * Unified interface for all AI music generation services
 */

export * from './types';
export * from './base-service';
export * from './service-registry';
export * from './adapters';

// Core modules
export * from './core/api-client';
export * from './core/service-adapter';

// Router (selective exports to avoid RouterStrategy conflict)
export { 
  ServiceRouter,
  type ServiceRouterConfig,
  type RegisteredService
} from './router/service-router';