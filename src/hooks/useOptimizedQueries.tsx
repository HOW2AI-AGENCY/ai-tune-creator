/**
 * @fileoverview Optimized React Query hooks with smart caching and prefetching
 * @version 1.0.0
 */

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  prefetch?: boolean;
  backgroundRefetch?: boolean;
}

/**
 * Optimized hook for user statistics with smart caching
 */
export function useOptimizedUserStats(options: OptimizedQueryOptions<any> = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { prefetch = false, backgroundRefetch = true, ...queryOptions } = options;

  const query = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .rpc('get_user_stats', { p_user_id: user.id });
      
      if (error) throw error;
      return data?.[0] || { total_tracks: 0, total_projects: 0, total_artists: 0, active_generations: 0 };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    refetchOnWindowFocus: backgroundRefetch,
    refetchInterval: backgroundRefetch ? 30000 : false, // 30 seconds
    ...queryOptions
  });

  // Prefetch logic
  useEffect(() => {
    if (prefetch && user?.id) {
      queryClient.prefetchQuery({
        queryKey: ['user-stats', user.id],
        queryFn: async () => {
          const { data, error } = await supabase
            .rpc('get_user_stats', { p_user_id: user.id });
          if (error) throw error;
          return data?.[0];
        },
        staleTime: 5 * 60 * 1000
      });
    }
  }, [prefetch, user?.id, queryClient]);

  return query;
}

/**
 * Optimized hook for public tracks feed
 */
export function useOptimizedPublicTracks(limit = 15, options: OptimizedQueryOptions<any> = {}) {
  const queryClient = useQueryClient();
  const { prefetch = false, backgroundRefetch = true, ...queryOptions } = options;

  const query = useQuery({
    queryKey: ['public-tracks', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_public_tracks_feed', { p_limit: limit });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime)
    refetchOnWindowFocus: backgroundRefetch,
    refetchInterval: backgroundRefetch ? 60000 : false, // 1 minute
    ...queryOptions
  });

  // Prefetch logic
  useEffect(() => {
    if (prefetch) {
      queryClient.prefetchQuery({
        queryKey: ['public-tracks', limit],
        queryFn: async () => {
          const { data, error } = await supabase
            .rpc('get_public_tracks_feed', { p_limit: limit });
          if (error) throw error;
          return data;
        },
        staleTime: 2 * 60 * 1000
      });
    }
  }, [prefetch, limit, queryClient]);

  return query;
}

/**
 * Smart prefetching hook for heavy components
 */
export function usePrefetchHeavyData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const prefetchUserData = useCallback(async () => {
    if (!user?.id) return;

    // Prefetch user stats
    queryClient.prefetchQuery({
      queryKey: ['user-stats', user.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .rpc('get_user_stats', { p_user_id: user.id });
        if (error) throw error;
        return data?.[0];
      },
      staleTime: 5 * 60 * 1000
    });

    // Prefetch public tracks
    queryClient.prefetchQuery({
      queryKey: ['public-tracks', 15],
      queryFn: async () => {
        const { data, error } = await supabase
          .rpc('get_public_tracks_feed', { p_limit: 15 });
        if (error) throw error;
        return data;
      },
      staleTime: 2 * 60 * 1000
    });
  }, [user?.id, queryClient]);

  const prefetchOnIdle = useCallback(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetchUserData, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(prefetchUserData, 100);
    }
  }, [prefetchUserData]);

  return {
    prefetchUserData,
    prefetchOnIdle
  };
}

/**
 * Background cache invalidation hook
 */
export function useBackgroundCacheInvalidation() {
  const queryClient = useQueryClient();

  const invalidateUserStats = useCallback((userId: string) => {
    queryClient.invalidateQueries({ queryKey: ['user-stats', userId] });
  }, [queryClient]);

  const invalidatePublicTracks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['public-tracks'] });
  }, [queryClient]);

  const smartInvalidate = useCallback((patterns: string[]) => {
    patterns.forEach(pattern => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey.some(key => 
          typeof key === 'string' && key.includes(pattern)
        )
      });
    });
  }, [queryClient]);

  return {
    invalidateUserStats,
    invalidatePublicTracks,
    smartInvalidate
  };
}