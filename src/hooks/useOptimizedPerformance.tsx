/**
 * @fileoverview Optimized performance monitoring hook with web vitals
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { usePerformanceMonitor } from './usePerformanceMonitor';

interface WebVitalsMetrics {
  CLS?: number;
  FID?: number;
  FCP?: number;
  LCP?: number;
  TTFB?: number;
}

interface UseOptimizedPerformanceOptions {
  enabled?: boolean;
  reportWebVitals?: boolean;
  componentName?: string;
}

export function useOptimizedPerformance(options: UseOptimizedPerformanceOptions = {}) {
  const { enabled = true, reportWebVitals = false, componentName = 'Unknown' } = options;
  const webVitalsRef = useRef<WebVitalsMetrics>({});
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);

  const { metrics: renderMetrics } = usePerformanceMonitor(componentName, {
    enabled,
    trackMemory: true,
    sampleRate: 0.1
  });

  const collectWebVitals = useCallback(() => {
    if (!reportWebVitals || typeof window === 'undefined') return;

    try {
      // Collect Core Web Vitals when available
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            webVitalsRef.current.TTFB = navEntry.responseStart - navEntry.requestStart;
          }
          
          if (entry.entryType === 'paint') {
            if (entry.name === 'first-contentful-paint') {
              webVitalsRef.current.FCP = entry.startTime;
            }
          }

          if (entry.entryType === 'largest-contentful-paint') {
            webVitalsRef.current.LCP = entry.startTime;
          }

          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            webVitalsRef.current.CLS = (webVitalsRef.current.CLS || 0) + (entry as any).value;
          }

          if (entry.entryType === 'first-input') {
            webVitalsRef.current.FID = (entry as any).processingStart - entry.startTime;
          }
        }
      });

      // Observe different entry types
      const entryTypes = ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift', 'first-input'];
      entryTypes.forEach(type => {
        try {
          observer.observe({ type, buffered: true });
        } catch (e) {
          // Some browsers might not support all entry types
        }
      });

      performanceObserverRef.current = observer;
    } catch (error) {
      console.warn('Performance monitoring not supported:', error);
    }
  }, [reportWebVitals]);

  const getPerformanceReport = useCallback(() => {
    return {
      renderMetrics,
      webVitals: webVitalsRef.current,
      timestamp: Date.now(),
      componentName
    };
  }, [renderMetrics, componentName]);

  const logPerformanceReport = useCallback(() => {
    if (!enabled) return;
    
    const report = getPerformanceReport();
    console.group(`[Performance Report] ${componentName}`);
    console.log('Render Metrics:', report.renderMetrics);
    console.log('Web Vitals:', report.webVitals);
    console.groupEnd();
  }, [enabled, getPerformanceReport, componentName]);

  useEffect(() => {
    if (!enabled) return;

    collectWebVitals();

    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, [enabled, collectWebVitals]);

  return {
    renderMetrics,
    webVitals: webVitalsRef.current,
    getPerformanceReport,
    logPerformanceReport
  };
}

/**
 * HOC для автоматического мониторинга производительности компонентов
 */
export function withOptimizedPerformance<P extends object>(
  Component: React.ComponentType<P>,
  options?: UseOptimizedPerformanceOptions
) {
  const WrappedComponent = React.memo((props: P) => {
    const componentName = options?.componentName || Component.displayName || Component.name || 'Unknown';
    
    useOptimizedPerformance({
      enabled: true,
      reportWebVitals: true,
      componentName,
      ...options
    });

    return <Component {...props} />;
  });

  WrappedComponent.displayName = `withOptimizedPerformance(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}