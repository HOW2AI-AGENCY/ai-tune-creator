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
            model: 'chirp-v3-5',
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
        const response = await supabase.functions.invoke('generate-mureka-track', {
          body: {
            prompt: params.prompt, // Always use prompt field
            lyrics: params.customLyrics || '',
            custom_lyrics: params.customLyrics || '',
            style: params.stylePrompt || params.genreTags?.join(', ') || '',
            duration: params.duration || 120,
            genre: params.genreTags?.[0] || 'electronic',
            mood: params.genreTags?.[1] || 'energetic',
            tempo: params.tempo || 'medium',
            instrumental: params.instrumental || false,
            language: params.language || 'ru',
            projectId: params.projectId || null,
            artistId: params.artistId || null,
            title: `AI Generated Track ${new Date().toLocaleDateString('ru-RU')}`,
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
      if (data.data?.task_id && params.service === 'suno') {
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
        
        // Запускаем polling статуса
        startPolling(data.data.task_id);
      } else if (params.service === 'mureka') {
        // Для Mureka - сохраняем в persistence для фоновой обработки
        if (data.data?.generation?.id) {
          startGeneration({
            taskId: data.data.generation.id,
            service: params.service as 'suno' | 'mureka',
            generationId: data.data.generation.id,
            status: 'processing',
            progress: 80,
            title: params.prompt || 'AI Generated Track',
            subtitle: 'Используем Mureka',
            params,
            steps: [
              { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
              { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
              { id: 'process', label: 'Обработка трека', status: 'running' },
              { id: 'save', label: 'Сохранение результата', status: 'pending' }
            ]
          });
        }

        // Если уже есть аудио URL, сразу сохраняем
        if (data.data?.audio_url) {
          try {
            const saveResponse = await supabase.functions.invoke('save-mureka-track', {
              body: {
                generation_id: data.data.generation?.id,
                audio_url: data.data.audio_url,
                title: data.data.title,
                duration: data.data.duration,
                metadata: data.metadata
              }
            });

            if (saveResponse.error) {
              console.error('Error saving Mureka track:', saveResponse.error);
              toast({
                title: "Трек сгенерирован, но не сохранен",
                description: "Трек создан, но возникла ошибка при сохранении в библиотеку",
                variant: "destructive"
              });
            } else {
              console.log('Mureka track saved successfully:', saveResponse.data);
              toast({
                title: "Трек сохранен в библиотеку",
                description: "Трек успешно добавлен в вашу музыкальную коллекцию"
              });
            }
          } catch (saveError) {
            console.error('Save error:', saveError);
          }
        }

        updateProgress({
          progress: 100,
          title: "Трек готов!",
          subtitle: "Генерация и сохранение завершены",
          steps: [
            { id: 'prepare', label: 'Подготовка запроса', status: 'done' },
            { id: 'generate', label: 'Отправка в AI сервис', status: 'done' },
            { id: 'process', label: 'Обработка трека', status: 'done' },
            { id: 'save', label: 'Сохранение результата', status: 'done' }
          ]
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