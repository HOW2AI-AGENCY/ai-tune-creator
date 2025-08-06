import { useCallback } from 'react';
import { useTrackGeneration } from './useTrackGeneration';
import { useToast } from '@/hooks/use-toast';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

interface UseTrackGenerationWithRetryProps {
  onLyricsGenerated?: (lyrics: any) => void;
  onConceptGenerated?: (concept: any) => void;
  onStylePromptGenerated?: (stylePrompt: string, genreTags: string[]) => void;
  retryOptions?: RetryOptions;
}

export function useTrackGenerationWithRetry({
  onLyricsGenerated,
  onConceptGenerated,
  onStylePromptGenerated,
  retryOptions = {}
}: UseTrackGenerationWithRetryProps = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true
  } = retryOptions;

  const { toast } = useToast();
  const trackGeneration = useTrackGeneration({
    onLyricsGenerated,
    onConceptGenerated,
    onStylePromptGenerated
  });

  const retryWithDelay = (delay: number) => 
    new Promise(resolve => setTimeout(resolve, delay));

  const withRetry = useCallback(async <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset error state on success
        if (attempt > 0) {
          toast({
            title: "Успешно",
            description: `${operationName} выполнена после ${attempt} попыток`,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = exponentialBackoff 
            ? retryDelay * Math.pow(2, attempt)
            : retryDelay;
            
          toast({
            title: "Повторная попытка",
            description: `Попытка ${attempt + 1} не удалась. Повтор через ${delay / 1000}с...`,
            variant: "default",
            duration: 2000
          });
          
          await retryWithDelay(delay);
        }
      }
    }
    
    // All retries failed
    toast({
      title: "Ошибка",
      description: `${operationName} не удалась после ${maxRetries + 1} попыток: ${lastError?.message}`,
      variant: "destructive",
      duration: 5000
    });
    
    return null;
  }, [maxRetries, retryDelay, exponentialBackoff, toast]);

  const generateLyricsWithRetry = useCallback(async (params: any) => {
    return withRetry(
      () => trackGeneration.generateLyrics(params),
      'Генерация лирики'
    );
  }, [trackGeneration.generateLyrics, withRetry]);

  const generateConceptWithRetry = useCallback(async (params: any) => {
    return withRetry(
      () => trackGeneration.generateConcept(params),
      'Генерация концепции'
    );
  }, [trackGeneration.generateConcept, withRetry]);

  const generateStylePromptWithRetry = useCallback(async (artistInfo?: any, projectInfo?: any) => {
    return withRetry(
      () => trackGeneration.generateStylePrompt(artistInfo, projectInfo),
      'Генерация стиля'
    );
  }, [trackGeneration.generateStylePrompt, withRetry]);

  const analyzeLyricsWithRetry = useCallback(async (lyrics: string, stylePrompt?: string, genreTags?: string[]) => {
    return withRetry(
      () => trackGeneration.analyzeLyrics(lyrics, stylePrompt, genreTags),
      'Анализ лирики'
    );
  }, [trackGeneration.analyzeLyrics, withRetry]);

  const improveLyricsWithRetry = useCallback(async (lyrics: string, analysis: any, stylePrompt?: string, genreTags?: string[]) => {
    return withRetry(
      () => trackGeneration.improveLyrics(lyrics, analysis, stylePrompt, genreTags),
      'Улучшение лирики'
    );
  }, [trackGeneration.improveLyrics, withRetry]);

  return {
    ...trackGeneration,
    generateLyrics: generateLyricsWithRetry,
    generateConcept: generateConceptWithRetry,
    generateStylePrompt: generateStylePromptWithRetry,
    analyzeLyrics: analyzeLyricsWithRetry,
    improveLyrics: improveLyricsWithRetry,
  };
}