/**
 * @fileoverview Optimized React Query hook для Artists domain
 * @version 0.01.032
 * @author Claude Code Assistant  
 * @see {@link ../../../docs/architecture-diagrams.md#-component-architecture}
 * 
 * DOMAIN FOCUS: Artists as core entity с enhanced virtual persona
 * CACHING STRATEGY: Level 1 (React Query) + Level 2 (Global Context) integration
 * PERFORMANCE TARGET: <200ms query time, 80% cache hit rate
 * 
 * FEATURES:
 * - Enhanced artist profiles (goals, mission, style)
 * - Optimistic updates для immediate UI feedback
 * - Background sync с smart invalidation
 * - Prefetching для predictive loading
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/providers/AppDataProvider';
import { useToast } from '@/hooks/use-toast';
import type { AppArtist } from '@/providers/AppDataProvider';

// ====================================
// 🎯 TYPE DEFINITIONS
// ====================================

/**
 * Enhanced Artist interface с virtual persona details
 * 
 * DOMAIN MODEL: Artists как центральная сущность всей системы
 * AI INTEGRATION: Поля для AI-генерированного контента
 */
export interface EnhancedArtist extends AppArtist {
  /** 🎭 Virtual Persona Details */
  profile: {
    goals: string;                    // Artistic goals и vision
    mission: string;                  // Creative mission statement  
    style: string;                    // Musical style definition
    creative_brief: string;           // Detailed creative brief
    musical_preferences: string[];    // Genre preferences
    target_audience: string;          // Target demographic
    brand_voice: string;              // Communication style
    influences: string[];             // Musical influences
  };
  
  /** 📊 Performance Metrics */
  metrics?: {
    tracks_count: number;
    projects_count: number;
    total_streams: number;
    avg_track_rating: number;
  };
  
  /** 🤖 AI Generation Context */
  ai_context?: {
    last_generated: string;           // Last AI generation timestamp
    generation_quality_score: number; // Quality rating (0-1)
    preferred_providers: string[];    // Preferred AI providers
    custom_prompts: Record<string, string>; // Custom prompts library
  };
}

/**
 * Artist creation/update payload
 * 
 * VALIDATION: Strict typing для data integrity
 * AI_READY: Optional AI generation parameters
 */
interface ArtistMutationPayload {
  name: string;
  description?: string;
  avatar_url?: string;
  profile?: Partial<EnhancedArtist['profile']>;
  
  /** 🤖 AI Generation Options */
  ai_generation?: {
    auto_generate_profile: boolean;
    style_reference?: string;
    target_genre?: string;
    personality_traits?: string[];
  };
}

// ====================================
// 🎯 QUERY KEYS & CONFIGURATION
// ====================================

/**
 * Centralized query keys для consistent caching
 * 
 * PATTERN: Hierarchical keys для efficient invalidation
 * SCOPE: User-scoped keys для multi-tenant support
 */
export const artistsQueryKeys = {
  all: ['artists'] as const,
  lists: () => [...artistsQueryKeys.all, 'list'] as const,
  list: (userId: string) => [...artistsQueryKeys.lists(), userId] as const,
  details: () => [...artistsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...artistsQueryKeys.details(), id] as const,
  metrics: (id: string) => [...artistsQueryKeys.detail(id), 'metrics'] as const,
  generations: (id: string) => [...artistsQueryKeys.detail(id), 'generations'] as const,
};

/**
 * Performance-optimized query configuration
 * 
 * CACHING: Aggressive caching для frequently accessed data
 * BACKGROUND_SYNC: Keep data fresh без blocking UI
 */
const artistsQueryConfig = {
  staleTime: 5 * 60 * 1000,         // 5 minutes - data считается fresh
  gcTime: 30 * 60 * 1000,        // 30 minutes - keep in memory
  refetchOnWindowFocus: false,       // Don't refetch on tab focus
  refetchOnReconnect: true,          // Refetch on network reconnection
  retry: 2,                          // Retry failed requests 2 times
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
};

