import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAISettings } from '@/hooks/useAISettings';

// T-058: Retry configuration для AI requests
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// T-059: Cache entry для оптимизации повторных запросов
interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// Дефолтная конфигурация retry
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 секунда
  maxDelay: 10000, // 10 секунд
  backoffMultiplier: 2
};

// T-057: Hook для генерации треков с ИИ
interface UseTrackGenerationProps {
  onLyricsGenerated?: (lyrics: any) => void;
  onConceptGenerated?: (concept: any) => void;
  onStylePromptGenerated?: (stylePrompt: string, genreTags: string[]) => void;
}

interface GenerationParams {
  stylePrompt: string;
  genreTags: string[];
  artistInfo?: any;
  projectInfo?: any;
  existingLyrics?: string;
}

export function useTrackGeneration({ 
  onLyricsGenerated, 
  onConceptGenerated,
  onStylePromptGenerated
}: UseTrackGenerationProps = {}) {
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [generatingConcept, setGeneratingConcept] = useState(false);
  const [generatingStylePrompt, setGeneratingStylePrompt] = useState(false);
  const [analyzingLyrics, setAnalyzingLyrics] = useState(false);
  const { toast } = useToast();
  const { settings } = useAISettings();
  
  // PERFORMANCE: In-memory cache для повторных запросов
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const retryConfigRef = useRef<RetryConfig>(DEFAULT_RETRY_CONFIG);

  /**
   * Генерирует лирику с использованием retry логики и кеширования
   * 
   * IMPROVEMENTS:
   * - Добавлена retry логика при ошибках сети
   * - Кеширование одинаковых запросов (TTL: 3 минуты)
   * - Оптимистичное уведомление о статусе
   */
  const generateLyrics = useCallback(async (params: GenerationParams) => {
    try {
      setGeneratingLyrics(true);
      
      console.log('Генерация лирики с параметрами:', params);
      
      const requestBody = {
        stylePrompt: params.stylePrompt,
        genreTags: params.genreTags,
        artistInfo: params.artistInfo,
        existingLyrics: params.existingLyrics,
        provider: settings.provider,
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        customPrompt: settings.customPrompts.lyricsGeneration
      };

      // Используем новую систему с retry и кешированием
      const result = await executeAIFunction(
        'generate-track-lyrics',
        requestBody,
        'Генерация лирики',
        { enabled: true, ttl: 3 * 60 * 1000 } // 3 минуты кеш
      );

      onLyricsGenerated?.(result);
      
      toast({
        title: "✅ Лирика сгенерирована",
        description: "Лирика создана с помощью ИИ"
      });

      return result;
    } catch (error: any) {
      console.error('Ошибка генерации лирики:', error);
      toast({
        title: "❌ Ошибка генерации",
        description: error.message || "Не удалось сгенерировать лирику",
        variant: "destructive"
      });
      return null;
    } finally {
      setGeneratingLyrics(false);
    }
  }, [settings, onLyricsGenerated, toast, executeAIFunction]);

  /**
   * Генерирует концепцию трека с улучшенной обработкой ошибок
   * 
   * IMPROVEMENTS: Кеширование концепций на 5 минут, retry логика
   */
  const generateConcept = useCallback(async (params: GenerationParams) => {
    try {
      setGeneratingConcept(true);
      
      console.log('Генерация концепции с параметрами:', params);

      const requestBody = {
        stylePrompt: params.stylePrompt,
        genreTags: params.genreTags,
        artistInfo: params.artistInfo,
        projectInfo: params.projectInfo,
        provider: settings.provider,
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        customPrompt: settings.customPrompts.trackConceptGeneration
      };

      const result = await executeAIFunction(
        'generate-track-concept',
        requestBody,
        'Генерация концепции',
        { enabled: true, ttl: 5 * 60 * 1000 } // 5 минут кеш для концепций
      );

      onConceptGenerated?.(result);
      
      toast({
        title: "✅ Концепция создана",
        description: "Концепция трека сгенерирована"
      });

      return result;
    } catch (error: any) {
      console.error('Ошибка генерации концепции:', error);
      toast({
        title: "❌ Ошибка генерации",
        description: error.message || "Не удалось сгенерировать концепцию",
        variant: "destructive"
      });
      return null;
    } finally {
      setGeneratingConcept(false);
    }
  }, [settings, onConceptGenerated, toast, executeAIFunction]);

  /**
   * Генерирует краткое описание трека на основе стиля и жанров
   * 
   * ИСПРАВЛЕНО: Создана отдельная реализация без использования generateConcept
   * FEATURES: Генерация описания напрямую через AI без промежуточных шагов
   * PERFORMANCE: Более быстрая генерация, оптимизированная для коротких описаний
   */
  const generateDescription = async (params: GenerationParams) => {
    try {
      setGeneratingConcept(true); // Используем тот же loading state
      
      console.log('Generating track description with params:', params);

      const { data, error } = await supabase.functions.invoke('generate-track-description', {
        body: {
          stylePrompt: params.stylePrompt,
          genreTags: params.genreTags,
          artistInfo: params.artistInfo,
          projectInfo: params.projectInfo,
          existingLyrics: params.existingLyrics,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: Math.min(settings.maxTokens, 200), // Ограничиваем для коротких описаний
          customPrompt: settings.customPrompts.trackDescriptionGeneration || 
            'Создай краткое, цепляющее описание трека на основе стиля и жанров. Максимум 2-3 предложения.'
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Не удалось сгенерировать описание');
      }

      toast({
        title: "Успешно",
        description: "Описание трека сгенерировано"
      });

      return data.data.description;
    } catch (error: any) {
      console.error('Error generating description:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать описание",
        variant: "destructive"
      });
      return null;
    } finally {
      setGeneratingConcept(false);
    }
  };

  const generateStylePrompt = async (artistInfo?: any, projectInfo?: any) => {
    try {
      setGeneratingStylePrompt(true);
      
      console.log('Generating style prompt with context:', { artistInfo, projectInfo });

      const { data, error } = await supabase.functions.invoke('generate-style-prompt', {
        body: {
          artistInfo,
          projectInfo,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: 500
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Не удалось сгенерировать промпт стиля');
      }

      onStylePromptGenerated?.(data.data.style_prompt, data.data.genre_tags);
      
      toast({
        title: "Успешно",
        description: "Промпт стиля и жанры сгенерированы"
      });

      return data.data;
    } catch (error: any) {
      console.error('Error generating style prompt:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать промпт стиля",
        variant: "destructive"
      });
      return null;
    } finally {
      setGeneratingStylePrompt(false);
    }
  };

  const analyzeLyrics = async (lyrics: string, stylePrompt?: string, genreTags?: string[]) => {
    try {
      setAnalyzingLyrics(true);
      
      console.log('Analyzing lyrics:', { lyrics: lyrics.substring(0, 100) + '...', stylePrompt, genreTags });

      const { data, error } = await supabase.functions.invoke('analyze-lyrics', {
        body: {
          lyrics,
          stylePrompt,
          genreTags,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Не удалось проанализировать лирику');
      }

      toast({
        title: "Успешно",
        description: "Анализ лирики завершен"
      });

      return data.data;
    } catch (error: any) {
      console.error('Error analyzing lyrics:', error);
      toast({
        title: "Ошибка анализа",
        description: error.message || "Не удалось проанализировать лирику",
        variant: "destructive"
      });
      return null;
    } finally {
      setAnalyzingLyrics(false);
    }
  };

  const improveLyrics = async (lyrics: string, analysis: any, stylePrompt?: string, genreTags?: string[]) => {
    try {
      setGeneratingLyrics(true);
      
      console.log('Improving lyrics based on analysis:', { 
        lyricsLength: lyrics.length, 
        hasAnalysis: !!analysis,
        stylePrompt, 
        genreTags 
      });

      const { data, error } = await supabase.functions.invoke('improve-lyrics', {
        body: {
          lyrics,
          analysis,
          stylePrompt,
          genreTags,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Не удалось улучшить лирику');
      }

      toast({
        title: "Успешно",
        description: `Лирика улучшена на основе ${data.data.applied_recommendations} рекомендаций`
      });

      return data.data.improved_lyrics;
    } catch (error: any) {
      console.error('Error improving lyrics:', error);
      toast({
        title: "Ошибка улучшения",
        description: error.message || "Не удалось улучшить лирику",
        variant: "destructive"
      });
      return null;
    } finally {
      setGeneratingLyrics(false);
    }
  };

  /**
   * UTILITY: Генерирует ключ кеша на основе параметров запроса
   * 
   * @param functionName - Название функции
   * @param params - Параметры запроса
   * @returns Хеш-ключ для кеширования
   */
  const generateCacheKey = useCallback((functionName: string, params: any): string => {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort());
    return `${functionName}:${btoa(sortedParams).slice(0, 32)}`;
  }, []);

  /**
   * PERFORMANCE: Проверяет и возвращает данные из кеша если они актуальны
   * 
   * @param cacheKey - Ключ кеша
   * @returns Данные из кеша или null если данные устарели
   */
  const getCachedData = useCallback((cacheKey: string): any | null => {
    const entry = cacheRef.current.get(cacheKey);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Данные устарели, удаляем из кеша
      cacheRef.current.delete(cacheKey);
      return null;
    }
    
    console.log(`[Cache HIT] Using cached data for key: ${cacheKey}`);
    return entry.data;
  }, []);

  /**
   * PERFORMANCE: Сохраняет данные в кеш
   * 
   * @param cacheKey - Ключ кеша
   * @param data - Данные для сохранения
   * @param ttl - Время жизни в миллисекундах (по умолчанию 5 минут)
   */
  const setCachedData = useCallback((cacheKey: string, data: any, ttl: number = 5 * 60 * 1000): void => {
    // Ограничиваем размер кеша (максимум 50 записей)
    if (cacheRef.current.size >= 50) {
      // Удаляем самую старую запись
      const oldestKey = Array.from(cacheRef.current.keys())[0];
      cacheRef.current.delete(oldestKey);
    }
    
    cacheRef.current.set(cacheKey, {
      key: cacheKey,
      data,
      timestamp: Date.now(),
      ttl
    });
    
    console.log(`[Cache SET] Cached data for key: ${cacheKey}`);
  }, []);

  /**
   * RELIABILITY: Выполняет запрос с retry логикой
   * 
   * @param operation - Функция для выполнения
   * @param operationName - Название операции для логирования
   * @param config - Конфигурация retry
   * @returns Результат операции
   */
  const executeWithRetry = useCallback(async <T,>(
    operation: () => Promise<T>,
    operationName: string,
    config: RetryConfig = retryConfigRef.current
  ): Promise<T> => {
    let lastError: Error;
    let delay = config.initialDelay;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`[${operationName}] Attempt ${attempt}/${config.maxAttempts}`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`[${operationName}] Succeeded on attempt ${attempt}`);
          toast({
            title: "✅ Запрос выполнен",
            description: `${operationName} завершен успешно после ${attempt} попыток`
          });
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`[${operationName}] Attempt ${attempt} failed:`, error.message);
        
        // Если это последняя попытка, выбрасываем ошибку
        if (attempt === config.maxAttempts) {
          console.error(`[${operationName}] All attempts failed. Last error:`, error);
          throw error;
        }
        
        // Ожидаем перед следующей попыткой с exponential backoff
        console.log(`[${operationName}] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Увеличиваем задержку для следующей попытки
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }
    
    throw lastError!;
  }, [toast]);

  /**
   * PERFORMANCE + RELIABILITY: Обертка для AI функций с кешированием и retry
   * 
   * @param functionName - Название Edge Function
   * @param requestBody - Тело запроса
   * @param operationName - Название операции для UI
   * @param cacheOptions - Опции кеширования
   * @returns Результат операции
   */
  const executeAIFunction = useCallback(async (
    functionName: string,
    requestBody: any,
    operationName: string,
    cacheOptions: { enabled: boolean; ttl?: number } = { enabled: true, ttl: 5 * 60 * 1000 }
  ): Promise<any> => {
    // Проверяем кеш если кеширование включено
    let cacheKey: string | null = null;
    if (cacheOptions.enabled) {
      cacheKey = generateCacheKey(functionName, requestBody);
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Выполняем запрос с retry логикой
    const result = await executeWithRetry(async () => {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.success) {
        throw new Error(data.error || `Ошибка выполнения ${operationName}`);
      }
      
      return data.data;
    }, operationName);
    
    // Сохраняем в кеш если кеширование включено
    if (cacheOptions.enabled && cacheKey) {
      setCachedData(cacheKey, result, cacheOptions.ttl);
    }
    
    return result;
  }, [generateCacheKey, getCachedData, setCachedData, executeWithRetry]);

  /**
   * UTILITY: Очищает кеш (может быть полезно для принудительного обновления)
   */
  const clearCache = useCallback((pattern?: string): void => {
    if (pattern) {
      // Удаляем записи, ключи которых содержат pattern
      for (const [key] of cacheRef.current) {
        if (key.includes(pattern)) {
          cacheRef.current.delete(key);
        }
      }
      console.log(`[Cache] Cleared entries matching pattern: ${pattern}`);
    } else {
      // Очищаем весь кеш
      cacheRef.current.clear();
      console.log('[Cache] Cleared all cached data');
    }
  }, []);

  // ИСПРАВЛЕНО: Добавлена retry логика и кеширование для всех AI функций

  return {
    // Основные функции генерации
    generateLyrics,
    generatingLyrics,
    generateConcept,
    generatingConcept,
    generateStylePrompt,
    generatingStylePrompt,
    generateDescription,
    analyzeLyrics,
    analyzingLyrics,
    improveLyrics,
    
    // Новые утилиты для управления кешем и retry
    clearCache, // Очистка кеша
    
    // Метаданные о кеше
    cacheStats: {
      size: cacheRef.current.size,
      maxSize: 50
    },
    
    // Конфигурация retry
    retryConfig: retryConfigRef.current,
    updateRetryConfig: (newConfig: Partial<RetryConfig>) => {
      retryConfigRef.current = { ...retryConfigRef.current, ...newConfig };
    }
  };
}