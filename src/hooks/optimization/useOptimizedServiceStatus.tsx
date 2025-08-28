/**
 * Оптимизированный хук для статуса AI сервисов
 * Заменяет useAIServiceStatus с улучшенной производительностью
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { throttle } from '@/lib/performance/PerformanceOptimizer';
import { createComponentLogger } from '@/lib/debug/ConsoleManager';

const logger = createComponentLogger('useOptimizedServiceStatus');

export interface ServiceStatus {
  service: 'suno' | 'mureka';
  status: 'online' | 'offline' | 'limited' | 'checking';
  creditsRemaining?: number;
  creditsTotal?: number;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
  lastChecked: Date;
  error?: string;
}

export function useOptimizedServiceStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { service: 'suno', status: 'checking', lastChecked: new Date() },
    { service: 'mureka', status: 'checking', lastChecked: new Date() }
  ]);
  
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Оптимизированная проверка статуса одного сервиса
  const checkServiceStatus = useCallback(async (service: 'suno' | 'mureka'): Promise<ServiceStatus> => {
    logger.debug(`Checking ${service} status`);
    
    try {
      // Отменяем предыдущий запрос если он еще выполняется
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const { data, error } = await supabase.functions.invoke(`check-${service}-status`, {
        body: {}
      });

      if (error) {
        logger.warn(`${service} status check failed`, error);
        return {
          service,
          status: 'offline',
          lastChecked: new Date(),
          error: error.message
        };
      }

      logger.debug(`${service} status updated`, data);
      return {
        service,
        status: data.status || 'online',
        creditsRemaining: data.creditsRemaining,
        creditsTotal: data.creditsTotal,
        rateLimit: data.rateLimit ? {
          remaining: data.rateLimit.remaining,
          resetTime: new Date(data.rateLimit.resetTime)
        } : undefined,
        lastChecked: new Date()
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.debug(`${service} status check aborted`);
        return {
          service,
          status: 'checking',
          lastChecked: new Date()
        };
      }
      
      logger.error(`${service} status check error`, error);
      return {
        service,
        status: 'offline',
        lastChecked: new Date(),
        error: error.message || 'Неизвестная ошибка'
      };
    }
  }, []);

  // Throttled функция обновления статусов (не чаще раза в 10 секунд)
  const refreshStatuses = useCallback(
    throttle(async () => {
      logger.info('Refreshing service statuses');
      setIsLoading(true);
      
      try {
        // Параллельная проверка статусов
        const promises = (['suno', 'mureka'] as const).map(checkServiceStatus);
        const results = await Promise.allSettled(promises);
        
        const newStatuses: ServiceStatus[] = [];
        results.forEach((result, index) => {
          const service = ['suno', 'mureka'][index] as 'suno' | 'mureka';
          if (result.status === 'fulfilled') {
            newStatuses.push(result.value);
          } else {
            logger.error(`Failed to check ${service} status`, result.reason);
            newStatuses.push({
              service,
              status: 'offline',
              lastChecked: new Date(),
              error: result.reason?.message || 'Ошибка проверки статуса'
            });
          }
        });
        
        setServices(newStatuses);
        logger.info('Service statuses updated successfully');
        
      } catch (error: any) {
        logger.error('Failed to refresh statuses', error);
      } finally {
        setIsLoading(false);
      }
    }, 10000), // Throttle на 10 секунд
    [checkServiceStatus]
  );

  // Инициализация и автообновление
  useEffect(() => {
    // Начальная проверка
    refreshStatuses();
    
    // Устанавливаем интервал обновления (увеличен до 60 секунд для экономии ресурсов)
    intervalRef.current = setInterval(refreshStatuses, 60000);
    
    // Обработчик фокуса окна для обновления при возвращении пользователя
    const handleFocus = () => {
      logger.debug('Window focused, refreshing statuses');
      refreshStatuses();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshStatuses]);

  // Ручное обновление без throttling для немедленной проверки
  const forceRefresh = useCallback(async () => {
    logger.info('Force refreshing service statuses');
    setIsLoading(true);
    
    try {
      const promises = (['suno', 'mureka'] as const).map(checkServiceStatus);
      const results = await Promise.all(promises);
      setServices(results);
    } catch (error: any) {
      logger.error('Force refresh failed', error);
    } finally {
      setIsLoading(false);
    }
  }, [checkServiceStatus]);

  return {
    services,
    isLoading,
    refreshStatuses: forceRefresh // Используем forceRefresh для ручного вызова
  };
}