// ====================================
// 🎯 PRIMARY HOOKS
// ====================================

/**
 * Get all artists for current user
 * 
 * OPTIMIZATION: Integration с AppDataProvider для reduced server calls
 * PREFETCHING: Automatically prefetch related data
 */
export function useArtists() {
  const { user } = useAuth();
  const { state, dispatch } = useAppData();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: artistsQueryKeys.list(user?.id || ''),
    queryFn: async (): Promise<EnhancedArtist[]> => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('[useArtists] Fetching artists from database...');
      
      const { data, error } = await supabase
        .from('artists')
        .select(`
          id,
          name,
          description,
          avatar_url,
          metadata,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('name');
      
      if (error) {
        console.error('[useArtists] Database error:', error);
        throw error;
      }
      
      // TRANSFORM: Convert database format к domain model
      const enhancedArtists: EnhancedArtist[] = (data || []).map(artist => ({
        id: artist.id,
        name: artist.name,
        description: artist.description,
        avatar_url: artist.avatar_url,
        profile: {
          goals: (artist.metadata as any)?.profile?.goals || '',
          mission: (artist.metadata as any)?.profile?.mission || '',
          style: (artist.metadata as any)?.profile?.style || '',
          creative_brief: (artist.metadata as any)?.profile?.creative_brief || '',
          musical_preferences: (artist.metadata as any)?.profile?.musical_preferences || [],
          target_audience: (artist.metadata as any)?.profile?.target_audience || '',
          brand_voice: (artist.metadata as any)?.profile?.brand_voice || '',
          influences: (artist.metadata as any)?.profile?.influences || [],
        },
        ai_context: (artist.metadata as any)?.ai_context,
        _cached_at: Date.now(),
        _cache_ttl: 30 * 60 * 1000, // 30 minutes
      }));
      
      // SYNC: Update global state
      dispatch({ type: 'ARTISTS_SUCCESS', payload: enhancedArtists });
      
      // PREFETCHING: Load related data в background
      enhancedArtists.forEach(artist => {
        queryClient.prefetchQuery({
          queryKey: artistsQueryKeys.detail(artist.id),
          queryFn: () => Promise.resolve(artist),
          staleTime: artistsQueryConfig.staleTime,
        });
      });
      
      return enhancedArtists;
    },
    enabled: !!user,
    ...artistsQueryConfig,
    
    // OPTIMIZATION: Use global state as initial data
    initialData: () => {
      if (state.artists.items.length > 0 && !state.artists.loading) {
        console.log('[useArtists] Using cached data from global state');
        return state.artists.items as EnhancedArtist[];
      }
      return undefined;
    },
    
    
  });
  
  return {
    artists: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    
    // PERFORMANCE: Cache statistics
    cacheStats: {
      lastFetch: state.artists.lastFetch,
      version: state.artists.version,
      cacheHit: !!query.data && !query.isFetching,
    },
  };
}

/**
 * Get single artist by ID с enhanced details
 * 
 * OPTIMIZATION: Leverage list cache если available
 * METRICS: Include performance и usage metrics
 */
export function useArtist(artistId: string) {
  const query = useQuery({
    queryKey: artistsQueryKeys.detail(artistId),
    queryFn: async (): Promise<EnhancedArtist | null> => {
      console.log(`[useArtist] Fetching artist ${artistId}...`);
      
      const { data, error } = await supabase
        .from('artists')
        .select(`
          *,
          projects(count),
          tracks(count)
        `)
        .eq('id', artistId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      // ENHANCEMENT: Add computed metrics
      const enhanced: EnhancedArtist = {
        ...data,
        profile: (data.metadata as any)?.profile || {
          goals: '',
          mission: '',
          style: '',
          creative_brief: '',
          musical_preferences: [],
          target_audience: '',
          brand_voice: '',
          influences: [],
        },
        metrics: {
          tracks_count: data.tracks?.length || 0,
          projects_count: data.projects?.length || 0,
          total_streams: (data.metadata as any)?.metrics?.total_streams || 0,
          avg_track_rating: (data.metadata as any)?.metrics?.avg_track_rating || 0,
        },
        ai_context: (data.metadata as any)?.ai_context,
        _cached_at: Date.now(),
      };
      
      return enhanced;
    },
    enabled: !!artistId,
    ...artistsQueryConfig,
    
    // OPTIMIZATION: Try to get from list cache first
    initialDataUpdatedAt: () => {
      const queryClient = useQueryClient();
      const listData = queryClient.getQueryData<EnhancedArtist[]>(
        artistsQueryKeys.list('') // TODO: Get actual user ID
      );
      
      const cachedArtist = listData?.find(a => a.id === artistId);
      return cachedArtist?._cached_at;
    },
    
    initialData: () => {
      const queryClient = useQueryClient();
      const listData = queryClient.getQueryData<EnhancedArtist[]>(
        artistsQueryKeys.list('') // TODO: Get actual user ID
      );
      
      return listData?.find(a => a.id === artistId);
    },
  });
  
  return {
    artist: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ====================================
// 🔄 MUTATION HOOKS
// ====================================

/**
 * Create new artist с AI generation support
 * 
 * FEATURES:
 * - Optimistic updates для immediate feedback
 * - AI profile generation если requested
 * - Automatic cache invalidation
 */
export function useCreateArtist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { dispatch } = useAppData();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (payload: ArtistMutationPayload): Promise<EnhancedArtist> => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('[useCreateArtist] Creating artist:', payload.name);
      
      // STEP 1: Create basic artist record
      const { data: artistData, error: artistError } = await supabase
        .from('artists')
        .insert({
          user_id: user.id,
          name: payload.name,
          description: payload.description,
          avatar_url: payload.avatar_url,
          metadata: {
            profile: payload.profile,
            ai_context: payload.ai_generation ? {
              last_generated: new Date().toISOString(),
              generation_quality_score: 0,
              preferred_providers: ['openai'],
              custom_prompts: {},
            } : undefined,
          },
        })
        .select()
        .single();
      
      if (artistError) throw artistError;
      
      // STEP 2: AI Profile Generation если requested
      if (payload.ai_generation?.auto_generate_profile) {
        try {
          console.log('[useCreateArtist] Generating AI profile...');
          
          const { data: aiData, error: aiError } = await supabase.functions.invoke(
            'generate-artist-info',
            {
              body: {
                artistName: payload.name,
                styleReference: payload.ai_generation.style_reference,
                targetGenre: payload.ai_generation.target_genre,
                personalityTraits: payload.ai_generation.personality_traits,
              },
            }
          );
          
          if (aiError) {
            console.warn('[useCreateArtist] AI generation failed:', aiError);
          } else if (aiData?.success) {
            // Update artist с AI-generated profile
            const { error: updateError } = await supabase
              .from('artists')
              .update({
                metadata: {
                  ...(artistData.metadata as any),
                  profile: {
                    ...payload.profile,
                    ...aiData.data.profile,
                  },
                  ai_context: {
                    ...(artistData.metadata as any)?.ai_context,
                    generation_quality_score: aiData.data.quality_score || 0.8,
                  },
                },
              })
              .eq('id', artistData.id);
            
            if (updateError) {
              console.warn('[useCreateArtist] Profile update failed:', updateError);
            }
          }
        } catch (aiError) {
          console.warn('[useCreateArtist] AI generation error:', aiError);
          // Continue без AI profile - graceful degradation
        }
      }
      
      // TRANSFORM: Return enhanced artist
      const enhancedArtist: EnhancedArtist = {
        id: artistData.id,
        name: artistData.name,
        description: artistData.description,
        avatar_url: artistData.avatar_url,
        profile: (artistData.metadata as any)?.profile || {
          goals: '',
          mission: '',
          style: '',
          creative_brief: '',
          musical_preferences: [],
          target_audience: '',
          brand_voice: '',
          influences: [],
        },
        ai_context: (artistData.metadata as any)?.ai_context,
        _cached_at: Date.now(),
      };
      
      return enhancedArtist;
    },
    
    // OPTIMISTIC UPDATES: Immediate UI feedback
    onMutate: async (payload) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: artistsQueryKeys.all });
      
      // Create optimistic artist
      const optimisticArtist: EnhancedArtist = {
        id: `temp-${Date.now()}`,
        name: payload.name,
        description: payload.description,
        avatar_url: payload.avatar_url,
        profile: {
          goals: payload.profile?.goals || '',
          mission: payload.profile?.mission || '',
          style: payload.profile?.style || '',
          creative_brief: payload.profile?.creative_brief || '',
          musical_preferences: payload.profile?.musical_preferences || [],
          target_audience: payload.profile?.target_audience || '',
          brand_voice: payload.profile?.brand_voice || '',
          influences: payload.profile?.influences || [],
        },
        _cached_at: Date.now(),
      };
      
      // Update cache optimistically
      const previousArtists = queryClient.getQueryData<EnhancedArtist[]>(
        artistsQueryKeys.list(user?.id || '')
      );
      
      if (previousArtists) {
        queryClient.setQueryData(
          artistsQueryKeys.list(user?.id || ''),
          [...previousArtists, optimisticArtist]
        );
      }
      
      // Update global state optimistically
      dispatch({ type: 'ARTIST_UPDATE', payload: optimisticArtist });
      
      return { previousArtists };
    },
    
    // SUCCESS: Update cache с real data
    onSuccess: (newArtist) => {
      // Update list cache
      const previousData = queryClient.getQueryData<EnhancedArtist[]>(
        artistsQueryKeys.list(user?.id || '')
      );
      
      if (previousData) {
        const updatedData = previousData.map(artist =>
          artist.id.startsWith('temp-') ? newArtist : artist
        );
        
        queryClient.setQueryData(
          artistsQueryKeys.list(user?.id || ''),
          updatedData
        );
      }
      
      // Set individual artist cache
      queryClient.setQueryData(
        artistsQueryKeys.detail(newArtist.id),
        newArtist
      );
      
      // Update global state
      dispatch({ type: 'ARTIST_UPDATE', payload: newArtist });
      
      toast({
        title: "✅ Артист создан",
        description: `${newArtist.name} добавлен в вашу коллекцию`,
      });
    },
    
    // ERROR: Rollback optimistic updates
    onError: (error, payload, context) => {
      console.error('[useCreateArtist] Mutation failed:', error);
      
      if (context?.previousArtists) {
        queryClient.setQueryData(
          artistsQueryKeys.list(user?.id || ''),
          context.previousArtists
        );
      }
      
      dispatch({ type: 'ARTISTS_ERROR', payload: error.message });
      
      toast({
        title: "❌ Ошибка создания",
        description: `Не удалось создать артиста: ${error.message}`,
        variant: "destructive",
      });
    },
    
    // CLEANUP: Invalidate related queries
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: artistsQueryKeys.all });
    },
  });
}

// TODO: Implement useUpdateArtist hook
// TODO: Implement useDeleteArtist hook  
// TODO: Add artist metrics hooks
// TODO: Add artist collaborations hooks

/**
 * PERFORMANCE NOTES:
 * 
 * 1. CACHING STRATEGY:
 *    - 5min stale time для fresh data
 *    - 30min cache time для memory efficiency
 *    - Background refetching для up-to-date data
 * 
 * 2. OPTIMIZATION TECHNIQUES:
 *    - Initial data from global state
 *    - Prefetching related queries
 *    - Optimistic updates для immediate feedback
 *    - Selective query invalidation
 * 
 * 3. AI INTEGRATION:
 *    - Optional AI profile generation
 *    - Context preservation для future generations  
 *    - Quality scoring для optimization
 * 
 * 4. ERROR HANDLING:
 *    - Graceful degradation for AI failures
 *    - Rollback optimistic updates
 *    - User-friendly error messages
 */