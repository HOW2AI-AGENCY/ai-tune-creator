import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupingResult {
  success: boolean;
  groups_updated: number;
  tracks_updated: number;
  updates: Array<{
    track_id: string;
    track_title: string;
    variant_group_id: string;
    variant_number: number;
    is_master_variant: boolean;
    task_id: string;
  }>;
  error?: string;
}

export const useManualGroupTracks = () => {
  const [isGrouping, setIsGrouping] = useState(false);
  const { toast } = useToast();

  const groupTracks = async (taskId?: string): Promise<GroupingResult | null> => {
    setIsGrouping(true);

    try {
      const { data, error } = await supabase.functions.invoke('manual-group-tracks', {
        body: { taskId }
      });

      if (error) {
        console.error('Manual grouping error:', error);
        toast({
          title: '❌ Ошибка группировки',
          description: error.message || 'Не удалось сгруппировать треки',
          variant: 'destructive'
        });
        return null;
      }

      const result = data as GroupingResult;

      if (result.success) {
        if (result.tracks_updated === 0) {
          toast({
            title: 'ℹ️ Нет треков для группировки',
            description: 'Все треки уже сгруппированы или не найдены треки с вариантами'
          });
        } else {
          toast({
            title: '✅ Треки сгруппированы!',
            description: `Обновлено групп: ${result.groups_updated}, треков: ${result.tracks_updated}`
          });
        }
        return result;
      } else {
        toast({
          title: '❌ Ошибка группировки',
          description: result.error || 'Не удалось сгруппировать треки',
          variant: 'destructive'
        });
        return null;
      }

    } catch (error: any) {
      console.error('Unexpected grouping error:', error);
      toast({
        title: '❌ Ошибка',
        description: error.message || 'Произошла непредвиденная ошибка',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsGrouping(false);
    }
  };

  return {
    groupTracks,
    isGrouping
  };
};
