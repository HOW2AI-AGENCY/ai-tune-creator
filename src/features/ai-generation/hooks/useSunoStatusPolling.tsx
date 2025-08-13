import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SunoStatusData {
  task_id: string;
  status: string;
  generation_id: string;
  track_id?: string;
  created_at: string;
  result_url?: string;
  track?: any;
  metadata?: any;
}

interface UseSunoStatusPollingProps {
  taskId?: string;
  enabled?: boolean;
  onComplete?: (data: SunoStatusData) => void;
  onError?: (error: string) => void;
}

export function useSunoStatusPolling({ 
  taskId, 
  enabled = true, 
  onComplete, 
  onError 
}: UseSunoStatusPollingProps) {
  const [data, setData] = useState<SunoStatusData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const checkStatus = useCallback(async (currentTaskId: string) => {
    try {
      console.log('Checking Suno status for task:', currentTaskId);
      
      const { data: response, error } = await supabase.functions.invoke('suno-status', {
        body: { task_id: currentTaskId }
      });

      if (error) {
        throw error;
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to check status');
      }

      const statusData = response.data;
      setData(statusData);
      setError(null);

      console.log('Status check result:', statusData.status);

      // Если генерация завершена
      if (statusData.status === 'completed') {
        setIsPolling(false);
        
        if (statusData.track && statusData.track.audio_url) {
          toast({
            title: "🎵 Трек готов!",
            description: `${statusData.track.title} успешно сгенерирован`
          });
          
          onComplete?.(statusData);
        }
      } else if (statusData.status === 'failed') {
        setIsPolling(false);
        const errorMsg = 'Генерация трека не удалась';
        setError(errorMsg);
        
        toast({
          title: "❌ Ошибка генерации",
          description: errorMsg,
          variant: "destructive"
        });
        
        onError?.(errorMsg);
      }

      return statusData;
    } catch (err: any) {
      console.error('Error checking status:', err);
      const errorMsg = err.message || 'Ошибка проверки статуса';
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }
  }, [toast, onComplete, onError]);

  // Polling effect
  useEffect(() => {
    if (!taskId || !enabled) {
      setIsPolling(false);
      return;
    }

    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const startPolling = async () => {
      setIsPolling(true);
      
      // Первая проверка сразу
      const initialStatus = await checkStatus(taskId);
      
      if (initialStatus?.status === 'processing') {
        // Настраиваем polling каждые 10 секунд
        intervalId = setInterval(async () => {
          const status = await checkStatus(taskId);
          if (status?.status !== 'processing') {
            clearInterval(intervalId);
            setIsPolling(false);
          }
        }, 10000); // 10 секунд

        // Максимальное время ожидания - 10 минут
        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          setIsPolling(false);
          setError('Превышено время ожидания генерации');
          
          toast({
            title: "⏱️ Время ожидания истекло",
            description: "Генерация занимает слишком много времени",
            variant: "destructive"
          });
        }, 10 * 60 * 1000); // 10 минут
      } else {
        setIsPolling(false);
      }
    };

    startPolling();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      setIsPolling(false);
    };
  }, [taskId, enabled, checkStatus]);

  const startPolling = useCallback((newTaskId: string) => {
    setData(null);
    setError(null);
    setIsPolling(true);
    // Будет подхвачено useEffect
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    data,
    isPolling,
    error,
    checkStatus: (id: string) => checkStatus(id),
    startPolling,
    stopPolling
  };
}