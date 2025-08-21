/**
 * @fileoverview Независимый хук для работы с Mureka AI
 * Полностью отделён от Suno унификации
 * @version 1.0.0
 * @author Claude Code Assistant
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ==========================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// ==========================================

interface MurekaGenerationRequest {
  lyrics?: string;
  title?: string;
  style?: string;
  model?: 'auto' | 'V7' | 'O1' | 'V6';
  instrumental?: boolean;
  projectId?: string;
  artistId?: string;
  inputType: 'lyrics' | 'description';
  prompt?: string;
  genre?: string;
  mood?: string;
  useInbox?: boolean;
}

interface MurekaTrack {
  id: string;
  title: string;
  lyrics: string;
  audio_url: string;
  instrumental_url?: string;
  duration: number;
  metadata: Record<string, any>;
}

interface GenerationStatus {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  tracks?: MurekaTrack[];
  error?: string;
  startTime: number;
}

interface UseMurekaGenerationReturn {
  // Состояние
  activeGenerations: Map<string, GenerationStatus>;
  isGenerating: boolean;
  
  // Функции
  generateTrack: (request: MurekaGenerationRequest) => Promise<string>;
  cancelGeneration: (generationId: string) => void;
  clearCompleted: () => void;
  
  // Утилиты
  getGenerationStatus: (generationId: string) => GenerationStatus | undefined;
  getCompletedTracks: () => MurekaTrack[];
}

// ==========================================
// ОСНОВНОЙ ХУК
// ==========================================

export function useMurekaGeneration(): UseMurekaGenerationReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Состояние активных генераций
  const [activeGenerations, setActiveGenerations] = useState<Map<string, GenerationStatus>>(new Map());
  
  // Ссылки для отмены запросов
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  
  // ====================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ====================================
  
  /**
   * Обновляет статус генерации
   */
  const updateGenerationStatus = useCallback((
    generationId: string, 
    updates: Partial<GenerationStatus>
  ) => {
    setActiveGenerations(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(generationId);
      if (current) {
        newMap.set(generationId, { ...current, ...updates });
      }
      return newMap;
    });
  }, []);
  
  /**
   * Валидация запроса
   */
  const validateRequest = useCallback((request: MurekaGenerationRequest): void => {
    if (request.inputType === 'lyrics' && !request.lyrics?.trim()) {
      throw new Error('Lyrics are required when inputType is "lyrics"');
    }
    
    if (request.inputType === 'description' && !request.prompt?.trim()) {
      throw new Error('Prompt is required when inputType is "description"');
    }
    
    if (!user) {
      throw new Error('Authentication required');
    }
  }, [user]);
  
  /**
   * Polling статуса генерации
   */
  const pollGenerationStatus = useCallback(async (
    generationId: string,
    controller: AbortController
  ): Promise<void> => {
    const maxAttempts = 60; // 3 минуты при интервале 3 секунды
    let attempts = 0;
    
    const poll = async (): Promise<void> => {
      if (controller.signal.aborted) return;
      
      attempts++;
      
      try {
        // Проверяем статус в базе данных
        const { data: generation, error } = await supabase
          .from('ai_generations')
          .select('*')
          .eq('id', generationId)
          .single();
        
        if (error || !generation) {
          throw new Error('Generation not found');
        }
        
        const progress = Math.min(90, (attempts / maxAttempts) * 90);
        
        updateGenerationStatus(generationId, {
          status: generation.status as 'processing' | 'completed' | 'failed',
          progress,
          message: getStatusMessage(generation.status, attempts)
        });
        
        if (generation.status === 'completed') {
          // Получаем созданные треки
          const { data: tracks } = await supabase
            .from('tracks')
            .select('*')
            .eq('metadata->>generation_id', generationId);
          
          updateGenerationStatus(generationId, {
            status: 'completed',
            progress: 100,
            message: 'Generation completed successfully',
            tracks: (tracks || []).map(track => ({
              ...track,
              metadata: track.metadata as Record<string, any>
            })) as MurekaTrack[]
          });
          
          toast({
            title: "🎵 Генерация завершена",
            description: `Создано ${tracks?.length || 0} треков`,
          });
          
          // Удаляем контроллер
          abortControllers.current.delete(generationId);
          return;
        }
        
        if (generation.status === 'failed') {
          updateGenerationStatus(generationId, {
            status: 'failed',
            progress: 0,
            message: 'Generation failed',
            error: (generation.metadata as any)?.error || 'Unknown error'
          });
          
          toast({
            title: "❌ Ошибка генерации",
            description: (generation.metadata as any)?.error || 'Неизвестная ошибка',
            variant: "destructive",
          });
          
          abortControllers.current.delete(generationId);
          return;
        }
        
        // Продолжаем polling если не завершено
        if (attempts < maxAttempts && !controller.signal.aborted) {
          setTimeout(() => poll(), 3000);
        } else if (attempts >= maxAttempts) {
          updateGenerationStatus(generationId, {
            status: 'failed',
            error: 'Generation timeout',
            message: 'Generation timed out'
          });
          
          toast({
            title: "⏱️ Время ожидания истекло",
            description: "Генерация заняла слишком много времени",
            variant: "destructive",
          });
          
          abortControllers.current.delete(generationId);
        }
        
      } catch (error: any) {
        console.error('[POLLING] Error:', error);
        
        if (attempts >= 3) {
          updateGenerationStatus(generationId, {
            status: 'failed',
            error: error.message,
            message: 'Polling failed'
          });
          
          toast({
            title: "❌ Ошибка отслеживания",
            description: error.message,
            variant: "destructive",
          });
          
          abortControllers.current.delete(generationId);
        } else {
          // Повторяем через 3 секунды при ошибках
          setTimeout(() => poll(), 3000);
        }
      }
    };
    
    // Начинаем polling
    poll();
  }, [updateGenerationStatus, toast, supabase]);
  
  /**
   * Получает сообщение статуса
   */
  const getStatusMessage = (status: string, attempts: number): string => {
    switch (status) {
      case 'processing':
        return `Generating track... (${attempts * 3}s)`;
      case 'completed':
        return 'Generation completed';
      case 'failed':
        return 'Generation failed';
      default:
        return 'Processing...';
    }
  };
  
  // ====================================
  // ОСНОВНЫЕ ФУНКЦИИ
  // ====================================
  
  /**
   * Генерация трека через Mureka AI
   */
  const generateTrack = useCallback(async (
    request: MurekaGenerationRequest
  ): Promise<string> => {
    
    try {
      validateRequest(request);
      
      console.log('[MUREKA] Starting generation with request:', request);
      
      const generationId = crypto.randomUUID();
      const controller = new AbortController();
      
      // Сохраняем контроллер для возможности отмены
      abortControllers.current.set(generationId, controller);
      
      // Инициализируем статус
      const initialStatus: GenerationStatus = {
        id: generationId,
        status: 'processing',
        progress: 0,
        message: 'Starting generation...',
        startTime: Date.now()
      };
      
      setActiveGenerations(prev => {
        const newMap = new Map(prev);
        newMap.set(generationId, initialStatus);
        return newMap;
      });
      
      toast({
        title: "🎵 Генерация начата",
        description: "Mureka AI создает ваш трек...",
      });
      
      // Вызываем Edge Function
      const { data, error } = await supabase.functions.invoke('mureka-generate', {
        body: request
      });
      
      if (error) {
        console.error('[MUREKA] Edge function error:', error);
        throw new Error(error.message || 'Generation failed');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      console.log('[MUREKA] Edge function success:', data);
      
      // Обновляем статус
      updateGenerationStatus(generationId, {
        progress: 10,
        message: 'Processing...'
      });
      
      // Начинаем polling статуса
      pollGenerationStatus(generationId, controller);
      
      return generationId;
      
    } catch (error: any) {
      console.error('[MUREKA] Generation failed:', error);
      
      toast({
        title: "❌ Ошибка генерации",
        description: error.message,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [validateRequest, updateGenerationStatus, pollGenerationStatus, toast, supabase]);
  
  /**
   * Отмена генерации
   */
  const cancelGeneration = useCallback((generationId: string) => {
    const controller = abortControllers.current.get(generationId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(generationId);
    }
    
    setActiveGenerations(prev => {
      const newMap = new Map(prev);
      newMap.delete(generationId);
      return newMap;
    });
    
    toast({
      title: "🛑 Генерация отменена",
      description: "Генерация была прервана пользователем",
    });
  }, [toast]);
  
  /**
   * Очистка завершенных генераций
   */
  const clearCompleted = useCallback(() => {
    setActiveGenerations(prev => {
      const newMap = new Map();
      for (const [id, status] of prev.entries()) {
        if (status.status === 'processing') {
          newMap.set(id, status);
        }
      }
      return newMap;
    });
  }, []);
  
  /**
   * Получение статуса конкретной генерации
   */
  const getGenerationStatus = useCallback((generationId: string): GenerationStatus | undefined => {
    return activeGenerations.get(generationId);
  }, [activeGenerations]);
  
  /**
   * Получение всех завершенных треков
   */
  const getCompletedTracks = useCallback((): MurekaTrack[] => {
    const tracks: MurekaTrack[] = [];
    
    for (const status of activeGenerations.values()) {
      if (status.status === 'completed' && status.tracks) {
        tracks.push(...status.tracks);
      }
    }
    
    return tracks;
  }, [activeGenerations]);
  
  // ====================================
  // ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ
  // ====================================
  
  const isGenerating = activeGenerations.size > 0 && 
    Array.from(activeGenerations.values()).some(status => status.status === 'processing');
  
  // ====================================
  // ВОЗВРАЩАЕМЫЕ ЗНАЧЕНИЯ
  // ====================================
  
  return {
    activeGenerations,
    isGenerating,
    generateTrack,
    cancelGeneration,
    clearCompleted,
    getGenerationStatus,
    getCompletedTracks,
  };
}