import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIGeneration {
  id: string;
  user_id: string;
  service: 'suno' | 'mureka';
  status: 'processing' | 'completed' | 'failed' | 'pending';
  task_id?: string;
  external_id?: string;
  prompt?: string;
  result_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  progress?: number;
  title?: string;
  duration?: number;
  artist_name?: string;
  project_name?: string;
  track_id?: string;
  metadata?: any;
  parameters?: any;
}

export function useGenerationState() {
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Changed: Start with false for immediate loading feedback
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadGenerations = useCallback(async () => {
    try {
      setIsLoading(true); // Set loading only when actually loading
      
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading generations:', error);
        toast.error('Ошибка загрузки генераций');
        return;
      }

      const formattedGenerations = (data || []).map(item => ({
        ...item,
        service: item.service as 'suno' | 'mureka',
        status: item.status as 'processing' | 'completed' | 'failed' | 'pending'
      }));

      setGenerations(formattedGenerations);
      console.log(`Loaded ${formattedGenerations.length} generations`);
    } catch (error) {
      console.error('Error loading generations:', error);
      toast.error('Ошибка загрузки генераций');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkGenerationStatus = useCallback(async (generationId: string) => {
    try {
      setIsRefreshing(true);
      const generation = generations.find(g => g.id === generationId);
      if (!generation) return;

      const functionName = generation.service === 'suno' 
        ? 'get-suno-record-info' 
        : 'get-mureka-task-status';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          taskId: generation.external_id || generation.task_id,
          generationId: generation.id
        }
      });

      if (error) {
        console.error('Status check error:', error);
        toast.error(`Ошибка проверки статуса: ${error.message}`);
        return;
      }

      console.log('Status check result:', data);

      // Reload generations after any status check
      await loadGenerations();
      
      if (data?.status === 'completed' || data?.completed) {
        toast.success('Генерация завершена!');
      } else if (data?.status === 'failed' || data?.failed) {
        toast.error('Генерация завершилась с ошибкой');
      } else {
        toast.info('Проверка статуса выполнена');
      }

    } catch (error) {
      console.error('Error checking generation status:', error);
      toast.error('Ошибка проверки статуса');
    } finally {
      setIsRefreshing(false);
    }
  }, [generations, loadGenerations]);

  const syncTracks = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase.functions.invoke('sync-generated-tracks');
      
      if (error) {
        toast.error(`Ошибка синхронизации: ${error.message}`);
        return;
      }

      await loadGenerations();
      toast.success('Треки синхронизированы');
    } catch (error) {
      console.error('Error syncing tracks:', error);
      toast.error('Ошибка синхронизации треков');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadGenerations]);

  // Auto-poll processing generations every 15 seconds (faster polling)
  useEffect(() => {
    const processingGenerations = generations.filter(g => g.status === 'processing');
    
    if (processingGenerations.length === 0) return;

    console.log(`Starting auto-poll for ${processingGenerations.length} processing generations`);

    const interval = setInterval(() => {
      processingGenerations.forEach(gen => {
        console.log(`Auto-checking status for generation ${gen.id}`);
        checkGenerationStatus(gen.id);
      });
    }, 15000); // Reduced from 30s to 15s for faster updates

    return () => {
      console.log('Stopping auto-poll interval');
      clearInterval(interval);
    };
  }, [generations, checkGenerationStatus]);

  useEffect(() => {
    loadGenerations();
  }, [loadGenerations]);

  return {
    generations,
    isLoading,
    isRefreshing,
    loadGenerations,
    checkGenerationStatus,
    syncTracks
  };
}