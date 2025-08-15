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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadGenerations = useCallback(async () => {
    try {
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

      setGenerations((data || []).map(item => ({
        ...item,
        service: item.service as 'suno' | 'mureka',
        status: item.status as 'processing' | 'completed' | 'failed' | 'pending'
      })));
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
        : 'get-mureka-instrumental-status';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          taskId: generation.task_id || generation.external_id,
          generationId: generation.id
        }
      });

      if (error) {
        toast.error(`Ошибка проверки статуса: ${error.message}`);
        return;
      }

      if (data.completed || data.failed) {
        // Reload generations to get updated data
        await loadGenerations();
        
        if (data.completed) {
          toast.success('Генерация завершена!');
        } else if (data.failed) {
          toast.error('Генерация завершилась с ошибкой');
        }
      } else {
        toast.info('Генерация все еще обрабатывается...');
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

  // Auto-poll processing generations every 30 seconds
  useEffect(() => {
    const processingGenerations = generations.filter(g => g.status === 'processing');
    
    if (processingGenerations.length === 0) return;

    const interval = setInterval(() => {
      processingGenerations.forEach(gen => {
        checkGenerationStatus(gen.id);
      });
    }, 30000);

    return () => clearInterval(interval);
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