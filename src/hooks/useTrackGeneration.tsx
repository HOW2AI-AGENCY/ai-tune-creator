import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAISettings } from '@/hooks/useAISettings';

// T-057: Hook для генерации треков с ИИ
interface UseTrackGenerationProps {
  onLyricsGenerated?: (lyrics: any) => void;
  onConceptGenerated?: (concept: any) => void;
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
  onConceptGenerated 
}: UseTrackGenerationProps = {}) {
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [generatingConcept, setGeneratingConcept] = useState(false);
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

  // TODO: Добавить retry логику при ошибках
  // FIXME: Оптимизировать повторные запросы при одинаковых параметрах

  return {
    generateLyrics,
    generatingLyrics,
    generateConcept,
    generatingConcept,
    generateDescription
  };
}