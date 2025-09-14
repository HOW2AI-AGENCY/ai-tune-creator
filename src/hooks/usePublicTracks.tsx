import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createComponentLogger } from '@/lib/debug/ConsoleManager';
import type { Json } from '@/integrations/supabase/types';

const logger = createComponentLogger('usePublicTracks');

interface PublicTrack {
  id: string;
  title: string;
  created_at: string;
  audio_url: string;
  metadata: Json;
  project_id: string;
  artist_name: string;
  artist_avatar_url: string;
}

interface UsePublicTracksOptions {
  limit?: number;
  enabled?: boolean;
  backgroundRefetch?: boolean;
}

export function usePublicTracks({
  limit = 15,
  enabled = true,
  backgroundRefetch = false
}: UsePublicTracksOptions = {}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['public-tracks', limit], [limit]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<PublicTrack[]> => {
      logger.debug('Fetching public tracks with limit:', limit);
      
      const { data, error } = await supabase
        .rpc('get_public_tracks_feed', { p_limit: limit });
      
      if (error) {
        logger.error('Failed to fetch public tracks:', error);
        throw error;
      }

      logger.debug('Successfully fetched', data?.length || 0, 'tracks');
      return (data || []) as PublicTrack[];
    },
    enabled,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: backgroundRefetch ? 5 * 60 * 1000 : false,
    retry: 1,
    retryDelay: 1000,
  });

  const refresh = useCallback(() => {
    logger.debug('Manual refresh triggered');
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    tracks: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    refresh,
    isStale: query.isStale,
    isFetching: query.isFetching,
  };
}

export function usePrefetchPublicTracks() {
  const queryClient = useQueryClient();

  const prefetch = useCallback((limit = 15) => {
    return queryClient.prefetchQuery({
      queryKey: ['public-tracks', limit],
      queryFn: async () => {
        const { data, error } = await supabase
          .rpc('get_public_tracks_feed', { p_limit: limit });
        if (error) throw error;
        return (data || []) as PublicTrack[];
      },
      staleTime: 3 * 60 * 1000
    });
  }, [queryClient]);

  return { prefetch };
}