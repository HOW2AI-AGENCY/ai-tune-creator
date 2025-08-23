import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TrackStorageStatus {
  total: number;
  pending: number;
  downloading: number;
  completed: number;
  failed: number;
}

export interface StorageSyncResult {
  total: number;
  successes: number;
  failures: number;
  processed: Array<{
    track_id: string;
    title: string;
    success: boolean;
  }>;
}

export function useTrackStorage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TrackStorageStatus | null>(null);
  const { toast } = useToast();

  // Получить статус хранения треков пользователя
  const getStorageStatus = useCallback(async (): Promise<TrackStorageStatus | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      const { data: tracksToSync, error } = await supabase.rpc(
        'get_tracks_needing_storage_upload',
        { p_user_id: user.id }
      );

      if (error) throw error;

      // Подсчитываем статусы треков
      const { data: allTracks } = await supabase
        .from('tracks')
        .select('storage_status')
        .eq('metadata->>user_id', user.id);

      const statusCounts = {
        total: allTracks?.length || 0,
        pending: (tracksToSync || []).length,
        downloading: allTracks?.filter(t => t.storage_status === 'downloading').length || 0,
        completed: allTracks?.filter(t => t.storage_status === 'completed').length || 0,
        failed: allTracks?.filter(t => t.storage_status === 'failed').length || 0,
      };

      setStatus(statusCounts);
      return statusCounts;
    } catch (error: any) {
      console.error('Error getting storage status:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить статус хранения треков',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Синхронизировать треки с хранилищем
  const syncTracksToStorage = useCallback(async (): Promise<StorageSyncResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-track-storage');

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Sync failed');
      }

      const result = data.data as StorageSyncResult;
      
      toast({
        title: 'Синхронизация завершена',
        description: `Успешно: ${result.successes}, ошибок: ${result.failures}`,
        variant: result.failures > 0 ? 'destructive' : 'default',
      });

      // Refresh status after sync
      await getStorageStatus();

      // Notify UI to refresh tracks
      window.dispatchEvent(new CustomEvent('tracks-updated'));

      return result;
    } catch (error: any) {
      console.error('Error syncing tracks to storage:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: error.message || 'Не удалось синхронизировать треки',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, getStorageStatus]);

  // Обновить статус конкретного трека
  const updateTrackStorageStatus = useCallback(async (
    trackId: string,
    status: 'pending' | 'downloading' | 'completed' | 'failed',
    metadata?: any
  ) => {
    try {
      const { error } = await supabase.rpc('update_track_storage_status', {
        p_track_id: trackId,
        p_status: status,
        p_storage_metadata: metadata || {}
      });

      if (error) throw error;

      // Refresh status
      await getStorageStatus();
    } catch (error: any) {
      console.error('Error updating track storage status:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус трека',
        variant: 'destructive',
      });
    }
  }, [toast, getStorageStatus]);

  return {
    loading,
    status,
    getStorageStatus,
    syncTracksToStorage,
    updateTrackStorageStatus,
  };
}