import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function useAIServiceStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      service: 'suno',
      status: 'checking',
      lastChecked: new Date(),
    },
    {
      service: 'mureka', 
      status: 'checking',
      lastChecked: new Date(),
    }
  ]);
  
  const [isLoading, setIsLoading] = useState(true);

  const checkServiceStatus = async (service: 'suno' | 'mureka'): Promise<ServiceStatus> => {
    try {
      const { data, error } = await supabase.functions.invoke(`check-${service}-status`, {
        body: {}
      });

      if (error) {
        return {
          service,
          status: 'offline',
          lastChecked: new Date(),
          error: error.message
        };
      }

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
    } catch (error) {
      return {
        service,
        status: 'offline',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  };

  const refreshStatuses = async () => {
    setIsLoading(true);
    const promises = ['suno' as const, 'mureka' as const].map(checkServiceStatus);
    const results = await Promise.all(promises);
    setServices(results);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshStatuses();
    
    // Обновляем статусы каждые 30 секунд
    const interval = setInterval(refreshStatuses, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    services,
    isLoading,
    refreshStatuses
  };
}