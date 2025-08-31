/**
 * Web Vitals Performance Monitoring
 * Tracks Core Web Vitals metrics and sends them to analytics
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

interface Metric {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

interface PerformanceEntry {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
}

// Performance thresholds based on Google recommendations
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

class PerformanceMonitor {
  private entries: PerformanceEntry[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production' || 
                     localStorage.getItem('debug-performance') === 'true';
  }

  private getRating(name: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[name];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private handleMetric(metric: Metric) {
    if (!this.isEnabled) return;

    const entry: PerformanceEntry = {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
      rating: this.getRating(metric.name as keyof typeof THRESHOLDS, metric.value),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.entries.push(entry);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development' || localStorage.getItem('debug-performance') === 'true') {
      this.logMetric(entry);
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(entry);
    }

    // Emit custom event
    window.dispatchEvent(new CustomEvent('web-vital', { detail: entry }));
  }

  private logMetric(entry: PerformanceEntry) {
    const color = entry.rating === 'good' ? 'green' : entry.rating === 'needs-improvement' ? 'orange' : 'red';
    console.log(
      `%c${entry.name}: ${entry.value}ms (${entry.rating})`,
      `color: ${color}; font-weight: bold;`,
      entry
    );
  }

  private async sendToAnalytics(entry: PerformanceEntry) {
    try {
      // Send to Google Analytics 4 if available
      if (typeof gtag !== 'undefined') {
        gtag('event', entry.name, {
          event_category: 'Web Vitals',
          event_label: entry.id,
          value: Math.round(entry.value),
          custom_parameter_1: entry.rating,
        });
      }

      // Send to custom analytics endpoint if available
      if (window.location.hostname !== 'localhost') {
        fetch('/api/analytics/web-vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).catch(err => console.warn('Failed to send web vitals:', err));
      }
    } catch (error) {
      console.warn('Error sending web vitals to analytics:', error);
    }
  }

  public init() {
    if (!this.isEnabled) return;

    // Monitor Core Web Vitals
    onCLS(this.handleMetric.bind(this));
    onFID(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));
  }

  public getEntries(): PerformanceEntry[] {
    return [...this.entries];
  }

  public getSummary() {
    const summary = {
      total: this.entries.length,
      good: this.entries.filter(e => e.rating === 'good').length,
      needsImprovement: this.entries.filter(e => e.rating === 'needs-improvement').length,
      poor: this.entries.filter(e => e.rating === 'poor').length,
      metrics: {} as Record<string, PerformanceEntry>,
    };

    // Get latest value for each metric
    for (const entry of this.entries) {
      if (!summary.metrics[entry.name] || entry.timestamp > summary.metrics[entry.name].timestamp) {
        summary.metrics[entry.name] = entry;
      }
    }

    return summary;
  }

  public enable() {
    this.isEnabled = true;
    localStorage.setItem('debug-performance', 'true');
    this.init();
  }

  public disable() {
    this.isEnabled = false;
    localStorage.removeItem('debug-performance');
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize automatically
performanceMonitor.init();

// Export for manual initialization if needed
export default performanceMonitor;