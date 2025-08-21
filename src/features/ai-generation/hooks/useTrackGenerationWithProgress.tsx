/**
 * TODO: This hook is in transition to unified generation system
 * Will be replaced by useUnifiedGeneration in v0.01.037
 * @deprecated Use useUnifiedGeneration instead
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSunoStatusPolling } from './useSunoStatusPolling';
import { useGenerationPersistence } from '@/hooks/useGenerationPersistence';
import { useTranslation } from '@/hooks/useTranslation';

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
  model?: string; // Added: selected model (V3_5 | V4 | V4_5 | V4_5PLUS | auto)
  inputType: 'description' | 'lyrics'; // CRITICAL: Add this field
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
  const { t } = useTranslation();
  const { startPolling, stopPolling } = useSunoStatusPolling({});
  const { startGeneration, updateGeneration, completeGeneration, ongoingGenerations } = useGenerationPersistence();

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
        title: t('generateTrack'),
        subtitle: `${params.service === 'suno' ? 'Suno AI' : 'Mureka'}`,
        progress: 0,
        steps: [
          { id: 'prepare', label: t('statusPreparing'), status: 'running' },
          { id: 'generate', label: 'Отправка в AI сервис', status: 'pending' },
          { id: 'process', label: t('statusProcessing'), status: 'pending' },
          { id: 'save', label: t('statusSaving'), status: 'pending' }
        ]
      });

      // Имитируем прогресс подготовки
      await new Promise(resolve => setTimeout(resolve, 500));
      updateProgress({
        progress: 25,
        steps: [
          { id: 'prepare', label: t('statusPreparing'), status: 'done' },
          { id: 'generate', label: 'Отправка в AI сервис', status: 'running' },
          { id: 'process', label: t('statusProcessing'), status: 'pending' },
          { id: 'save', label: t('statusSaving'), status: 'pending' }
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
            prompt: params.prompt, // Always use prompt field
            style: params.stylePrompt || params.genreTags?.join(', ') || '',
            title: `AI Generated Track ${new Date().toLocaleDateString('ru-RU')}`,
            tags: params.genreTags?.join(', ') || 'energetic, creative',
            make_instrumental: params.instrumental || false,
            wait_audio: false,
            model: params.model && params.model !== 'auto' ? params.model : 'V3_5',
            trackId: null,
            projectId: params.projectId || null,
            artistId: params.artistId || null,
            mode: params.mode || 'quick',
            custom_lyrics: params.customLyrics || '',
            voice_style: params.voiceStyle || '',
            language: params.language || 'ru',
            tempo: params.tempo || '',
            inputType: params.inputType // CRITICAL: Pass inputType
          }
        });
        
        data = response.data;
        error = response.error;
        
        updateProgress({
          progress: 50,
          steps: [
            { id: 'prepare', label: t('statusPreparing'), status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
            { id: 'process', label: t('statusProcessing'), status: 'running' },
            { id: 'save', label: t('statusSaving'), status: 'pending' }
          ]
        });
        
      } else if (params.service === 'mureka') {
        // Используем новый независимый Mureka endpoint
        const murekaPayload = {
          inputType: params.inputType,
          projectId: params.projectId || null,
          artistId: params.artistId || null,
          model: params.model && params.model !== 'auto' ? params.model : 'auto',
          instrumental: params.instrumental || false,
          useInbox: !params.projectId // если нет проекта, отправляем в inbox
        };
        
        // Добавляем контент в зависимости от типа ввода
        if (params.inputType === 'lyrics') {
          (murekaPayload as any).lyrics = params.prompt; // Для лирики используем prompt
          (murekaPayload as any).title = `Mureka Track ${new Date().toLocaleDateString('ru-RU')}`;
        } else {
          (murekaPayload as any).prompt = params.prompt; // Для описания используем prompt
          (murekaPayload as any).title = `Mureka Track ${new Date().toLocaleDateString('ru-RU')}`;
        }
        
        // Добавляем жанр и настроение
        if (params.genreTags && params.genreTags.length > 0) {
          (murekaPayload as any).genre = params.genreTags[0];
          if (params.genreTags.length > 1) {
            (murekaPayload as any).mood = params.genreTags[1];
          }
        }
        
        const response = await supabase.functions.invoke('mureka-generate', {
          body: murekaPayload
        });
        
        data = response.data;
        error = response.error;
        
        updateProgress({
          progress: 50,
          steps: [
            { id: 'prepare', label: t('statusPreparing'), status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
            { id: 'process', label: t('statusProcessing'), status: 'running' },
            { id: 'save', label: t('statusSaving'), status: 'pending' }
          ]
        });
      }

      if (error) {
        console.error('Edge Function Error:', error);
        updateProgress({
          steps: [
            { id: 'prepare', label: t('statusPreparing'), status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'error' },
            { id: 'process', label: t('statusProcessing'), status: 'pending' },
            { id: 'save', label: t('statusSaving'), status: 'pending' }
          ]
        });
        throw error;
      }

      if (!data?.success) {
        console.error('Generation failed:', data);
        updateProgress({
          steps: [
            { id: 'prepare', label: t('statusPreparing'), status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'error' },
            { id: 'process', label: t('statusProcessing'), status: 'pending' },
            { id: 'save', label: t('statusSaving'), status: 'pending' }
          ]
        });
        throw new Error(data?.error || 'Generation failed');
      }

      console.log('Generation successful:', data);
      
      // Обновляем прогресс до завершения
      updateProgress({
        progress: 75,
        steps: [
          { id: 'prepare', label: t('statusPreparing'), status: 'done' },
          { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
          { id: 'process', label: t('statusProcessing'), status: 'done' },
          { id: 'save', label: t('statusSaving'), status: 'running' }
        ]
      });

      // Если получили task ID, начинаем polling и сохраняем в persistence
      if (data.data?.task_id) {
        const taskData = {
          taskId: data.data.task_id,
          service: params.service,
          generationId: data.data.generation?.id
        };
        
        setCurrentTask(taskData);
        
        updateProgress({
          title: "Обрабатываем трек в Suno AI",
          subtitle: `Задача ${data.data.task_id} выполняется...`,
          progress: 80
        });
        
        // Сохраняем в persistence для восстановления после перезагрузки
        startGeneration({
          taskId: data.data.task_id,
          service: params.service as 'suno' | 'mureka',
          generationId: data.data.generation?.id,
          status: 'processing',
          progress: 80,
          title: params.prompt || 'AI Generated Track',
          subtitle: `Используем ${params.service === 'suno' ? 'Suno AI' : 'Mureka'}`,
          params,
          steps: [
            { id: 'prepare', label: t('statusPreparing'), status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
            { id: 'process', label: t('statusProcessing'), status: 'running' },
            { id: 'save', label: t('statusSaving'), status: 'pending' }
          ]
        });
        
        // Запускаем polling статуса для всех сервисов
        if (params.service === 'suno') {
          startPolling(data.data.task_id);
        } else if (params.service === 'mureka') {
          // Для нового независимого Mureka endpoint polling не нужен - он делает всё синхронно
          // Просто показываем уведомление что трек готов
          toast({
            title: "Трек готов!",
            description: "Mureka AI успешно сгенерировал трек"
          });
          
          // Обновляем список треков в UI
          window.dispatchEvent(new CustomEvent('tracks-updated'));
        }
      } else if (params.service === 'mureka') {
        // Новый независимый Mureka endpoint делает всё автоматически
        // включая сохранение в базу данных и загрузку в Storage
        console.log('Mureka generation completed successfully:', data);
        
        updateProgress({
          progress: 100,
          title: "Трек готов!",
          subtitle: "Mureka AI завершил генерацию и сохранение",
          steps: [
            { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
            { id: 'process', label: 'Обработка трека', status: 'done' },
            { id: 'save', label: 'Сохранение результата', status: 'done' }
          ]
        });
        
        // Обновляем список треков в UI
        window.dispatchEvent(new CustomEvent('tracks-updated'));
        
        toast({
          title: "Трек готов!",
          description: `Сгенерировано ${data.data?.tracks?.length || 1} треков с помощью Mureka AI`
        });
      } else {
        // Завершение для других случаев
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
    ongoingGenerations,
    cancelGeneration: () => {
      stopPolling();
      setIsGenerating(false);
      resetProgress();
      setCurrentTask(null);
    }
  };
}