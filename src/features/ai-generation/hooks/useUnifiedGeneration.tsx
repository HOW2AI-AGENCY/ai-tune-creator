/**
 * Unified Generation Hook
 * 
 * Replaces useTrackGenerationWithProgress with a cleaner, more reliable system
 * that provides immediate feedback and standardized progress tracking
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CanonicalGenerationInput, 
  UnifiedTaskProgress, 
  UnifiedTaskStatus,
  STANDARD_STEPS,
  mapToSunoRequest,
  mapToMurekaRequest,
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
      
      let response;
      if (input.service === 'suno') {
        const sunoRequest = mapToSunoRequest(input);
        response = await supabase.functions.invoke('generate-suno-track', {
          body: sunoRequest
        });
      } else {
        const murekaRequest = mapToMurekaRequest(input);
        response = await supabase.functions.invoke('generate-mureka-track', {
          body: murekaRequest
        });
      }

      if (response.error) {
        throw createStandardError('api', 'API call failed', response.error.message, undefined, input.service);
      }

      if (!response.data?.success) {
        throw createStandardError('api', 'Generation failed', response.data?.error || 'Unknown error', undefined, input.service);
      }

      const taskId = response.data.data?.task_id || response.data.data?.generation?.id;
      if (!taskId) {
        throw createStandardError('api', 'No task ID returned', 'The API did not return a valid task identifier', undefined, input.service);
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
        const functionName = service === 'suno' ? 'get-suno-record-info' : 'get-mureka-instrumental-status';
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { taskId, generationId }
        });

        if (error) {
          console.error('Status check error:', error);
          return;
        }

        // Update progress based on response
        if (data?.status === 'SUCCESS' || data?.completed) {
          updateProgress(generationId, { 
            status: 'completed', 
            overallProgress: 100,
            estimatedCompletion: new Date()
          });
          updateStep(generationId, 'generate', { status: 'done', progress: 100 });
          updateStep(generationId, 'process', { status: 'done', progress: 100 });
          updateStep(generationId, 'save', { status: 'done', progress: 100 });
          
          clearInterval(pollInterval);
          abortControllers.current.delete(generationId);

          toast({
            title: "Генерация завершена",
            description: "Трек успешно создан и сохранен в библиотеку"
          });
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
    }, 5000); // Poll every 5 seconds

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