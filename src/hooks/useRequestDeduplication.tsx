import { useRef, useCallback } from 'react';
import { createComponentLogger } from '@/lib/debug/ConsoleManager';

const logger = createComponentLogger('useRequestDeduplication');

/**
 * Хук для дедупликации запросов на уровне компонента
 * Предотвращает выполнение одинаковых запросов одновременно
 */
export function useRequestDeduplication() {
  const pendingRequests = useRef(new Map<string, Promise<any>>());

  const deduplicate = useCallback(function<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const existing = pendingRequests.current.get(key);
    
    if (existing) {
      logger.debug('Reusing existing request for key:', key);
      return existing as Promise<T>;
    }

    logger.debug('Creating new request for key:', key);
    const promise = requestFn().finally(() => {
      pendingRequests.current.delete(key);
    });

    pendingRequests.current.set(key, promise);
    return promise;
  }, []);

  const clear = useCallback(() => {
    pendingRequests.current.clear();
  }, []);

  return { deduplicate, clear };
}