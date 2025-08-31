/**
 * Performance Monitor - компонент для мониторинга производительности приложения
 * Показывает статистики кеша, памяти и производительности в development режиме
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, MemoryStick, Zap, Database, AlertTriangle, Activity } from 'lucide-react';
import { performanceOptimizer } from '@/lib/performance/PerformanceOptimizer';
import { memoryManager } from '@/lib/optimization/MemoryManager';
import { logger } from '@/lib/debug/ConsoleManager';
// import { performanceMonitor } from '@/lib/performance/web-vitals';

interface PerformanceStats {
  cache: ReturnType<typeof performanceOptimizer.getStats>;
  memory: ReturnType<typeof memoryManager.getMemoryStats>;
  renderCount: number;
  jsHeapSize?: number;
  webVitals?: any; // ReturnType<typeof performanceMonitor.getSummary>;
}

export const PerformanceMonitor: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Показываем только в development режиме
  useEffect(() => {
    if (import.meta.env.DEV) {
      setIsVisible(true);
    }
  }, []);

  // Обновление статистик
  const updateStats = () => {
    try {
      const cacheStats = performanceOptimizer.getStats();
      const memoryStats = memoryManager.getMemoryStats();
      
      let jsHeapSize: number | undefined;
      if ('performance' in window && 'memory' in performance) {
        jsHeapSize = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // МБ
      }

      const webVitals = { total: 0, good: 0, needsImprovement: 0, poor: 0, metrics: {} }; // performanceMonitor.getSummary();

      setStats({
        cache: cacheStats,
        memory: memoryStats,
        renderCount: 0, // Можно добавить глобальный счетчик рендеров
        jsHeapSize,
        webVitals
      });
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to update stats:', error);
    }
  };

  useEffect(() => {
    if (!isVisible) return;

    updateStats();
    const interval = setInterval(updateStats, 5000); // Обновляем каждые 5 секунд

    return () => clearInterval(interval);
  }, [isVisible]);

  // Очистка кешей
  const handleClearCaches = () => {
    performanceOptimizer.clearCache();
    memoryManager.forceCleanup();
    logger.info('PerformanceMonitor', 'All caches cleared');
    updateStats();
  };

  if (!isVisible || !stats) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Performance Monitor
          </CardTitle>
          <CardDescription className="text-xs">
            Development mode only
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs defaultValue="cache" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="cache" className="text-xs">Cache</TabsTrigger>
              <TabsTrigger value="memory" className="text-xs">Memory</TabsTrigger>
              <TabsTrigger value="vitals" className="text-xs">Vitals</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cache" className="space-y-2 mt-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Cache Size:
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stats.cache.cacheSize}/{stats.cache.maxCacheSize}
                </Badge>
                
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Debounce:
                </div>
                <Badge variant="outline" className="text-xs">
                  {stats.cache.activeDebounceTimers}
                </Badge>
              </div>
            </TabsContent>
            
            <TabsContent value="memory" className="space-y-2 mt-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <MemoryStick className="h-3 w-3" />
                  Allocated:
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stats.memory.totalAllocated}
                </Badge>
                
                <div className="flex items-center gap-1">
                  <span>Utilization:</span>
                </div>
                <Badge 
                  variant={parseFloat(stats.memory.utilizationPercent) > 80 ? "destructive" : "outline"} 
                  className="text-xs"
                >
                  {stats.memory.utilizationPercent}%
                </Badge>
                
                {stats.jsHeapSize && (
                  <>
                    <div className="flex items-center gap-1">
                      <span>JS Heap:</span>
                    </div>
                    <Badge 
                      variant={stats.jsHeapSize > 100 ? "destructive" : "outline"} 
                      className="text-xs"
                    >
                      {stats.jsHeapSize.toFixed(1)} MB
                    </Badge>
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="vitals" className="space-y-2 mt-3">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-3 w-3" />
                  <span className="font-medium">Core Web Vitals</span>
                </div>
                
                {stats.webVitals && Object.entries(stats.webVitals.metrics || {}).map(([name, metric]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span>{name}:</span>
                    <Badge 
                      variant={
                        metric.rating === 'good' ? 'default' :
                        metric.rating === 'needs-improvement' ? 'secondary' : 
                        'destructive'
                      }
                      className="text-xs"
                    >
                      {metric?.value?.toFixed?.(0) || 0}{name === 'CLS' ? '' : 'ms'} ({metric?.rating || 'unknown'})
                    </Badge>
                  </div>
                ))}
                
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="flex justify-between text-xs">
                    <span>Total Metrics:</span>
                    <span>{stats.webVitals?.total || 0}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    <Badge variant="default" className="text-xs justify-center">
                      Good: {stats.webVitals?.good || 0}
                    </Badge>
                    <Badge variant="secondary" className="text-xs justify-center">
                      OK: {stats.webVitals?.needsImprovement || 0}
                    </Badge>
                    <Badge variant="destructive" className="text-xs justify-center">
                      Poor: {stats.webVitals?.poor || 0}
                    </Badge>
                  </div>
                </div>
                
                {import.meta.env.DEV && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-6 text-xs mt-2"
                    onClick={() => {
                      console.log('Web Vitals Details: (disabled for build optimization)');
                    }}
                  >
                    Log Details
                  </Button>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="logs" className="space-y-2 mt-3">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Error Logs:</span>
                  <Badge variant="destructive" className="text-xs">
                    {logger.getLogs(undefined, 'error').length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Warnings:</span>
                  <Badge variant="outline" className="text-xs">
                    {logger.getLogs(undefined, 'warn').length}
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full h-6 text-xs"
                  onClick={() => {
                    const logs = logger.exportLogs();
                    console.log('Exported logs:', logs);
                  }}
                >
                  Export Logs
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-6 text-xs"
              onClick={updateStats}
            >
              Refresh
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="flex-1 h-6 text-xs"
              onClick={handleClearCaches}
            >
              Clear Cache
            </Button>
          </div>
          
          {(parseFloat(stats.memory.utilizationPercent) > 80 || (stats.jsHeapSize && stats.jsHeapSize > 100)) && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              High memory usage detected
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};