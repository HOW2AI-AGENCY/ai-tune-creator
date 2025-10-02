import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrackVariant {
  id: string;
  title: string;
  audio_url?: string;
  variant_number: number;
  is_master_variant: boolean;
  duration?: number;
  created_at: string;
}

interface VariantGroup {
  variant_group_id: string;
  variants: TrackVariant[];
  master_variant?: TrackVariant;
}

export function useTrackVariants(trackId?: string) {
  const [variantGroup, setVariantGroup] = useState<VariantGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadVariants = async (id: string) => {
    setIsLoading(true);
    try {
      // Get the track to find its variant_group_id
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('variant_group_id, variant_number, is_master_variant')
        .eq('id', id)
        .single();

      if (trackError) throw trackError;

      // If no variant group, this is a standalone track
      if (!track.variant_group_id) {
        setVariantGroup(null);
        return;
      }

      // Get all variants in this group
      const { data: variants, error: variantsError } = await supabase
        .from('tracks')
        .select('id, title, audio_url, variant_number, is_master_variant, duration, created_at')
        .eq('variant_group_id', track.variant_group_id)
        .order('variant_number', { ascending: true });

      if (variantsError) throw variantsError;

      const masterVariant = variants?.find(v => v.is_master_variant);

      setVariantGroup({
        variant_group_id: track.variant_group_id,
        variants: variants || [],
        master_variant: masterVariant
      });

    } catch (error: any) {
      console.error('Error loading variants:', error);
      toast({
        title: 'Ошибка загрузки вариантов',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setMasterVariant = async (variantId: string) => {
    if (!variantGroup) return;

    try {
      // Remove master status from all variants in group
      await supabase
        .from('tracks')
        .update({ is_master_variant: false })
        .eq('variant_group_id', variantGroup.variant_group_id);

      // Set new master
      await supabase
        .from('tracks')
        .update({ is_master_variant: true })
        .eq('id', variantId);

      toast({
        title: 'Главный вариант обновлен',
        description: 'Новый главный вариант установлен'
      });

      // Reload variants
      if (trackId) {
        await loadVariants(trackId);
      }

    } catch (error: any) {
      console.error('Error setting master variant:', error);
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const groupExistingTracks = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('group-track-variants', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: 'Треки сгруппированы',
        description: `Создано ${response.data.variant_groups_created} групп вариантов`
      });

      return response.data;

    } catch (error: any) {
      console.error('Error grouping tracks:', error);
      toast({
        title: 'Ошибка группировки',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (trackId) {
      loadVariants(trackId);
    }
  }, [trackId]);

  return {
    variantGroup,
    isLoading,
    loadVariants,
    setMasterVariant,
    groupExistingTracks
  };
}
