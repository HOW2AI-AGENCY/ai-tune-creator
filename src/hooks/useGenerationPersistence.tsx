import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PersistedGeneration {
  taskId: string;
  service: 'suno' | 'mureka';
  generationId?: string;
  status: 'preparing' | 'generating' | 'processing' | 'saving' | 'completed' | 'error';
  progress: number;
  title: string;
  subtitle?: string;
  startTime: number;
  params: any;
  steps: Array<{
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
  }>;
}

const STORAGE_KEY = 'ongoing_generations';
const MAX_GENERATION_TIME = 5 * 60 * 1000; // 5 minutes

export function useGenerationPersistence() {
  const [ongoingGenerations, setOngoingGenerations] = useState<PersistedGeneration[]>([]);
  const { toast } = useToast();

  // Load persisted generations on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const generations: PersistedGeneration[] = JSON.parse(stored);
        // Filter out expired generations
        const now = Date.now();
        const active = generations.filter(g => 
          now - g.startTime < MAX_GENERATION_TIME && 
          g.status !== 'completed' && 
          g.status !== 'error'
        );
        setOngoingGenerations(active);
        
        // Start background sync for active generations
        active.forEach(generation => {
          startBackgroundSync(generation);
        });
      } catch (error) {
        console.error('Error loading persisted generations:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Persist generations to localStorage
  const persistGenerations = useCallback((generations: PersistedGeneration[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(generations));
    } catch (error) {
      console.error('Error persisting generations:', error);
    }
  }, []);

  // Start a new generation tracking
  const startGeneration = useCallback((generation: Omit<PersistedGeneration, 'startTime'>) => {
    const newGeneration: PersistedGeneration = {
      ...generation,
      startTime: Date.now()
    };
    
    setOngoingGenerations(prev => {
      const updated = [...prev, newGeneration];
      persistGenerations(updated);
      return updated;
    });

    // Start background sync
    startBackgroundSync(newGeneration);

    return newGeneration;
  }, [persistGenerations]);

  // Update generation progress
  const updateGeneration = useCallback((taskId: string, updates: Partial<PersistedGeneration>) => {
    setOngoingGenerations(prev => {
      const updated = prev.map(gen => 
        gen.taskId === taskId 
          ? { ...gen, ...updates }
          : gen
      );
      persistGenerations(updated);
      return updated;
    });
  }, [persistGenerations]);

  // Complete generation
  const completeGeneration = useCallback((taskId: string) => {
    setOngoingGenerations(prev => {
      const updated = prev.filter(gen => gen.taskId !== taskId);
      persistGenerations(updated);
      return updated;
    });
  }, [persistGenerations]);

  // Background sync for a single generation
  const startBackgroundSync = useCallback(async (generation: PersistedGeneration) => {
    const syncInterval = setInterval(async () => {
      try {
        // Check if generation is still ongoing
        const current = ongoingGenerations.find(g => g.taskId === generation.taskId);
        if (!current || current.status === 'completed' || current.status === 'error') {
          clearInterval(syncInterval);
          return;
        }

        // Check generation status based on service
        let statusResponse;
        if (generation.service === 'suno') {
          statusResponse = await supabase.functions.invoke('get-suno-record-info', {
            body: { taskId: generation.taskId, generationId: generation.generationId }
          });
        } else if (generation.service === 'mureka' && generation.generationId) {
          // For Mureka, check the generation record in database
          const { data } = await supabase
            .from('ai_generations')
            .select('*')
            .eq('id', generation.generationId)
            .single();
          
          if (data?.status === 'completed') {
            statusResponse = { data: { completed: true, tracks: [data] } };
          }
        }

        if (statusResponse?.data) {
          const result = statusResponse.data;
          
          if (result.completed || result.tracks?.length > 0) {
            // Generation completed, trigger download and save for all tracks
            const tracks = result.tracks && Array.isArray(result.tracks) ? result.tracks : [result];
            await Promise.all(
              tracks
                .filter((track: any) => {
                  const audioUrl = track.audioUrl || track.audio_url || track.result_url;
                  if (!audioUrl) {
                    console.warn('Track missing audio URL, skipping download:', track);
                    return false;
                  }
                  return true;
                })
                .map((track: any) => {
                  const audioUrl = track.audioUrl || track.audio_url || track.result_url;
                  return supabase.functions.invoke('download-and-save-track', {
                    body: {
                      generation_id: generation.generationId,
                      external_url: audioUrl,
                      taskId: generation.taskId,
                      filename: track.title || track.name
                    }
                  });
                })
            );

            // Update progress to completed
            updateGeneration(generation.taskId, {
              status: 'completed',
              progress: 100,
              steps: generation.steps.map(step => ({ ...step, status: 'done' as const }))
            });

            // Show success notification
            toast({
              title: "Трек готов!",
              description: `Трек "${generation.title}" успешно сгенерирован и сохранен`
            });

            // Remove from ongoing list
            setTimeout(() => {
              completeGeneration(generation.taskId);
            }, 3000);

            clearInterval(syncInterval);
          } else if (result.failed || result.error) {
            // Generation failed
            updateGeneration(generation.taskId, {
              status: 'error',
              steps: generation.steps.map((step, index) => 
                index === generation.steps.findIndex(s => s.status === 'running')
                  ? { ...step, status: 'error' as const }
                  : step
              )
            });

            toast({
              title: "Ошибка генерации",
              description: `Не удалось сгенерировать трек "${generation.title}"`,
              variant: "destructive"
            });

            clearInterval(syncInterval);
          } else {
            // Still processing, update progress
            const currentStep = generation.steps.findIndex(s => s.status === 'running');
            if (currentStep < generation.steps.length - 1) {
              const newProgress = Math.min(generation.progress + 5, 95);
              updateGeneration(generation.taskId, {
                progress: newProgress
              });
            }
          }
        }
      } catch (error) {
        console.error('Background sync error:', error);
      }
    }, 5000); // Check every 5 seconds for faster updates

    // Cleanup after max time
    setTimeout(() => {
      clearInterval(syncInterval);
      updateGeneration(generation.taskId, {
        status: 'error',
        steps: generation.steps.map(step => 
          step.status === 'running' 
            ? { ...step, status: 'error' as const }
            : step
        )
      });
    }, MAX_GENERATION_TIME);
  }, [ongoingGenerations, updateGeneration, completeGeneration, toast]);

  // Cleanup expired generations
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      setOngoingGenerations(prev => {
        const active = prev.filter(g => now - g.startTime < MAX_GENERATION_TIME);
        if (active.length !== prev.length) {
          persistGenerations(active);
        }
        return active;
      });
    };

    const interval = setInterval(cleanup, 60000); // Cleanup every minute
    return () => clearInterval(interval);
  }, [persistGenerations]);

  // Background sync trigger for page focus
  useEffect(() => {
    const handleFocus = () => {
      // Trigger sync for all ongoing generations when page gains focus
      ongoingGenerations.forEach(generation => {
        if (generation.status !== 'completed' && generation.status !== 'error') {
          startBackgroundSync(generation);
        }
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [ongoingGenerations, startBackgroundSync]);

  return {
    ongoingGenerations,
    startGeneration,
    updateGeneration,
    completeGeneration
  };
}