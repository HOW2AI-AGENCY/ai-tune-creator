/**
 * Component Optimizer - оптимизация React компонентов
 * Предоставляет HOC и хуки для оптимизации рендеринга
 */

import React, { memo, useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { createComponentLogger } from '@/lib/debug/ConsoleManager';

const logger = createComponentLogger('ComponentOptimizer');

// HOC для мемоизации компонентов с глубоким сравнением
export function withDeepMemo<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  compareProps?: (prevProps: T, nextProps: T) => boolean
) {
  const MemoizedComponent = memo(Component, compareProps || deepEqual);
  MemoizedComponent.displayName = `DeepMemo(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

// Глубокое сравнение объектов
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

// Хук для стабильных колбеков с dependency tracking
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList>(deps);
  
  // Обновляем callback только если зависимости изменились
  if (!deepEqual(deps, depsRef.current)) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }
  
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

// Хук для мемоизации с глубоким сравнением зависимостей
export function useDeepMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const depsRef = useRef<React.DependencyList>(deps);
  const valueRef = useRef<T>();
  
  if (!deepEqual(deps, depsRef.current) || valueRef.current === undefined) {
    valueRef.current = factory();
    depsRef.current = deps;
  }
  
  return valueRef.current!;
}

// Хук для отложенного выполнения (batching)
export function useBatchedUpdate<T>(
  initialValue: T,
  delay: number = 16 // Один фрейм
): [T, (value: T) => void] {
  const [state, setState] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingValueRef = useRef<T>();
  
  const batchedSetState = useCallback((value: T) => {
    pendingValueRef.current = value;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(pendingValueRef.current!);
      timeoutRef.current = undefined;
    }, delay);
  }, [delay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return [state, batchedSetState];
}

// Хук для отслеживания производительности компонента
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (renderCountRef.current % 10 === 0) {
      logger.debug(`${componentName} performance`, {
        renderCount: renderCountRef.current,
        avgRenderInterval: timeSinceLastRender,
        timestamp: now
      });
    }
    
    lastRenderTime.current = now;
  });
  
  return {
    renderCount: renderCountRef.current,
    getStats: () => ({
      renderCount: renderCountRef.current,
      lastRenderTime: lastRenderTime.current
    })
  };
}

// Хук для виртуализации списков (базовая реализация)
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);
  
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    onScroll,
    totalHeight: visibleItems.totalHeight
  };
}