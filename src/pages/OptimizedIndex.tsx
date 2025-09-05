/**
 * @fileoverview Optimized Index page with performance improvements
 * @version 1.0.0
 */

import React, { Suspense, useEffect } from 'react';
import { UserStatsPanel } from '@/components/dashboard/UserStatsPanel';
import { PublicTracksFeed } from '@/components/dashboard/PublicTracksFeed';
import { Card, CardContent } from '@/components/ui/card';
import { BundlePreloader } from '@/lib/optimization/BundleOptimizer';
import { usePrefetchHeavyData } from '@/hooks/useOptimizedQueries';

// Lazy loading for non-critical components
const WelcomeSection = React.lazy(() => 
  import('@/components/dashboard/WelcomeSection').then(module => ({ 
    default: module.WelcomeSection 
  }))
);

const LoadingFallback = React.memo(() => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
));

LoadingFallback.displayName = 'LoadingFallback';

export const OptimizedIndex = React.memo(() => {
  const { prefetchOnIdle } = usePrefetchHeavyData();

  useEffect(() => {
    // Preload critical routes in the background
    BundlePreloader.preloadCriticalRoutes();
    
    // Prefetch heavy data when browser is idle
    prefetchOnIdle();
    
    // Preload user-specific modules
    BundlePreloader.preloadOnIdle(['UniversalAIInterface']);
  }, [prefetchOnIdle]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Critical above-the-fold content */}
      <UserStatsPanel />
      
      {/* Non-critical content with lazy loading */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <Suspense fallback={<LoadingFallback />}>
            <WelcomeSection />
          </Suspense>
        </div>
        
        <div>
          <PublicTracksFeed limit={10} />
        </div>
      </div>
    </div>
  );
});

OptimizedIndex.displayName = 'OptimizedIndex';

export default OptimizedIndex;