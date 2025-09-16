/**
 * Unified Generation Hook
 * 
 * Replaces useTrackGenerationWithProgress with a cleaner, more reliable system
 * that provides immediate feedback and standardized progress tracking
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { eventBus } from '@/lib/events/event-bus';
import { 
  CanonicalGenerationInput, 
  UnifiedTaskProgress, 
  UnifiedTaskStatus,
  STANDARD_STEPS,
  createStandardError,
  StandardError
} from '../types/canonical';

interface UseUnifiedGenerationReturn {
  generateTrack: (input: CanonicalGenerationInput) => Promise<string>; // Returns generation ID
  activeGenerations: Map<string, UnifiedTaskProgress>;
  cancelGeneration: (generationId: string) => void;
  retryGeneration: (generationId: string) => void;
  clearCompleted: () => void;
  error: StandardError | null;
  clearError: () => void;
}

export function useUnifiedGeneration(): UseUnifiedGenerationReturn {
  const [activeGenerations, setActiveGenerations] = useState<Map<string, UnifiedTaskProgress>>(new Map());
  const [error, setError] = useState<StandardError | null>(null);
  const { toast } = useToast();
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  /**
   * Update progress for a specific generation
   */
  const updateProgress = useCallback((generationId: string, update: Partial<UnifiedTaskProgress>) => {
    setActiveGenerations(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(generationId);
      if (current) {
        newMap.set(generationId, { ...current, ...update });
      }
      return newMap;
    });
  }, []);

  /**
   * Update a specific step status
   */
  const updateStep = useCallback((generationId: string, stepId: string, update: { status?: 'pending' | 'running' | 'done' | 'error'; progress?: number; eta?: number }) => {
    setActiveGenerations(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(generationId);
      if (current) {
        const updatedSteps = current.steps.map(step => 
          step.id === stepId ? { ...step, ...update } : step
        );
        newMap.set(generationId, { ...current, steps: updatedSteps });
      }
      return newMap;
    });
  }, []);

  /**
   * Create initial progress state
   */
  const createInitialProgress = useCallback((
    generationId: string, 
    taskId: string, 
    service: 'suno' | 'mureka',
    input: CanonicalGenerationInput
  ): UnifiedTaskProgress => {
    return {
      taskId,
      generationId,
      service,
      status: 'pending',
      overallProgress: 0,
      steps: Object.values(STANDARD_STEPS).map(step => ({ ...step })),
      title: `Генерация ${service === 'suno' ? 'Suno AI' : 'Mureka'}`,
      subtitle: input.description.slice(0, 60) + (input.description.length > 60 ? '...' : ''),
      metadata: { input }
    };
  }, []);

  /**
   * Main generation function
   */
  const generateTrack = useCallback(async (input: CanonicalGenerationInput): Promise<string> => {
    const generationId = crypto.randomUUID();
    const abortController = new AbortController();
    abortControllers.current.set(generationId, abortController);

    try {
      // Clear any previous errors
      setError(null);

      // Show immediate feedback
      toast({
        title: "Запуск генерации",
        description: `Создаем трек с помощью ${input.service === 'suno' ? 'Suno AI' : 'Mureka'}...`
      });

      // Create initial progress
      const initialProgress = createInitialProgress(generationId, 'pending', input.service, input);
      setActiveGenerations(prev => new Map(prev).set(generationId, initialProgress));

      // Step 1: Validation
      updateStep(generationId, 'validate', { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 300)); // Visual feedback
      updateStep(generationId, 'validate', { status: 'done', progress: 100 });
      updateProgress(generationId, { overallProgress: 20 });

      // Step 2: Queue submission
      updateStep(generationId, 'queue', { status: 'running' });
      
      /**
       * ИСПРАВЛЕНО: Maps canonical input to Suno format with proper inputType handling
       */
      const mapToSunoRequest = (input: CanonicalGenerationInput) => {
        const isLyricsMode = input.inputType === 'lyrics';
        
        console.log('[UNIFIED] Mapping to Suno:', {
          inputType: input.inputType,
          hasLyrics: !!input.lyrics,
          isLyricsMode,
          description: input.description.substring(0, 50) + '...'
        });
        
        return {
          // ИСПРАВЛЕНО: Правильная обработка prompt и lyrics
          prompt: isLyricsMode ? 
            (input.tags.join(', ') || 'Создай музыку к этой лирике') : 
            input.description,
          lyrics: isLyricsMode ? input.lyrics : undefined,
          custom_lyrics: isLyricsMode ? input.lyrics : undefined, // дублируем для совместимости
          inputType: input.inputType,
          
          style: input.tags.join(', '),
          stylePrompt: isLyricsMode ? input.tags.join(', ') : '', // стиль отдельно для lyrics режима
          title: `AI Generated Track ${new Date().toLocaleDateString('ru-RU')}`,
          tags: input.tags.join(', '),
          make_instrumental: input.flags.instrumental,
          wait_audio: false,
          model: input.flags.model && input.flags.model !== "auto" ? input.flags.model : 'V3_5',
          mode: input.mode,
          voice_style: input.flags.voiceStyle || '',
          language: input.flags.language,
          tempo: input.flags.tempo || '',
          trackId: null,
          projectId: input.context.projectId || null,
          artistId: input.context.artistId || null,
          useInbox: input.context.useInbox
        };
      };

      /**
       * Maps canonical input to Mureka format with proper inputType handling
       */
      const mapToMurekaRequest = (input: CanonicalGenerationInput) => {
        const isInstrumental = input.flags.instrumental;
        const isLyricsInput = input.inputType === 'lyrics';
        
        // ИСПРАВЛЕНО: Правильный роутинг к нужной функции
        const functionName = isInstrumental ? 'generate-mureka-instrumental' : 'generate-mureka-track';
        
        return {
          endpoint: functionName,
          data: {
            // ИСПРАВЛЕНО: Правильная логика для Mureka API
            prompt: isLyricsInput ? 
              (input.tags.join(', ') || 'Generate music for these lyrics') : 
              input.description,
            lyrics: isLyricsInput ? input.lyrics : '[Auto-generated lyrics]',
            custom_lyrics: isLyricsInput ? input.lyrics : undefined,
            inputType: input.inputType, // Передаем тип для правильной обработки
            instrumental: isInstrumental,
            
            model: (input.flags.model || 'auto'),
            style: input.tags.join(', '),
            duration: input.flags.duration || 120,
            genre: input.tags[0] || 'electronic',
            mood: input.tags[1] || 'energetic',
            tempo: input.flags.tempo || 'medium',
            language: input.flags.language || 'auto',
            projectId: input.context.projectId || null,
            artistId: input.context.artistId || null,
            useInbox: input.context.useInbox
          }
        };
      };
      
      // Call appropriate service
      let taskId: string;
      if (input.service === 'suno') {
        const sunoRequest = mapToSunoRequest(input);
        console.log('🎵 Calling Suno with request:', {
          inputType: sunoRequest.inputType,
          hasLyrics: !!sunoRequest.lyrics,
          promptPreview: sunoRequest.prompt.slice(0, 100)
        });
        
        const { data, error } = await supabase.functions.invoke('generate-suno-track', {
          body: sunoRequest
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Suno generation failed');
        
        // Normalize task id field from edge function (task_id | taskId | id)
        taskId = data.data.task_id || data.data.taskId || data.data.id;
      } else {
        const murekaRequest = mapToMurekaRequest(input);
        console.log('🎶 Calling Mureka with request:', {
          endpoint: murekaRequest.endpoint,
          isInstrumental: murekaRequest.data.instrumental,
          hasLyrics: !!murekaRequest.data.lyrics,
          promptPreview: murekaRequest.data.prompt.slice(0, 100)
        });
        
        const { data, error } = await supabase.functions.invoke(murekaRequest.endpoint, {
          body: murekaRequest.data
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Mureka generation failed');
        
        // Normalize task id from various possible fields
        taskId = data.data.taskId 
          || data.data.task_id 
          || data.data.mureka_task_id 
          || data.data.generation_id 
          || data.data.id;
      }


      // Update with real task ID
      updateProgress(generationId, { 
        taskId, 
        status: 'queued',
        overallProgress: 40,
        estimatedCompletion: new Date(Date.now() + (input.service === 'suno' ? 60000 : 120000)) // Estimate based on service
      });
      updateStep(generationId, 'queue', { status: 'done', progress: 100 });
      updateStep(generationId, 'generate', { status: 'running' });

      toast({
        title: "Генерация запущена",
        description: `Задача ${taskId} добавлена в очередь ${input.service === 'suno' ? 'Suno AI' : 'Mureka'}`
      });

      // Start monitoring progress
      startProgressMonitoring(generationId, taskId, input.service);

      return generationId;

    } catch (error: any) {
      console.error('Generation error:', error);
      
      // Handle different error types
      let standardError: StandardError;
      if (error.name === 'AbortError') {
        standardError = createStandardError('unknown', 'Generation cancelled', 'User cancelled the operation');
      } else if (error instanceof Error && error.message.includes('fetch')) {
        standardError = createStandardError('network', 'Network error', error.message);
      } else if (error.type) {
        standardError = error as StandardError;
      } else {
        standardError = createStandardError('unknown', 'Generation failed', error.message || 'Unknown error occurred');
      }

      setError(standardError);
      
      // Update progress to show error
      updateProgress(generationId, { status: 'failed', overallProgress: 0 });
      updateStep(generationId, 'queue', { status: 'error' });

      toast({
        title: "Ошибка генерации",
        description: standardError.message,
        variant: "destructive"
      });

      throw standardError;
    }
  }, [toast, updateProgress, updateStep, createInitialProgress]);

  /**
   * Start monitoring progress for a generation
   */
  const startProgressMonitoring = useCallback((generationId: string, taskId: string, service: 'suno' | 'mureka') => {
    const pollInterval = setInterval(async () => {
      try {
        // Ускоренный и более частый поллинг + ранний апдейт состояния
        const currentGeneration = activeGenerations.get(generationId);
        const isInstrumental = currentGeneration?.metadata?.input?.flags?.instrumental;
        let functionName: string;
        if (service === 'suno') {
          functionName = 'get-suno-record-info';
        } else {
          functionName = isInstrumental ? 'get-mureka-instrumental-status' : 'get-mureka-task-status';
        }
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { 
            taskId, 
            ...(generationId && generationId !== 'pending' ? { generationId } : {})
          }
        });
        if (error) {
          console.error('Status check error:', error);
          return;
        }
        // Немедленный переход в generating на первом успешном ответе
        updateProgress(generationId, { status: 'generating', overallProgress: service === 'suno' ? 60 : 70 });
        updateStep(generationId, 'generate', { status: 'running', progress: service === 'suno' ? 60 : 70 });
        if (data?.status === 'SUCCESS' || data?.completed || data?.response?.sunoData?.length > 0 || data?.all_tracks?.length > 0) {
          updateProgress(generationId, { 
            status: 'completed', 
            overallProgress: 100,
            estimatedCompletion: new Date()
          });
          updateStep(generationId, 'generate', { status: 'done', progress: 100 });
          updateStep(generationId, 'process', { status: 'done', progress: 100 });
          updateStep(generationId, 'save', { status: 'done', progress: 100 });
          
          // Trigger background download for completed tracks
          if (service === 'mureka' && (data.mureka?.choices?.[0]?.url || data.mureka?.choices?.[0]?.audio_url || data.audio_url)) {
            const murekaAudioUrl = data.mureka?.choices?.[0]?.url || data.mureka?.choices?.[0]?.audio_url || data.audio_url;
            console.log('🎵 Triggering background download for Mureka track:', murekaAudioUrl);
            
            // Background download and save (don't await to avoid blocking UI)
            supabase.functions.invoke('download-and-save-track', {
              body: {
                generation_id: generationId,
                external_url: murekaAudioUrl,
                taskId: taskId,
                filename: data.mureka?.title || data.title || `mureka-${taskId}`
              }
            }).catch(error => {
              console.error('Background download failed:', error);
            });
          } else if (service === 'suno' && (data.tracks?.length > 0 || data.response?.sunoData?.length > 0 || data.all_tracks?.length > 0)) {
            console.log('🎵 Triggering background download for Suno tracks');
            
            // Get tracks from the correct path (Suno returns data in response.sunoData or all_tracks from metadata)
            const sunoTracks = data.tracks || data.response?.sunoData || data.all_tracks || [];
            console.log('🎵 Found Suno tracks:', sunoTracks.length);
            
            // Download and save each Suno track
            sunoTracks.forEach((track: any, index: number) => {
              const audioUrl = track.audioUrl || track.audio_url;
              if (audioUrl) {
                console.log('🎵 Downloading Suno track:', audioUrl);
                supabase.functions.invoke('download-and-save-track', {
                  body: {
                    generation_id: generationId,
                    external_url: audioUrl,
                    taskId: taskId,
                    filename: track.title || `suno-${taskId}-${index + 1}`
                  }
                }).catch(error => {
                  console.error('Background download failed for Suno track:', error);
                });
              }
            });
          }
          
          clearInterval(pollInterval);
          abortControllers.current.delete(generationId);

          toast({
            title: "Генерация завершена",
            description: "Трек успешно создан и сохранен в библиотеку"
          });

          // Auto-remove completed task after 2 seconds and refresh tracks
          setTimeout(() => {
            setActiveGenerations(prev => {
              const newMap = new Map(prev);
              newMap.delete(generationId);
              return newMap;
            });
            // Emit tracks updated event
            eventBus.emit('tracks-updated');
          }, 2000);
        } else if (data?.status === 'FAILED' || data?.failed) {
          updateProgress(generationId, { status: 'failed', overallProgress: 0 });
          updateStep(generationId, 'generate', { status: 'error' });
          
          clearInterval(pollInterval);
          abortControllers.current.delete(generationId);

          toast({
            title: "Генерация завершилась с ошибкой",
            description: data?.error || "Неизвестная ошибка при генерации",
            variant: "destructive"
          });
        } else {
          // Still processing - update progress
          const progressValue = service === 'suno' ? 60 : 70; // Different progress for different services
          updateProgress(generationId, { 
            status: 'generating', 
            overallProgress: progressValue 
          });
          updateStep(generationId, 'generate', { status: 'running', progress: progressValue });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2500); // Poll every 2.5 seconds

    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      const current = activeGenerations.get(generationId);
      if (current && current.status !== 'completed' && current.status !== 'failed') {
        updateProgress(generationId, { status: 'timeout' });
        toast({
          title: "Генерация превысила время ожидания",
          description: "Проверьте статус вручную или попробуйте снова",
          variant: "destructive"
        });
      }
    }, 10 * 60 * 1000);

  }, [activeGenerations, updateProgress, updateStep, toast]);

  /**
   * Cancel a generation
   */
  const cancelGeneration = useCallback((generationId: string) => {
    const controller = abortControllers.current.get(generationId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(generationId);
    }
    
    updateProgress(generationId, { status: 'cancelled' });
    toast({
      title: "Генерация отменена",
      description: "Задача была остановлена"
    });
  }, [updateProgress, toast]);

  /**
   * Retry a failed generation
   */
  const retryGeneration = useCallback(async (generationId: string) => {
    const generation = activeGenerations.get(generationId);
    if (generation?.metadata?.input) {
      await generateTrack(generation.metadata.input);
    }
  }, [activeGenerations, generateTrack]);

  /**
   * Clear completed generations
   */
  const clearCompleted = useCallback(() => {
    setActiveGenerations(prev => {
      const newMap = new Map();
      for (const [id, generation] of prev) {
        if (generation.status !== 'completed' && generation.status !== 'failed') {
          newMap.set(id, generation);
        }
      }
      return newMap;
    });
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateTrack,
    activeGenerations,
    cancelGeneration,
    retryGeneration,
    clearCompleted,
    error,
    clearError
  };
}