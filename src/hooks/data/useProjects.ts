/**
 * @fileoverview Optimized React Query hook для Projects domain с auto-creation support
 * @version 0.01.033
 * @author Claude Code Assistant
 * @see {@link ../../../docs/architecture-diagrams.md#-projects-module-300-lines-each}
 * 
 * DOMAIN FOCUS: Projects как организационная сущность для треков
 * AUTO-CREATION: Автоматическое создание проектов при генерации треков
 * CACHING STRATEGY: Level 1 (React Query) + Level 2 (Global Context) integration
 * 
 * FEATURES:
 * - Project types (single/EP/album) с умными дефолтами
 * - Auto-creation при создании несвязанных треков
 * - AI concept generation для проектов
 * - Cover generation integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/providers/AppDataProvider';
import { useToast } from '@/hooks/use-toast';
import type { AppProject } from '@/providers/AppDataProvider';

// ====================================
// 🎯 TYPE DEFINITIONS
// ====================================

/**
 * Enhanced Project interface с generation context
 * 
 * DOMAIN MODEL: Projects как container для треков с AI поддержкой
 * AUTO_CREATION: Tracking источника создания проекта
 */
export interface EnhancedProject extends AppProject {
  /** 🎨 Project Details */
  details: {
    concept: string;                      // AI-generated или user concept  
    target_audience: string;              // Целевая аудитория
    release_strategy: string;             // Стратегия релиза
    marketing_notes: string;              // Маркетинговые заметки
    mood_description: string;             // Описание настроения
    genre_primary: string;                // Основной жанр
    genre_secondary?: string[];           // Дополнительные жанры
  };
  
  /** 📊 Project Statistics */
  stats?: {
    tracks_count: number;
    total_duration: number;              // Total duration in seconds
    completion_percentage: number;        // Project completion (0-100)
    last_activity: string;               // Last modification timestamp
  };
  
  /** 🤖 AI Generation Context */
  ai_context?: {
    auto_created: boolean;               // Was created automatically
    source_track_id?: string;            // Original track ID if auto-created
    generation_quality: number;          // AI generation quality (0-1)  
    concept_generated: boolean;          // Was concept AI-generated
    regeneration_count: number;          // How many times regenerated
  };
  
  /** 🎨 Cover Art Context */
  cover_context?: {
    provider: 'sunoapi' | 'stability' | 'dalle3' | 'midjourney';
    prompt_used: string;                 // Last used prompt
    generation_metadata: Record<string, unknown>;
    variants: string[];                  // Available cover variants
  };
}

/**
 * Project creation/update payload with intelligent defaults
 */
interface ProjectMutationPayload {
  title: string;
  type?: 'single' | 'ep' | 'album';
  artist_id: string;
  description?: string;
  
  /** 🤖 Auto-creation context */
  auto_creation?: {
    source: 'track_generation' | 'user_creation';
    source_track_id?: string;
    track_title?: string;                // For naming project after track
  };
  
  /** 🎨 AI Generation Options */
  ai_generation?: {
    generate_concept: boolean;
    artist_context?: string;             // Artist style context
    genre_preference?: string;
    mood_preference?: string;
    target_audience?: string;
  };
  
  /** 🖼️ Cover Generation Options */
  cover_generation?: {
    auto_generate: boolean;
    provider?: 'sunoapi' | 'stability' | 'dalle3';
    custom_prompt?: string;
    style_reference?: string;
  };
}

// ====================================
// 🎯 QUERY KEYS & CONFIGURATION
// ====================================

/**
 * Hierarchical query keys для efficient invalidation
 */
export const projectsQueryKeys = {
  all: ['projects'] as const,
  lists: () => [...projectsQueryKeys.all, 'list'] as const,
  list: (userId: string) => [...projectsQueryKeys.lists(), userId] as const,
  byArtist: (artistId: string) => [...projectsQueryKeys.all, 'by-artist', artistId] as const,
  details: () => [...projectsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectsQueryKeys.details(), id] as const,
  stats: (id: string) => [...projectsQueryKeys.detail(id), 'stats'] as const,
  tracks: (id: string) => [...projectsQueryKeys.detail(id), 'tracks'] as const,
};

/**
 * Performance-optimized query configuration
 */
