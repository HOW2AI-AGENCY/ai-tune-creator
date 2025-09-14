/**
 * Performance Optimizer - центральная система оптимизации производительности
 * Объединяет все инструменты оптимизации в единый интерфейс
 */

import { createComponentLogger } from '@/lib/debug/ConsoleManager';
import { memoryManager } from './MemoryManager';
import { requestDeduplicator } from './RequestDeduplicator';

const logger = createComponentLogger('PerformanceOptimizer');

interface PerformanceMetrics {
  memoryUsage: number;
  pendingRequests: number;
  componentRenderCount: number;
  lastOptimization: number;
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private renderCounts = new Map<string, number>();
  private lastOptimization = 0;
  private optimizationInterval = 30000; // 30 секунд

  private constructor() {
    this.startPerformanceMonitoring();
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Запускает автоматическую оптимизацию производительности
   */
  private startPerformanceMonitoring() {
    setInterval(() => {
      this.performAutomaticOptimization();
    }, this.optimizationInterval);
  }

  /**
   * Выполняет автоматическую оптимизацию
   */
  private performAutomaticOptimization() {
    const metrics = this.getMetrics();
    logger.debug('Performance metrics:', metrics);

    // Оптимизация памяти при высоком использовании
    if (metrics.memoryUsage > 150) { // 150MB
      logger.warn('High memory usage detected, running cleanup');
      memoryManager.forceCleanup();
    }

    // Очистка устаревших запросов
    if (metrics.pendingRequests > 10) {
      logger.warn('Too many pending requests, clearing cache');
      requestDeduplicator.clear();
    }

    this.lastOptimization = Date.now();
  }

  /**
   * Регистрирует рендер компонента для мониторинга
   */
  trackComponentRender(componentName: string) {
    const count = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, count + 1);

    // Предупреждение о частых рендерах
    if (count > 50) {
      logger.warn(`Component ${componentName} has rendered ${count} times. Consider optimization.`);
    }
  }

  /**
   * Получает текущие метрики производительности
   */
  getMetrics(): PerformanceMetrics {
    let memoryUsage = 0;
    
    if ('performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    const pendingRequests = requestDeduplicator.getStats().pendingRequests;
    const totalRenders = Array.from(this.renderCounts.values())
      .reduce((sum, count) => sum + count, 0);

    return {
      memoryUsage,
      pendingRequests,
      componentRenderCount: totalRenders,
      lastOptimization: this.lastOptimization
    };
  }

  /**
   * Принудительная оптимизация всех систем
   */
  forceOptimization() {
    logger.info('Running forced optimization');
    
    // Очистка памяти
    memoryManager.forceCleanup();
    
    // Очистка запросов
    requestDeduplicator.clear();
    
    // Сброс счетчиков рендеров
    this.renderCounts.clear();
    
    // Сборка мусора (если доступна)
    if ('gc' in window) {
      (window as any).gc();
    }

    this.lastOptimization = Date.now();
    logger.info('Forced optimization completed');
  }

  /**
   * Получает рекомендации по оптимизации
   */
  getOptimizationRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    if (metrics.memoryUsage > 100) {
      recommendations.push('Consider reducing memory usage by optimizing component state');
    }

    if (metrics.pendingRequests > 5) {
      recommendations.push('Too many concurrent requests - implement request batching');
    }

    if (metrics.componentRenderCount > 200) {
      recommendations.push('High component render count - optimize with React.memo and useMemo');
    }

    return recommendations;
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();

/**
 * Хук для мониторинга производительности компонента
 */
export function usePerformanceTracking(componentName: string) {
  performanceOptimizer.trackComponentRender(componentName);
}