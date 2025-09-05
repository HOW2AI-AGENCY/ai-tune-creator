/**
 * @fileoverview Web Vitals performance reporting
 * @version 1.0.0
 */

export interface WebVitalsMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface PerformanceReport {
  url: string;
  timestamp: number;
  metrics: WebVitalsMetric[];
  userAgent: string;
  connectionType?: string;
}

class WebVitalsReporter {
  private static instance: WebVitalsReporter;
  private metrics: Map<string, WebVitalsMetric> = new Map();
  private reportingEnabled = false;

  static getInstance(): WebVitalsReporter {
    if (!WebVitalsReporter.instance) {
      WebVitalsReporter.instance = new WebVitalsReporter();
    }
    return WebVitalsReporter.instance;
  }

  enableReporting() {
    this.reportingEnabled = true;
    console.log('[WebVitalsReporter] Performance reporting enabled');
  }

  disableReporting() {
    this.reportingEnabled = false;
    console.log('[WebVitalsReporter] Performance reporting disabled');
  }

  recordMetric(metric: WebVitalsMetric) {
    if (!this.reportingEnabled) return;

    this.metrics.set(metric.name, metric);
    
    // Log important metrics immediately
    if (['CLS', 'FID', 'LCP'].includes(metric.name)) {
      this.logMetric(metric);
    }
  }

  private logMetric(metric: WebVitalsMetric) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`[WebVitals] ${emoji} ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }

  generateReport(): PerformanceReport {
    return {
      url: window.location.href,
      timestamp: Date.now(),
      metrics: Array.from(this.metrics.values()),
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType
    };
  }

  getMetricsByRating(rating: 'good' | 'needs-improvement' | 'poor') {
    return Array.from(this.metrics.values()).filter(m => m.rating === rating);
  }

  getWorstMetrics(count = 3) {
    const ratingOrder = { 'poor': 3, 'needs-improvement': 2, 'good': 1 };
    return Array.from(this.metrics.values())
      .sort((a, b) => ratingOrder[b.rating] - ratingOrder[a.rating])
      .slice(0, count);
  }

  clear() {
    this.metrics.clear();
  }

  // Export data for analytics
  exportMetrics() {
    const report = this.generateReport();
    
    if (this.reportingEnabled) {
      console.group('[WebVitals Report]');
      console.log('Performance Metrics:', report.metrics);
      console.log('Connection:', report.connectionType);
      console.log('Worst Metrics:', this.getWorstMetrics());
      console.groupEnd();
    }
    
    return report;
  }
}

export const webVitalsReporter = WebVitalsReporter.getInstance();

// Thresholds based on Google's Core Web Vitals
export const WEB_VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  LCP: { good: 2500, poor: 4000 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
};

export function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS];
  if (!thresholds) return 'good';
  
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}