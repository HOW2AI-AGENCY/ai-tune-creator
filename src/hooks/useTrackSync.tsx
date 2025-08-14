import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncResult {
  generation_id: string;
  success: boolean;
  result?: any;
  error?: string;
}

interface SyncSummary {
  total_checked: number;
  needed_download: number;
  successful_downloads: number;
  failed_downloads: number;
}

interface Track {
  id: string;
  title: string;
  track_number?: number;
  duration?: number;
  audio_url?: string;
  created_at: string;
  project_id: string;
  projects?: {
    title: string;
    artist_id: string;
    artists?: {
      name: string;
    };
  };
}

export function useTrackSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    status: string;
  } | null>(null);
  const [lastSyncResults, setLastSyncResults] = useState<{
    results: SyncResult[];
    summary: SyncSummary;
    tracks: Track[];
  } | null>(null);
  
  const { toast } = useToast();

  const syncTracks = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 100, status: 'Проверка сгенерированных треков...' });

    try {
      console.log('Starting track synchronization...');

      const { data, error } = await supabase.functions.invoke('sync-generated-tracks', {
        body: {}
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Sync failed');
      }

      const { sync_results, summary, tracks } = data.data;
      
      setLastSyncResults({
        results: sync_results,
        summary,
        tracks
      });

      const { successful_downloads, failed_downloads, total_checked } = summary;

      if (successful_downloads > 0) {
        toast({
          title: "🎵 Треки синхронизированы",
          description: `Загружено ${successful_downloads} треков из ${total_checked} проверенных`
        });
      } else if (total_checked > 0) {
        toast({
          title: "✅ Синхронизация завершена",
          description: `Все ${total_checked} треков уже актуальны`
        });
      } else {
        toast({
          title: "ℹ️ Нет треков для синхронизации",
          description: "Сгенерированные треки не найдены"
        });
      }

      if (failed_downloads > 0) {
        toast({
          title: "⚠️ Некоторые треки не удалось загрузить",
          description: `Ошибок: ${failed_downloads}. Попробуйте позже`,
          variant: "destructive"
        });
      }

      return { success: true, data: data.data };

    } catch (error: any) {
      console.error('Track sync error:', error);
      
      toast({
        title: "❌ Ошибка синхронизации",
        description: error.message || "Не удалось синхронизировать треки",
        variant: "destructive"
      });

      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [isSyncing, toast]);

  const downloadSingleTrack = useCallback(async (generationId: string, externalUrl: string, trackId?: string) => {
    try {
      console.log('Downloading single track:', generationId);

      const { data, error } = await supabase.functions.invoke('download-and-save-track', {
        body: {
          generation_id: generationId,
          external_url: externalUrl,
          track_id: trackId
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Download failed');
      }

      toast({
        title: "🎵 Трек загружен",
        description: "Трек успешно сохранен в вашей библиотеке"
      });

      return { success: true, data: data.data };

    } catch (error: any) {
      console.error('Single track download error:', error);
      
      toast({
        title: "❌ Ошибка загрузки",
        description: error.message || "Не удалось загрузить трек",
        variant: "destructive"
      });

      return { success: false, error: error.message };
    }
  }, [toast]);

  return {
    isSyncing,
    syncProgress,
    lastSyncResults,
    syncTracks,
    downloadSingleTrack
  };
}