const projectsQueryConfig = {
  staleTime: 5 * 60 * 1000,         // 5 minutes - projects change less frequently
  gcTime: 30 * 60 * 1000,        // 30 minutes cache
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

// ====================================
// 🎯 PRIMARY HOOKS
// ====================================

/**
 * Get all projects for current user
 * 
 * OPTIMIZATION: Integration с AppDataProvider для reduced server calls
 * PREFETCHING: Preload related artists data
 */
export function useProjects() {
  const { user } = useAuth();
  const { state, dispatch } = useAppData();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: projectsQueryKeys.list(user?.id || ''),
    queryFn: async (): Promise<EnhancedProject[]> => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('[useProjects] Fetching projects from database...');
      
      const { data, error }: { data: any; error: any } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          type,
          status,
          artist_id,
          cover_url,
          description,
          metadata,
          created_at,
          updated_at,
          artists!inner (
            id,
            name,
            avatar_url
          )
        `)
        .eq('artists.user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[useProjects] Database error:', error);
        throw error;
      }
      
      // TRANSFORM: Convert database format к domain model
      const enhancedProjects: EnhancedProject[] = (data || []).map(project => ({
        id: project.id,
        title: project.title,
        type: (project.type as 'single' | 'ep' | 'album') || 'single',
        status: (project.status as 'draft' | 'published' | 'archived') || 'draft',
        artist_id: project.artist_id,
        cover_url: project.cover_url,
        description: project.description,
        auto_generated: (project.metadata as any)?.auto_generated || false,
        generation_context: (project.metadata as any)?.generation_context,
        details: {
          concept: (project.metadata as any)?.details?.concept || '',
          target_audience: (project.metadata as any)?.details?.target_audience || '',
          release_strategy: (project.metadata as any)?.details?.release_strategy || '',
          marketing_notes: (project.metadata as any)?.details?.marketing_notes || '',
          mood_description: (project.metadata as any)?.details?.mood_description || '',
          genre_primary: (project.metadata as any)?.details?.genre_primary || '',
          genre_secondary: (project.metadata as any)?.details?.genre_secondary || [],
        },
        ai_context: (project.metadata as any)?.ai_context,
        cover_context: (project.metadata as any)?.cover_context,
        _cached_at: Date.now(),
        _cache_ttl: 30 * 60 * 1000,
      }));
      
      // SYNC: Update global state
      dispatch({ type: 'PROJECTS_SUCCESS', payload: enhancedProjects });
      
      // PREFETCHING: Load related artists data в background
      const artistIds = [...new Set(enhancedProjects.map(p => p.artist_id))];
      artistIds.forEach(artistId => {
        queryClient.prefetchQuery({
          queryKey: ['artists', 'detail', artistId],
          queryFn: async () => {
            const { data } = await supabase
              .from('artists')
              .select('*')
              .eq('id', artistId)
              .single();
            return data;
          },
          staleTime: projectsQueryConfig.staleTime,
        });
      });
      
      return enhancedProjects;
    },
    enabled: !!user,
    ...projectsQueryConfig,
    
    // OPTIMIZATION: Use global state as initial data
    initialData: () => {
      if (state.projects.items.length > 0 && !state.projects.loading) {
        console.log('[useProjects] Using cached data from global state');
        return state.projects.items as EnhancedProject[];
      }
      return undefined;
    },
    
  });
  
  return {
    projects: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    
    // PERFORMANCE: Cache statistics
    cacheStats: {
      lastFetch: state.projects.lastFetch,
      version: state.projects.version,
      cacheHit: !!query.data && !query.isFetching,
    },
  };
}

/**
 * Get projects by artist ID
 * 
 * OPTIMIZATION: Leverage main projects cache если possible
 */
export function useProjectsByArtist(artistId: string) {
  const { projects } = useProjects();
  
  // OPTIMIZATION: Filter from cached data instead of separate query
  const filteredProjects = projects.filter(p => p.artist_id === artistId);
  
  return {
    projects: filteredProjects,
    isLoading: false, // Already loaded from main cache
    count: filteredProjects.length,
  };
}

/**
 * Get single project by ID с enhanced details
 */
export function useProject(projectId: string) {
  const query = useQuery({
    queryKey: projectsQueryKeys.detail(projectId),
    queryFn: async (): Promise<EnhancedProject | null> => {
      console.log(`[useProject] Fetching project ${projectId}...`);
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          artists (id, name, avatar_url),
          tracks (count)
        `)
        .eq('id', projectId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      // ENHANCEMENT: Add computed statistics
      const enhanced: EnhancedProject = {
        ...data,
        type: (data.type as 'single' | 'ep' | 'album') || 'single',
        status: (data.status as 'draft' | 'published' | 'archived') || 'draft',
        details: (data.metadata as any)?.details || {
          concept: '',
          target_audience: '',
          release_strategy: '',
          marketing_notes: '',
          mood_description: '',
          genre_primary: '',
          genre_secondary: [],
        },
        stats: {
          tracks_count: data.tracks?.length || 0,
          total_duration: 0, // TODO: Calculate from tracks
          completion_percentage: 0, // TODO: Calculate based on tracks/goals
          last_activity: data.updated_at,
        },
        ai_context: (data.metadata as any)?.ai_context,
        cover_context: (data.metadata as any)?.cover_context,
        _cached_at: Date.now(),
      };
      
      return enhanced;
    },
    enabled: !!projectId,
    ...projectsQueryConfig,
  });
  
  return {
    project: query.data,
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
 * Create new project с AI generation support и auto-creation logic
 * 
 * FEATURES:
 * - Auto-creation при track generation без проекта
 * - AI concept generation
 * - Cover generation integration
 * - Optimistic updates
 */
export function useCreateProject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { dispatch } = useAppData();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (payload: ProjectMutationPayload): Promise<EnhancedProject> => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('[useCreateProject] Creating project:', payload.title);
      
      // STEP 1: Determine project type based on creation context
      let projectType = payload.type || 'single';
      
      if (payload.auto_creation?.source === 'track_generation') {
        // AUTO-CREATION: Default to single for track-generated projects
        projectType = 'single';
        console.log('[useCreateProject] Auto-creating project for track generation');
      }
      
      // STEP 2: Create basic project record
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: payload.title,
          type: projectType,
          status: 'draft',
          artist_id: payload.artist_id,
          description: payload.description,
          metadata: {
            auto_generated: !!payload.auto_creation,
            generation_context: payload.auto_creation ? {
              source: payload.auto_creation.source,
              original_track_id: payload.auto_creation.source_track_id,
            } : undefined,
            ai_context: payload.ai_generation ? {
              auto_created: true,
              generation_quality: 0,
              concept_generated: false,
              regeneration_count: 0,
            } : undefined,
          },
        })
        .select()
        .single();
      
      if (projectError) throw projectError;
      
      // STEP 3: AI Concept Generation если requested
      if (payload.ai_generation?.generate_concept) {
        try {
          console.log('[useCreateProject] Generating AI concept...');
          
          const { data: aiData, error: aiError } = await supabase.functions.invoke(
            'generate-project-concept',
            {
              body: {
                projectTitle: payload.title,
                projectType: projectType,
                artistContext: payload.ai_generation.artist_context,
                genrePreference: payload.ai_generation.genre_preference,
                moodPreference: payload.ai_generation.mood_preference,
                targetAudience: payload.ai_generation.target_audience,
              },
            }
          );
          
          if (aiError) {
            console.warn('[useCreateProject] AI concept generation failed:', aiError);
          } else if (aiData?.success) {
            // Update project с AI-generated concept
            await supabase
              .from('projects')
              .update({
                metadata: {
                  ...(projectData.metadata as any),
                  details: aiData.data.concept,
                  ai_context: {
                    ...(projectData.metadata as any)?.ai_context,
                    concept_generated: true,
                    generation_quality: aiData.data.quality_score || 0.8,
                  },
                },
              })
              .eq('id', projectData.id);
          }
        } catch (aiError) {
          console.warn('[useCreateProject] AI concept generation error:', aiError);
          // Continue без AI concept - graceful degradation
        }
      }
      
      // STEP 4: Cover Generation если requested
      if (payload.cover_generation?.auto_generate) {
        try {
          console.log('[useCreateProject] Generating project cover...');
          
          const { data: coverData, error: coverError } = await supabase.functions.invoke(
            'generate-cover-image',
            {
              body: {
                title: payload.title,
                type: 'project',
                provider: payload.cover_generation.provider || 'sunoapi',
                customPrompt: payload.cover_generation.custom_prompt,
                styleReference: payload.cover_generation.style_reference,
                projectType: projectType,
              },
            }
          );
          
          if (coverError) {
            console.warn('[useCreateProject] Cover generation failed:', coverError);
          } else if (coverData?.success) {
            // Update project с generated cover
            await supabase
              .from('projects')
              .update({
                cover_url: coverData.data.cover_url,
                metadata: {
                  ...(projectData.metadata as any),
                  cover_context: {
                    provider: payload.cover_generation.provider || 'sunoapi',
                    prompt_used: coverData.data.prompt_used,
                    generation_metadata: coverData.data.metadata,
                    variants: coverData.data.variants || [],
                  },
                },
              })
              .eq('id', projectData.id);
          }
        } catch (coverError) {
          console.warn('[useCreateProject] Cover generation error:', coverError);
          // Continue без cover - graceful degradation
        }
      }
      
      // TRANSFORM: Return enhanced project
      const enhancedProject: EnhancedProject = {
        id: projectData.id,
        title: projectData.title,
        type: (projectData.type as 'single' | 'ep' | 'album') || 'single',
        status: (projectData.status as 'draft' | 'published' | 'archived') || 'draft',
        artist_id: projectData.artist_id,
        cover_url: projectData.cover_url,
        description: projectData.description,
        auto_generated: (projectData.metadata as any)?.auto_generated || false,
        generation_context: (projectData.metadata as any)?.generation_context,
        details: (projectData.metadata as any)?.details || {
          concept: '',
          target_audience: '',
          release_strategy: '',
          marketing_notes: '',
          mood_description: '',
          genre_primary: '',
          genre_secondary: [],
        },
        ai_context: (projectData.metadata as any)?.ai_context,
        cover_context: (projectData.metadata as any)?.cover_context,
        _cached_at: Date.now(),
      };
      
      return enhancedProject;
    },
    
    // OPTIMISTIC UPDATES: Immediate UI feedback
    onMutate: async (payload) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: projectsQueryKeys.all });
      
      // Create optimistic project
      const optimisticProject: EnhancedProject = {
        id: `temp-${Date.now()}`,
        title: payload.title,
        type: payload.type || 'single',
        status: 'draft',
        artist_id: payload.artist_id,
        description: payload.description,
        auto_generated: !!payload.auto_creation,
        generation_context: payload.auto_creation ? {
          source: 'user_creation' as const,
          original_track_id: payload.auto_creation.source_track_id,
        } : undefined,
        details: {
          concept: '',
          target_audience: '',
          release_strategy: '',
          marketing_notes: '',
          mood_description: '',
          genre_primary: '',
          genre_secondary: [],
        },
        _cached_at: Date.now(),
      };
      
      // Update cache optimistically
      const previousProjects = queryClient.getQueryData<EnhancedProject[]>(
        projectsQueryKeys.list(user?.id || '')
      );
      
      if (previousProjects) {
        queryClient.setQueryData(
          projectsQueryKeys.list(user?.id || ''),
          [optimisticProject, ...previousProjects]
        );
      }
      
      // Update global state optimistically
      dispatch({ type: 'PROJECT_UPDATE', payload: optimisticProject });
      
      return { previousProjects };
    },
    
    // SUCCESS: Update cache с real data
    onSuccess: (newProject) => {
      // Update list cache
      const previousData = queryClient.getQueryData<EnhancedProject[]>(
        projectsQueryKeys.list(user?.id || '')
      );
      
      if (previousData) {
        const updatedData = previousData.map(project =>
          project.id.startsWith('temp-') ? newProject : project
        );
        
        queryClient.setQueryData(
          projectsQueryKeys.list(user?.id || ''),
          updatedData
        );
      }
      
      // Set individual project cache
      queryClient.setQueryData(
        projectsQueryKeys.detail(newProject.id),
        newProject
      );
      
      // Update global state
      dispatch({ type: 'PROJECT_UPDATE', payload: newProject });
      
      const creationType = newProject.auto_generated ? 'автоматически создан' : 'создан';
      toast({
        title: "✅ Проект создан",
        description: `${newProject.title} ${creationType}`,
      });
    },
    
    // ERROR: Rollback optimistic updates
    onError: (error, payload, context) => {
      console.error('[useCreateProject] Mutation failed:', error);
      
      if (context?.previousProjects) {
        queryClient.setQueryData(
          projectsQueryKeys.list(user?.id || ''),
          context.previousProjects
        );
      }
      
      dispatch({ type: 'PROJECTS_ERROR', payload: error.message });
      
      toast({
        title: "❌ Ошибка создания",
        description: `Не удалось создать проект: ${error.message}`,
        variant: "destructive",
      });
    },
    
    // CLEANUP: Invalidate related queries
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all });
    },
  });
}

// TODO: Implement useUpdateProject hook
// TODO: Implement useDeleteProject hook
// TODO: Add project analytics hooks
// TODO: Add bulk operations support

/**
 * PERFORMANCE NOTES:
 * 
 * 1. AUTO-CREATION PATTERN:
 *    - Seamless project creation для tracks без проекта
 *    - Smart defaults based на track metadata
 *    - AI concept generation для enhanced projects
 * 
 * 2. CACHING OPTIMIZATIONS:
 *    - Artist data prefetching для project displays
 *    - Global state integration для immediate access
 *    - Optimistic updates для instant feedback
 * 
 * 3. AI INTEGRATION:
 *    - Optional concept generation с quality scoring
 *    - Graceful degradation если AI services unavailable
 *    - Context preservation для future enhancements
 * 
 * 4. COVER GENERATION:
 *    - Multi-provider support (SunoAPI, Stability, DALL-E)
 *    - Default auto-generation с custom override options
 *    - Metadata tracking для regeneration support
 */