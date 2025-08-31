/**
 * Bundle Size Monitoring and Budget Enforcement
 * Tracks bundle sizes and warns when budgets are exceeded
 */

// Bundle size budgets (in KB)
export const BUNDLE_BUDGETS = {
  // Initial bundle (critical path)
  initial: 400,
  
  // Total bundle size
  total: 800,
  
  // Individual chunk maximums
  chunks: {
    'vendor-react': 200,
    'vendor-ui-overlay': 150,
    'vendor-ui-form': 100,
    'vendor-utils': 80,
    'feature-ai-generation': 250,
    'components-ui': 100,
  },
  
  // Asset budgets
  assets: {
    images: 500,
    fonts: 100,
  }
} as const;

interface BundleInfo {
  name: string;
  size: number;
  gzipSize?: number;
  budget: number;
  exceeded: boolean;
  percentage: number;
}

interface BundleAnalysis {
  total: BundleInfo;
  initial: BundleInfo;
  chunks: BundleInfo[];
  assets: BundleInfo[];
  recommendations: string[];
}

class BundleMonitor {
  private analysis: BundleAnalysis | null = null;
  
  /**
   * Analyze bundle from Vite build output
   */
  public analyzeBuildOutput(buildOutput: string): BundleAnalysis {
    const chunks: BundleInfo[] = [];
    const assets: BundleInfo[] = [];
    const recommendations: string[] = [];
    
    // Parse Vite build output
    const lines = buildOutput.split('\n');
    let totalSize = 0;
    let initialSize = 0;
    
    for (const line of lines) {
      const match = line.match(/dist\/assets\/(.+?)\s+(\d+\.?\d*)\s+kB/);
      if (match) {
        const [, name, sizeStr] = match;
        const size = parseFloat(sizeStr);
        totalSize += size;
        
        // Determine if this is an initial chunk
        const isInitial = name.includes('index-') || name.includes('vendor-react');
        if (isInitial) {
          initialSize += size;
        }
        
        // Get budget for this chunk
        const chunkName = this.getChunkName(name);
        const budget = BUNDLE_BUDGETS.chunks[chunkName as keyof typeof BUNDLE_BUDGETS.chunks] || 50;
        
        const info: BundleInfo = {
          name: chunkName || name,
          size,
          budget,
          exceeded: size > budget,
          percentage: (size / budget) * 100,
        };
        
        if (name.includes('.css') || name.includes('images/') || name.includes('fonts/')) {
          assets.push(info);
        } else {
          chunks.push(info);
        }
        
        // Add recommendations for oversized chunks
        if (info.exceeded) {
          recommendations.push(this.getRecommendation(info));
        }
      }
    }
    
    this.analysis = {
      total: {
        name: 'Total Bundle',
        size: totalSize,
        budget: BUNDLE_BUDGETS.total,
        exceeded: totalSize > BUNDLE_BUDGETS.total,
        percentage: (totalSize / BUNDLE_BUDGETS.total) * 100,
      },
      initial: {
        name: 'Initial Bundle',
        size: initialSize,
        budget: BUNDLE_BUDGETS.initial,
        exceeded: initialSize > BUNDLE_BUDGETS.initial,
        percentage: (initialSize / BUNDLE_BUDGETS.initial) * 100,
      },
      chunks,
      assets,
      recommendations,
    };
    
    return this.analysis;
  }
  
  private getChunkName(filename: string): string | null {
    const patterns = {
      'vendor-react': /vendor-react/,
      'vendor-ui-overlay': /vendor-ui-overlay/,
      'vendor-ui-form': /vendor-ui-form/,
      'vendor-utils': /vendor-utils/,
      'feature-ai-generation': /feature-ai-generation/,
      'components-ui': /components-ui/,
    };
    
    for (const [name, pattern] of Object.entries(patterns)) {
      if (pattern.test(filename)) {
        return name;
      }
    }
    
    return null;
  }
  
  private getRecommendation(info: BundleInfo): string {
    const overage = info.size - info.budget;
    const percentage = Math.round(((info.size - info.budget) / info.budget) * 100);
    
    const recommendations = {
      'vendor-react': 'Consider using React 18 concurrent features or Preact as an alternative',
      'vendor-ui-overlay': 'Lazy load dialog and popover components using dynamic imports',
      'vendor-ui-form': 'Use selective imports for form validation libraries',
      'vendor-utils': 'Tree-shake unused utilities and consider lighter alternatives',
      'feature-ai-generation': 'Split AI generation into smaller feature chunks',
      'components-ui': 'Create dynamic imports for heavy UI components',
    };
    
    const specific = recommendations[info.name as keyof typeof recommendations] || 
                    'Consider code splitting or lazy loading for this chunk';
    
    return `${info.name} is ${overage.toFixed(1)}KB (${percentage}%) over budget. ${specific}`;
  }
  
  /**
   * Generate performance report
   */
  public generateReport(): string {
    if (!this.analysis) {
      return 'No bundle analysis available. Run analyzeBuildOutput() first.';
    }
    
    const { total, initial, chunks, assets, recommendations } = this.analysis;
    
    let report = '📊 Bundle Size Analysis Report\n';
    report += '================================\n\n';
    
    // Overall status
    const status = total.exceeded ? '❌ BUDGET EXCEEDED' : '✅ WITHIN BUDGET';
    report += `Status: ${status}\n`;
    report += `Total Size: ${total.size.toFixed(1)}KB / ${total.budget}KB (${total.percentage.toFixed(1)}%)\n`;
    report += `Initial Size: ${initial.size.toFixed(1)}KB / ${initial.budget}KB (${initial.percentage.toFixed(1)}%)\n\n`;
    
    // Chunk breakdown
    report += '📦 Chunk Breakdown:\n';
    for (const chunk of chunks) {
      const status = chunk.exceeded ? '❌' : '✅';
      report += `${status} ${chunk.name}: ${chunk.size.toFixed(1)}KB / ${chunk.budget}KB (${chunk.percentage.toFixed(1)}%)\n`;
    }
    report += '\n';
    
    // Recommendations
    if (recommendations.length > 0) {
      report += '💡 Recommendations:\n';
      for (const rec of recommendations) {
        report += `• ${rec}\n`;
      }
      report += '\n';
    }
    
    // Performance tips
    report += '🚀 Performance Tips:\n';
    report += '• Use dynamic imports for heavy features\n';
    report += '• Implement lazy loading for below-the-fold content\n';
    report += '• Use React.memo and useMemo for expensive components\n';
    report += '• Enable gzip compression on server\n';
    report += '• Consider service worker caching for repeat visits\n';
    
    return report;
  }
  
  /**
   * Check if build meets budget requirements
   */
  public checkBudget(): boolean {
    if (!this.analysis) return false;
    return !this.analysis.total.exceeded && !this.analysis.initial.exceeded;
  }
  
  /**
   * Get current analysis
   */
  public getAnalysis(): BundleAnalysis | null {
    return this.analysis;
  }
}

export const bundleMonitor = new BundleMonitor();