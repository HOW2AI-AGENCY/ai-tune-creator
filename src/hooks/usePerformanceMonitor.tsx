/**
 * @fileoverview Performance monitoring hook for React components
 * Tracks render performance, memory usage, and optimization metrics
 * @version 1.0.0
 * @author Claude Code Assistant
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryUsage?: number;
  componentName: string;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  trackMemory?: boolean;
  logToConsole?: boolean;
  sampleRate?: number; // 0-1, fraction of renders to measure
}

export function usePerformanceMonitor(
  componentName: string,
  options: UsePerformanceMonitorOptions = {}
) {
  const {
    enabled = true,
    trackMemory = false,
    logToConsole = false,
    sampleRate = 0.1
  } = options;

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    componentName
  });

  // Start timing before render
  if (enabled && Math.random() < sampleRate) {
    startTimeRef.current = performance.now();
  }

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;

    // Calculate render time if we started timing
    if (startTimeRef.current > 0) {
      const renderTime = performance.now() - startTimeRef.current;
      renderTimesRef.current.push(renderTime);
      
      // Keep only last 100 render times to prevent memory leak
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current = renderTimesRef.current.slice(-50);
      }

      const averageRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;

      let memoryUsage: number | undefined;
      if (trackMemory && (performance as any).memory) {
        memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      const newMetrics: PerformanceMetrics = {
        renderCount: renderCountRef.current,
        averageRenderTime,
        lastRenderTime: renderTime,
        memoryUsage,
        componentName
      };

      setMetrics(newMetrics);

      if (logToConsole && renderCountRef.current % 10 === 0) {
        console.log(`[Performance] ${componentName}:`, {
          renders: renderCountRef.current,
          avgRenderTime: `${averageRenderTime.toFixed(2)}ms`,
          lastRenderTime: `${renderTime.toFixed(2)}ms`,
          memoryMB: memoryUsage?.toFixed(2)
        });
      }

      startTimeRef.current = 0;
    }
  });

  const getMetrics = useCallback(() => metrics, [metrics]);

  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    renderTimesRef.current = [];
    setMetrics({
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      componentName
    });
  }, [componentName]);

  return {
    metrics,
    getMetrics,
    resetMetrics,
    enabled
  };
}

/**
 * HOC to wrap components with performance monitoring
 */
export function withPerformanceMonitor<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
  options?: UsePerformanceMonitorOptions
) {
  const WrappedComponent = (props: P) => {
    const { metrics } = usePerformanceMonitor(
      componentName || Component.displayName || Component.name || 'Unknown',
      options
    );

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitor(${componentName || Component.displayName || Component.name})`;
  
  return WrappedComponent;
}