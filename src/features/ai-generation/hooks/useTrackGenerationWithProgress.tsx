import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSunoStatusPolling } from './useSunoStatusPolling';

interface TrackGenerationProgress {
  title: string;
  subtitle?: string;
  progress?: number;
  steps: Array<{
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
  }>;
}

interface GenerationParams {
  prompt: string;
  service: 'suno' | 'mureka';
  projectId?: string;
  artistId?: string;
  genreTags?: string[];
  mode?: 'quick' | 'custom';
  customLyrics?: string;
  tempo?: string;
  duration?: number;
  instrumental?: boolean;
  voiceStyle?: string;
  language?: string;
  stylePrompt?: string;
}

export function useTrackGenerationWithProgress() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<TrackGenerationProgress | null>(null);
  const [currentTask, setCurrentTask] = useState<{
    taskId: string;
    service: string;
    generationId?: string;
  } | null>(null);
  
  const { toast } = useToast();
  const { startPolling, stopPolling } = useSunoStatusPolling({});

  const updateProgress = useCallback((update: Partial<TrackGenerationProgress>) => {
    setGenerationProgress(prev => prev ? { ...prev, ...update } : null);
  }, []);

  const resetProgress = useCallback(() => {
    setGenerationProgress(null);
  }, []);

  const generateTrack = useCallback(async (params: GenerationParams): Promise<any> => {
    try {
      setIsGenerating(true);
      
      // Инициализируем прогресс
      setGenerationProgress({
        title: "Генерируем музыкальный трек",
        subtitle: `Используем ${params.service === 'suno' ? 'Suno AI' : 'Mureka'} для создания трека`,
        progress: 0,
        steps: [
          { id: 'prepare', label: 'Подготовка запроса', status: 'running' },
          { id: 'generate', label: 'Отправка в AI сервис', status: 'pending' },
          { id: 'process', label: 'Обработка трека', status: 'pending' },
          { id: 'save', label: 'Сохранение результата', status: 'pending' }
        ]
      });

      // Имитируем прогресс подготовки
      await new Promise(resolve => setTimeout(resolve, 500));
      updateProgress({
        progress: 25,
        steps: [
          { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
          { id: 'generate', label: 'Отправка в AI сервис', status: 'running' },
          { id: 'process', label: 'Обработка трека', status: 'pending' },
          { id: 'save', label: 'Сохранение результата', status: 'pending' }
        ]
      });

      console.log('=== TRACK GENERATION START ===');
      console.log('Service:', params.service);
      console.log('Mode:', params.mode);
      console.log('Params:', params);
      
      let data, error;
      
      if (params.service === 'suno') {
        const response = await supabase.functions.invoke('generate-suno-track', {
          body: {
            prompt: params.prompt,
            style: params.stylePrompt || '',
            title: `AI Generated Track ${new Date().toLocaleDateString('ru-RU')}`,
            tags: params.genreTags?.join(', ') || 'energetic, creative',
            make_instrumental: params.instrumental || false,
            wait_audio: false, // Используем асинхронный режим
            model: 'chirp-v3-5',
            trackId: null,
            projectId: params.projectId || null,
            artistId: params.artistId || null,
            mode: params.mode || 'quick',
            custom_lyrics: params.customLyrics || '',
            voice_style: params.voiceStyle || '',
            language: params.language || 'ru',
            tempo: params.tempo || ''
          }
        });
        
        data = response.data;
        error = response.error;
        
        updateProgress({
          progress: 50,
          steps: [
            { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
            { id: 'process', label: 'Обработка трека', status: 'running' },
            { id: 'save', label: 'Сохранение результата', status: 'pending' }
          ]
        });
        
      } else if (params.service === 'mureka') {
        const response = await supabase.functions.invoke('generate-mureka-track', {
          body: {
            prompt: params.prompt,
            duration: params.duration || 120,
            instrumental: params.instrumental || false,
            projectId: params.projectId || null
          }
        });
        
        data = response.data;
        error = response.error;
        
        updateProgress({
          progress: 50,
          steps: [
            { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
            { id: 'process', label: 'Обработка трека', status: 'running' },
            { id: 'save', label: 'Сохранение результата', status: 'pending' }
          ]
        });
      }

      if (error) {
        console.error('Edge Function Error:', error);
        updateProgress({
          steps: [
            { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'error' },
            { id: 'process', label: 'Обработка трека', status: 'pending' },
            { id: 'save', label: 'Сохранение результата', status: 'pending' }
          ]
        });
        throw error;
      }

      if (!data?.success) {
        console.error('Generation failed:', data);
        updateProgress({
          steps: [
            { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'error' },
            { id: 'process', label: 'Обработка трека', status: 'pending' },
            { id: 'save', label: 'Сохранение результата', status: 'pending' }
          ]
        });
        throw new Error(data?.error || 'Generation failed');
      }

      console.log('Generation successful:', data);
      
      // Обновляем прогресс до завершения
      updateProgress({
        progress: 75,
        steps: [
          { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
          { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
          { id: 'process', label: 'Обработка трека', status: 'done' },
          { id: 'save', label: 'Сохранение результата', status: 'running' }
        ]
      });

      // Если получили task ID, начинаем polling
      if (data.data?.task_id && params.service === 'suno') {
        setCurrentTask({
          taskId: data.data.task_id,
          service: params.service,
          generationId: data.data.generation?.id
        });
        
        updateProgress({
          title: "Обрабатываем трек в Suno AI",
          subtitle: `Задача ${data.data.task_id} выполняется...`,
          progress: 80
        });
        
        // Запускаем polling статуса
        startPolling(data.data.task_id);
        
        // Имитируем обновления прогресса для polling
        const progressInterval = setInterval(() => {
          updateProgress({
            progress: Math.min(95, (generationProgress?.progress || 80) + 5)
          });
        }, 3000);
        
        // Очистка интервала через 30 секунд
        setTimeout(() => {
          clearInterval(progressInterval);
          updateProgress({
            progress: 100,
            title: "Трек готов!",
            subtitle: "Генерация успешно завершена",
            steps: [
              { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
              { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
              { id: 'process', label: 'Обработка трека', status: 'done' },
              { id: 'save', label: 'Сохранение результата', status: 'done' }
            ]
          });
        }, 30000);
      } else {
        // Мгновенное завершение для non-Suno сервисов
        updateProgress({
          progress: 100,
          title: "Трек готов!",
          subtitle: "Генерация успешно завершена",
          steps: [
            { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
            { id: 'process', label: 'Обработка трека', status: 'done' },
            { id: 'save', label: 'Сохранение результата', status: 'done' }
          ]
        });
      }

      toast({
        title: "Генерация запущена",
        description: data.data?.message || "Трек создается с помощью ИИ"
      });

      return data;
      
    } catch (error: any) {
      console.error('=== GENERATION ERROR ===', error);
      
      updateProgress({
        steps: [
          { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
          { id: 'generate', label: 'Отправка в AI сервис', status: 'error' },
          { id: 'process', label: 'Обработка треков', status: 'pending' },
          { id: 'save', label: 'Сохранение результата', status: 'pending' }
        ]
      });
      
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось создать трек",
        variant: "destructive"
      });
      
      throw error;
    } finally {
      // Сбрасываем прогресс через небольшую задержку
      setTimeout(() => {
        setIsGenerating(false);
        resetProgress();
        setCurrentTask(null);
      }, 2000);
    }
  }, [toast, startPolling, updateProgress, resetProgress]);

  return {
    generateTrack,
    isGenerating,
    generationProgress,
    currentTask,
    cancelGeneration: () => {
      stopPolling();
      setIsGenerating(false);
      resetProgress();
      setCurrentTask(null);
    }
  };
}