/**
 * @fileoverview Bundle optimization utilities for code splitting and lazy loading
 * @version 1.0.0
 */

import { lazy } from 'react';
import { safeLazy, preloadModule } from './SafeLazyLoader';

// Critical route components - load immediately
export const criticalRoutes = {
  Dashboard: () => import('@/pages/Dashboard'),
  Auth: () => import('@/pages/Auth'),
  Index: () => import('@/pages/Index')
};

// Heavy route components - load lazily with retry logic
export const heavyRoutes = {
  AIGenerationStudio: safeLazy(() => import('@/pages/AIGenerationStudio'), {
    timeout: 15000,
    retries: 3
  }),
  Projects: safeLazy(() => import('@/pages/Projects')),
  Tracks: safeLazy(() => import('@/pages/Tracks')),
  Artists: safeLazy(() => import('@/pages/Artists')),
  Settings: safeLazy(() => import('@/pages/Settings'))
};

// Feature components - load on demand (simplified for now)
export const featureComponents = {
  // Will be expanded with actual lazy components when needed
};

/**
 * Preload strategy for heavy modules
 */
export class BundlePreloader {
  private static preloadedModules = new Set<string>();
  
  static async preloadCriticalRoutes() {
    const modules = Object.entries(criticalRoutes);
    
    await Promise.allSettled(
      modules.map(async ([name, importFn]) => {
        if (this.preloadedModules.has(name)) return;
        
        try {
          await preloadModule(importFn);
          this.preloadedModules.add(name);
          console.log(`[BundlePreloader] Preloaded critical route: ${name}`);
        } catch (error) {
          console.warn(`[BundlePreloader] Failed to preload ${name}:`, error);
        }
      })
    );
  }
  
  static async preloadOnIdle(moduleNames: string[]) {
    if (typeof window === 'undefined') return;
    
    const preloadTask = async () => {
      for (const moduleName of moduleNames) {
        if (this.preloadedModules.has(moduleName)) continue;
        
        const importFn = (featureComponents as any)[moduleName] || (heavyRoutes as any)[moduleName];
        if (!importFn) continue;
        
        try {
          await preloadModule(importFn);
          this.preloadedModules.add(moduleName);
          console.log(`[BundlePreloader] Preloaded on idle: ${moduleName}`);
        } catch (error) {
          console.warn(`[BundlePreloader] Failed to preload ${moduleName}:`, error);
        }
      }
    };
    
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadTask, { timeout: 5000 });
    } else {
      setTimeout(preloadTask, 100);
    }
  }
  
  static async preloadUserBasedModules(userRole: string) {
    const moduleMap: Record<string, string[]> = {
      admin: ['TrackEditDialog', 'ProjectDetailsDialog'],
      user: ['CreateProjectDialog', 'UniversalAIInterface'],
      guest: []
    };
    
    const modules = moduleMap[userRole] || moduleMap.guest;
    await this.preloadOnIdle(modules);
  }
}

/**
 * Dynamic import with error boundary
 */
export function createDynamicImport<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Dynamic import failed:', error);
      if (fallback) {
        return { default: fallback };
      }
      throw error;
    }
  });
}

/**
 * Bundle size monitoring
 */
export class BundleSizeMonitor {
  private static performanceMarks = new Map<string, number>();
  
  static markStart(bundleName: string) {
    if (typeof performance !== 'undefined') {
      const markName = `bundle-${bundleName}-start`;
      performance.mark(markName);
      this.performanceMarks.set(bundleName, performance.now());
    }
  }
  
  static markEnd(bundleName: string) {
    if (typeof performance !== 'undefined' && this.performanceMarks.has(bundleName)) {
      const startTime = this.performanceMarks.get(bundleName)!;
      const loadTime = performance.now() - startTime;
      
      console.log(`[BundleSizeMonitor] Bundle "${bundleName}" loaded in ${loadTime.toFixed(2)}ms`);
      
      // Log if bundle is taking too long
      if (loadTime > 3000) {
        console.warn(`[BundleSizeMonitor] Slow bundle detected: ${bundleName} (${loadTime.toFixed(2)}ms)`);
      }
      
      this.performanceMarks.delete(bundleName);
    }
  }
  
  static getLoadingBundles(): string[] {
    return Array.from(this.performanceMarks.keys());
  }
}