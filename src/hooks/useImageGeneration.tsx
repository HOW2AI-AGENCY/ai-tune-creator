import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseImageGenerationProps {
  onImageGenerated?: (imageUrl: string) => void;
}

export function useImageGeneration({ onImageGenerated }: UseImageGenerationProps = {}) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateImage = async (prompt: string, projectId?: string) => {
    try {
      setGenerating(true);

      const { data, error } = await supabase.functions.invoke('generate-cover-image', {
        body: {
          prompt: `Music album cover: ${prompt}. Professional, high quality, artistic style.`,
          projectId,
          style: 'artistic'
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onImageGenerated?.(data.imageUrl);
        toast({
          title: "Успешно",
          description: "Изображение сгенерировано"
        });
        return data.imageUrl;
      }

      throw new Error('Изображение не было сгенерировано');
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать изображение",
        variant: "destructive"
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generateImage,
    generating
  };
}