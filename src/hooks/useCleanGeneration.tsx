import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { eventBus } from '@/lib/events/event-bus';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  created_at: string;
  metadata?: any;
  lyrics?: string;
  genre_tags?: string[];
}

interface GenerationProgress {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  service: 'suno' | 'mureka';
}

interface AudioState {
  currentTrack: Track | null;
  isPlaying: boolean;
  audio: HTMLAudioElement | null;
}

export function useCleanGeneration() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeGenerations, setActiveGenerations] = useState<GenerationProgress[]>([]);
  const [audioState, setAudioState] = useState<AudioState>({
    currentTrack: null,
    isPlaying: false,
    audio: null
  });
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Load tracks
  const loadTracks = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('[useCleanGeneration] Loading tracks...');
      
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          audio_url,
          duration,
          lyrics,
          genre_tags,
          created_at,
          metadata,
          projects!inner (
            artists!inner (
              user_id
            )
          )
        `)
        .eq('projects.artists.user_id', user.id)
        .not('metadata->deleted', 'eq', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedTracks = (data || []).map(track => ({
        id: track.id,
        title: track.title,
        audio_url: track.audio_url,
        duration: track.duration,
        lyrics: track.lyrics,
        genre_tags: track.genre_tags || [],
        created_at: track.created_at,
        metadata: track.metadata
      }));

      setTracks(formattedTracks);
      console.log(`[useCleanGeneration] Loaded ${formattedTracks.length} tracks`);
      
    } catch (error) {
      console.error('[useCleanGeneration] Error loading tracks:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить треки",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Generate track
  const generateTrack = useCallback(async (prompt: string, service: 'suno' | 'mureka') => {
    if (!user) return;

    const taskId = crypto.randomUUID();
    
    // Add to active generations
    setActiveGenerations(prev => [...prev, {
      taskId,
      status: 'pending',
      progress: 0,
      service
    }]);

    try {
      console.log(`[useCleanGeneration] Starting ${service} generation:`, prompt);
      
      const { data, error } = await supabase.functions.invoke(
        service === 'suno' ? 'generate-suno-track' : 'generate-mureka-track',
        {
          body: {
            prompt,
            inputType: 'description',
            style: 'AI Generated',
            make_instrumental: false,
            model: service === 'suno' ? 'V3_5' : 'v7',
            mode: 'quick',
            wait_audio: false,
            useInbox: true
          }
        }
      );

      if (error) throw error;

      // Update progress
      setActiveGenerations(prev => 
        prev.map(gen => gen.taskId === taskId 
          ? { ...gen, status: 'running', progress: 25 }
          : gen
        )
      );

      // Start polling for results
      if (data?.success && data?.data?.generation_id) {
        pollGenerationStatus(taskId, data.data.generation_id, service);
      } else if (data?.data?.task_id) {
        pollGenerationStatus(taskId, data.data.task_id, service);
      } else {
        throw new Error('No generation/task ID returned from API');
      }
      
      toast({
        title: "Генерация запущена",
        description: `${service === 'suno' ? 'Suno AI' : 'Mureka'} создает ваш трек`
      });

    } catch (error: any) {
      console.error(`[useCleanGeneration] ${service} generation error:`, error);
      
      setActiveGenerations(prev => 
        prev.map(gen => gen.taskId === taskId 
          ? { ...gen, status: 'failed', progress: 0 }
          : gen
        )
      );

      toast({
        title: "Ошибка генерации",
        description: error.message || `Не удалось запустить генерацию в ${service}`,
        variant: "destructive"
      });
    }
  }, [user, toast]);

  // Poll generation status
  const pollGenerationStatus = useCallback(async (
    taskId: string, 
    generationId: string, 
    service: 'suno' | 'mureka'
  ) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          service === 'suno' ? 'get-suno-record-info' : 'get-mureka-task-status',
          { body: { generation_id: generationId, task_id: generationId } }
        );

        if (error) throw error;

        const status = data?.data?.status || data?.status || 'pending';
        const progress = status === 'completed' ? 100 : 
                        status === 'running' || status === 'generating' ? 75 : 
                        status === 'processing' ? 50 : 25;

        setActiveGenerations(prev => 
          prev.map(gen => gen.taskId === taskId 
            ? { ...gen, progress, status: status as any }
            : gen
          )
        );

        if (status === 'completed') {
          // Remove from active and refresh tracks
          setActiveGenerations(prev => prev.filter(gen => gen.taskId !== taskId));
          
          // Trigger metadata enhancement
          try {
            await supabase.functions.invoke('enhance-track-metadata', {
              body: { generation_id: generationId }
            });
          } catch (metaError) {
            console.warn('[useCleanGeneration] Metadata enhancement failed:', metaError);
          }
          
          // Ensure storage
          try {
            await supabase.functions.invoke('ensure-track-storage', {
              body: { generation_id: generationId }
            });
          } catch (storageError) {
            console.warn('[useCleanGeneration] Storage check failed:', storageError);
          }
          
          // Refresh tracks
          loadTracks();
          
          toast({
            title: "Трек готов!",
            description: "Генерация завершена, файл сохранен"
          });
          return;
        }

        if (status === 'failed') {
          setActiveGenerations(prev => prev.filter(gen => gen.taskId !== taskId));
          toast({
            title: "Генерация не удалась",
            description: "Попробуйте еще раз",
            variant: "destructive"
          });
          return;
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          // Timeout
          setActiveGenerations(prev => prev.filter(gen => gen.taskId !== taskId));
          toast({
            title: "Время ожидания истекло",
            description: "Генерация занимает слишком много времени",
            variant: "destructive"
          });
        }

      } catch (error) {
        console.error('[useCleanGeneration] Polling error:', error);
        setActiveGenerations(prev => prev.filter(gen => gen.taskId !== taskId));
      }
    };

    // Start polling
    setTimeout(poll, 2000);
  }, [loadTracks, toast]);

  // Delete track
  const deleteTrack = useCallback(async (trackId: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-track', {
        body: { track_id: trackId }
      });

      if (error) throw error;

      // Remove from state
      setTracks(prev => prev.filter(track => track.id !== trackId));
      
      // Stop audio if playing deleted track
      if (audioState.currentTrack?.id === trackId) {
        audioState.audio?.pause();
        setAudioState({ currentTrack: null, isPlaying: false, audio: null });
      }

      toast({
        title: "Трек удален",
        description: "Трек перемещен в корзину"
      });

    } catch (error: any) {
      console.error('[useCleanGeneration] Delete error:', error);
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [audioState, toast]);

  // Play track
  const playTrack = useCallback((track: Track) => {
    if (!track.audio_url) return;

    // If same track is playing, toggle pause
    if (audioState.currentTrack?.id === track.id && audioState.audio) {
      if (audioState.isPlaying) {
        audioState.audio.pause();
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      } else {
        audioState.audio.play();
        setAudioState(prev => ({ ...prev, isPlaying: true }));
      }
      return;
    }

    // Stop current audio
    if (audioState.audio) {
      audioState.audio.pause();
      audioState.audio.currentTime = 0;
    }

    // Create new audio
    const audio = new Audio(track.audio_url);
    
    audio.onplay = () => setAudioState(prev => ({ ...prev, isPlaying: true }));
    audio.onpause = () => setAudioState(prev => ({ ...prev, isPlaying: false }));
    audio.onended = () => setAudioState({ currentTrack: null, isPlaying: false, audio: null });

    setAudioState({ currentTrack: track, isPlaying: false, audio });
    audio.play();

  }, [audioState]);

  // Listen for track updates
  useEffect(() => {
    const handleTracksUpdated = () => {
      console.log('[useCleanGeneration] Received tracks-updated event');
      loadTracks();
    };

      const unsubscribe = eventBus.on('tracks-updated', handleTracksUpdated);
      return unsubscribe;
  }, [loadTracks]);

  // Initial load
  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  return {
    tracks,
    activeGenerations,
    loading,
    generateTrack,
    deleteTrack,
    playTrack,
    currentTrack: audioState.currentTrack,
    isPlaying: audioState.isPlaying,
    refresh: loadTracks
  };
}