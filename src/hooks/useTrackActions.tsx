/**
 * @fileoverview Hook for track actions (like, delete, download, convert)
 * @version 0.01.036
 * @author Claude Code Assistant
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  metadata?: Record<string, any>;
  user_id?: string;
}

interface TrackActions {
  // Like functionality
  likeTrack: (trackId: string) => Promise<void>;
  unlikeTrack: (trackId: string) => Promise<void>;
  isLiked: (trackId: string) => boolean;
  
  // Delete functionality
  deleteTrack: (trackId: string, softDelete?: boolean) => Promise<void>;
  
  // Download functionality
  downloadMP3: (track: Track) => Promise<void>;
  
  // WAV conversion (Suno API)
  convertToWAV: (track: Track) => Promise<string>;
  getWAVConversionStatus: (taskId: string) => Promise<any>;
  
  // Stem separation
  separateStems: (track: Track, type?: 'separate_vocal' | 'separate_music') => Promise<string>;
  
  // Variant management
  setMasterVariant: (trackId: string) => Promise<void>;
  
  // Loading states
  isLiking: boolean;
  isDeleting: boolean;
  isDownloading: boolean;
  isConverting: boolean;
  isSeparating: boolean;
}

export function useTrackActions(): TrackActions {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Local state for UI feedback
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isSeparating, setIsSeparating] = useState(false);
  
  // MEMORY LEAK FIX: Track active operations for cleanup
  const activeOperationsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    return () => {
      // Clear any pending operations on unmount
      activeOperationsRef.current.clear();
    };
  }, []);

  // ====================================
  // 💖 LIKE FUNCTIONALITY
  // ====================================
  
  const likeTrack = useCallback(async (trackId: string) => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в систему для лайков треков",
        variant: "destructive",
      });
      return;
    }

    setIsLiking(true);
    try {
      // TODO: Implement likes table in database
      if (!likedTracks.has(trackId)) {
        setLikedTracks(prev => new Set([...prev, trackId]));
        
        toast({
          title: "❤️ Трек добавлен в избранное",
          description: "Трек сохранен в ваших лайках (локально)",
        });
      }
    } catch (error: any) {
      console.error('Error liking track:', error);
      toast({
        title: "Ошибка лайка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  }, [user, toast, likedTracks]);

  const unlikeTrack = useCallback(async (trackId: string) => {
    if (!user) return;

    setIsLiking(true);
    try {
      setLikedTracks(prev => {
        const newSet = new Set(prev);
        newSet.delete(trackId);
        return newSet;
      });

      toast({
        title: "💔 Лайк удален",
        description: "Трек убран из избранного (локально)",
      });
    } catch (error: any) {
      console.error('Error unliking track:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  }, [user, toast]);

  const isLiked = useCallback((trackId: string) => {
    return likedTracks.has(trackId);
  }, [likedTracks]);

  // ====================================
  // 🗑️ DELETE FUNCTIONALITY
  // ====================================
  
  const deleteTrack = useCallback(async (trackId: string, softDelete = true) => {
    if (!user) return;

    setIsDeleting(true);
    try {
      console.log(`[DELETE] Deleting track ${trackId}, soft=${softDelete}`);
      
      // Используем новую Edge Function для удаления
      const { data, error } = await supabase.functions.invoke('delete-track', {
        body: { 
          trackId, 
          userId: user.id,
          softDelete 
        }
      });
      
      if (error) {
        console.error('[DELETE] Edge function error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error during deletion');
      }

      toast({
        title: softDelete ? "🗑️ Трек перемещен в корзину" : "🗑️ Трек удален навсегда",
        description: data.message,
        variant: "default",
      });

      // Уведомим приложение об изменениях
      window.dispatchEvent(new CustomEvent('tracks-updated'));

    } catch (error: any) {
      console.error('Error deleting track:', error);
      toast({
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить трек",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [user, toast]);

  // ====================================
  // 📥 DOWNLOAD MP3 FUNCTIONALITY
  // ====================================
  
  const downloadMP3 = useCallback(async (track: Track) => {
    if (!track.audio_url) {
      toast({
        title: "Нет аудио",
        description: "У трека отсутствует аудиофайл",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(track.audio_url);
      if (!response.ok) throw new Error('Failed to fetch audio');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "📥 Загрузка началась",
        description: `Скачивается ${track.title}`,
      });
    } catch (error: any) {
      console.error('Error downloading track:', error);
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  // ====================================
  // 🎵 WAV CONVERSION (Suno API)
  // ====================================
  
  const convertToWAV = useCallback(async (track: Track): Promise<string> => {
    if (!track.metadata?.external_id || track.metadata?.service !== 'suno') {
      throw new Error('WAV conversion only available for Suno tracks');
    }

    setIsConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke('convert-suno-to-wav', {
        body: {
          audioId: track.metadata.external_id,
          title: track.title,
        },
      });

      if (error) throw error;

      toast({
        title: "🎵 Конвертация в WAV начата",
        description: "Трек конвертируется в WAV формат",
      });

      return data.taskId;
    } catch (error: any) {
      console.error('Error converting to WAV:', error);
      toast({
        title: "Ошибка конвертации",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsConverting(false);
    }
  }, [toast]);

  const getWAVConversionStatus = useCallback(async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-suno-wav-info', {
        body: { taskId },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error checking WAV status:', error);
      throw error;
    }
  }, []);

  // ====================================
  // ✂️ STEM SEPARATION
  // ====================================
  
  const separateStems = useCallback(async (track: Track, type = 'separate_vocal'): Promise<string> => {
    if (!track.metadata?.external_id) {
      throw new Error('Stem separation requires track external ID');
    }

    setIsSeparating(true);
    try {
      let taskId: string;

      if (track.metadata?.service === 'suno') {
        // Use Suno vocal separation
        const { data, error } = await supabase.functions.invoke('separate-suno-vocals', {
          body: {
            taskId: `sep_${Date.now()}`,
            audioId: track.metadata.external_id,
            type,
          },
        });

        if (error) throw error;
        taskId = data.taskId;
      } else {
        // Use Mureka stem separation
        const { data, error } = await supabase.functions.invoke('mureka-stem-separation', {
          body: {
            url: track.audio_url,
          },
        });

        if (error) throw error;
        taskId = data.taskId || `mureka_${Date.now()}`;
      }

      toast({
        title: "✂️ Разделение на стемы начато",
        description: "Трек разделяется на инструментальные партии",
      });

      return taskId;
    } catch (error: any) {
      console.error('Error separating stems:', error);
      toast({
        title: "Ошибка разделения",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSeparating(false);
    }
  }, [toast]);

  // ====================================
  // ⭐ MASTER VARIANT FUNCTIONALITY
  // ====================================
  
  const setMasterVariant = useCallback(async (trackId: string) => {
    if (!user) return;

    try {
      // Get track's variant_group_id
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('variant_group_id')
        .eq('id', trackId)
        .single();

      if (trackError) throw trackError;
      if (!track.variant_group_id) {
        toast({
          title: "Ошибка",
          description: "У трека нет группы вариантов",
          variant: "destructive",
        });
        return;
      }

      // Remove master status from all variants in group
      await supabase
        .from('tracks')
        .update({ is_master_variant: false })
        .eq('variant_group_id', track.variant_group_id);

      // Set new master
      await supabase
        .from('tracks')
        .update({ is_master_variant: true })
        .eq('id', trackId);

      toast({
        title: "⭐ Главный вариант обновлен",
        description: "Новый главный вариант установлен",
      });

      // Reload tracks
      window.dispatchEvent(new CustomEvent('tracks-updated'));

    } catch (error: any) {
      console.error('Error setting master variant:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [user, toast]);

  return {
    likeTrack,
    unlikeTrack,
    isLiked,
    deleteTrack,
    downloadMP3,
    convertToWAV,
    getWAVConversionStatus,
    separateStems,
    setMasterVariant,
    isLiking,
    isDeleting,
    isDownloading,
    isConverting,
    isSeparating,
  };
}