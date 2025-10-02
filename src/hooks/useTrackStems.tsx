import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Stem, StemCache, StemSeparationMode } from '@/types/track-stems';

export function useTrackStems(trackId: string, variantNumber: number = 1) {
  const [stems, setStems] = useState<Stem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cachedStems, setCachedStems] = useState<StemCache | null>(null);
  const { toast } = useToast();

  const loadStems = async () => {
    if (!trackId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('track_stems')
        .select('*')
        .eq('track_id', trackId)
        .eq('variant_number', variantNumber)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedStems = (data || []).map(s => ({
        ...s,
        metadata: s.metadata as Record<string, any>,
        waveform_data: s.waveform_data as any
      })) as Stem[];
      
      setStems(mappedStems);
      
      if (data && data.length > 0) {
        setCachedStems({
          track_id: trackId,
          variant_number: variantNumber,
          separation_mode: data[0].separation_mode as StemSeparationMode,
          stems: mappedStems,
          created_at: data[0].created_at
        });
      }
    } catch (error: any) {
      console.error('Error loading stems:', error);
      toast({
        title: 'Ошибка загрузки стемов',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingStems = async (): Promise<StemCache | null> => {
    try {
      const { data, error } = await supabase
        .from('track_stems')
        .select('*')
        .eq('track_id', trackId)
        .eq('variant_number', variantNumber)
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const mappedStems = data.map(s => ({
          ...s,
          metadata: s.metadata as Record<string, any>,
          waveform_data: s.waveform_data as any
        })) as Stem[];
        
        return {
          track_id: trackId,
          variant_number: variantNumber,
          separation_mode: data[0].separation_mode as StemSeparationMode,
          stems: mappedStems,
          created_at: data[0].created_at
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking existing stems:', error);
      return null;
    }
  };

  const downloadStem = async (stem: Stem) => {
    try {
      const response = await fetch(stem.stem_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stem.stem_name}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Стем скачан',
        description: `${stem.stem_name} успешно скачан`
      });
    } catch (error: any) {
      console.error('Error downloading stem:', error);
      toast({
        title: 'Ошибка скачивания',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const downloadAllStems = async () => {
    try {
      toast({
        title: 'Скачивание стемов',
        description: 'Начинается скачивание всех стемов...'
      });

      for (const stem of stems) {
        await downloadStem(stem);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: 'Готово',
        description: 'Все стемы успешно скачаны'
      });
    } catch (error: any) {
      console.error('Error downloading all stems:', error);
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (trackId) {
      loadStems();
    }
  }, [trackId, variantNumber]);

  return {
    stems,
    isLoading,
    cachedStems,
    loadStems,
    checkExistingStems,
    downloadStem,
    downloadAllStems
  };
}
