import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAISettings } from '@/hooks/useAISettings';

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

  const generateLyrics = async (params: GenerationParams) => {
    try {
      setGeneratingLyrics(true);
      
      console.log('Generating lyrics with params:', params);

      const { data, error } = await supabase.functions.invoke('generate-track-lyrics', {
        body: {
          stylePrompt: params.stylePrompt,
          genreTags: params.genreTags,
          artistInfo: params.artistInfo,
          existingLyrics: params.existingLyrics,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          customPrompt: settings.customPrompts.lyricsGeneration
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Не удалось сгенерировать лирику');
      }

      onLyricsGenerated?.(data.data);
      
      toast({
        title: "Успешно",
        description: "Лирика сгенерирована с помощью ИИ"
      });

      return data.data;
    } catch (error: any) {
      console.error('Error generating lyrics:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать лирику",
        variant: "destructive"
      });
      return null;
    } finally {
      setGeneratingLyrics(false);
    }
  };

  const generateConcept = async (params: GenerationParams) => {
    try {
      setGeneratingConcept(true);
      
      console.log('Generating concept with params:', params);

      const { data, error } = await supabase.functions.invoke('generate-track-concept', {
        body: {
          stylePrompt: params.stylePrompt,
          genreTags: params.genreTags,
          artistInfo: params.artistInfo,
          projectInfo: params.projectInfo,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          customPrompt: settings.customPrompts.trackConceptGeneration
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Не удалось сгенерировать концепцию');
      }

      onConceptGenerated?.(data.data);
      
      toast({
        title: "Успешно",
        description: "Концепция трека сгенерирована"
      });

      return data.data;
    } catch (error: any) {
      console.error('Error generating concept:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать концепцию",
        variant: "destructive"
      });
      return null;
    } finally {
      setGeneratingConcept(false);
    }
  };

  const generateDescription = async (params: GenerationParams) => {
    // TODO: Создать отдельную Edge Function для генерации описаний
    // HACK: Пока используем концепцию и извлекаем из неё описание
    try {
      const concept = await generateConcept(params);
      if (concept && concept.description) {
        return concept.description;
      }
      return null;
    } catch (error) {
      console.error('Error generating description:', error);
      return null;
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

  // TODO: Добавить retry логику при ошибках
  // FIXME: Оптимизировать повторные запросы при одинаковых параметрах

  return {
    generateLyrics,
    generatingLyrics,
    generateConcept,
    generatingConcept,
    generateStylePrompt,
    generatingStylePrompt,
    generateDescription,
    analyzeLyrics,
    analyzingLyrics
  };
}