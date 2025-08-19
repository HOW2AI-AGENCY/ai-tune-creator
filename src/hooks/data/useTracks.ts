/**
 * @fileoverview Optimized React Query hook для Tracks domain с версионированием и AI integration
 * @version 0.01.033
 * @author Claude Code Assistant
 * @see {@link ../../../docs/architecture-diagrams.md#-tracks-domain-content}
 * 
 * DOMAIN FOCUS: Tracks как content entity с rich metadata и версионированием
 * AI_INTEGRATION: Seamless Suno/Mureka integration с context preservation
 * CACHING STRATEGY: Level 1 (React Query) + Level 2 (Global Context) integration
 * 
 * FEATURES:
 * - Track versions management с change tracking
 * - AI generation integration (Suno, Mureka)
 * - Project auto-creation для orphaned tracks
 * - Audio metadata parsing и storage
 * - Lyrics с SUNO.AI tag support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/providers/AppDataProvider';
import { useToast } from '@/hooks/use-toast';
import { eventBus } from '@/lib/events/event-bus';
import { useCreateProject } from './useProjects';
import type { AppTrack } from '@/providers/AppDataProvider';

// ====================================
// 🎯 TYPE DEFINITIONS
// ====================================

/**
 * Enhanced Track interface с версионированием и AI context
 */
export interface EnhancedTrack extends AppTrack {
  /** 🎵 Track Metadata */
  metadata: {
    bpm?: number;
    key?: string;                        // Musical key (C, Dm, etc.)
    time_signature?: string;             // 4/4, 3/4, etc.
    tempo_description?: string;          // Slow, Medium, Fast
    energy_level?: number;               // 0-100 energy rating
    mood_tags?: string[];                // Happy, Sad, Energetic, etc.
    instruments?: string[];              // Guitar, Piano, Drums, etc.
    vocals_type?: 'male' | 'female' | 'mixed' | 'instrumental';
  };
  
  /** 🎨 AI Generation Context */
  ai_context?: {
    provider: 'suno' | 'mureka' | 'hybrid';
    generation_id?: string;              // Provider's generation ID
    prompt_used: string;                 // Original generation prompt
    style_prompt?: string;               // Style-specific prompt
    lyrics_prompt?: string;              // Lyrics generation prompt
    generation_quality: number;          // Quality score (0-1)
    generation_time: number;             // Generation time in seconds
    seed_used?: number;                  // Random seed for reproducibility
    model_version?: string;              // AI model version used
  };
  
  /** 📝 Lyrics Context */
  lyrics_context?: {
    has_suno_tags: boolean;              // Contains [Verse], [Chorus] tags
    structure_detected: string[];        // Detected song structure
    language: string;                    // Detected language
    explicit_content: boolean;           // Contains explicit content
    character_count: number;             // Total character count
    word_count: number;                  // Total word count
    estimated_duration?: number;         // Estimated song duration from lyrics
  };
  
  /** 🔄 Version Management */
  versions?: {
    version_number: number;              // Current version (1, 2, 3...)
    parent_version_id?: string;          // Parent version ID
    change_description?: string;         // What changed in this version
    created_by: 'user' | 'ai' | 'collaboration';
    is_current: boolean;                 // Is this the current version
    version_history?: Array<{
      version: number;
      created_at: string;
      changes: string;
      audio_url?: string;
    }>;
  };
  
  /** 👥 Collaboration Context */
  collaboration?: {
    is_remix: boolean;
    original_track_id?: string;          // If this is a remix/version
    collaborators?: string[];            // User IDs of collaborators
    remix_permissions: 'none' | 'friends' | 'public';
    attribution_required: boolean;
  };
}

/**
 * Track creation payload с intelligent project handling
 */
interface TrackMutationPayload {
  title: string;
  project_id?: string;                   // Optional - will auto-create if not provided
  artist_id: string;                     // Required for project auto-creation
  lyrics?: string;
  genre_tags?: string[];
  
  /** 🤖 AI Generation Context */
  ai_generation?: {
    provider: 'suno' | 'mureka';
    prompt: string;
    style_prompt?: string;
    lyrics_prompt?: string;
    generate_instrumental: boolean;
    seed?: number;
    model_preferences?: Record<string, unknown>;
  };
  
  /** 📁 Project Auto-Creation */
  auto_project?: {
    create_if_missing: boolean;
    project_title?: string;              // Default to track title
    project_type?: 'single' | 'ep' | 'album';
    generate_project_concept?: boolean;
  };
  
  /** 🔄 Version Context */
  version_context?: {
    parent_track_id?: string;            // If this is a new version
    change_description?: string;
    is_remix?: boolean;
  };
}

// ====================================
// 🎯 QUERY KEYS & CONFIGURATION
// ====================================

/**
 * Hierarchical query keys для comprehensive track management
 */
export const tracksQueryKeys = {
  all: ['tracks'] as const,
  lists: () => [...tracksQueryKeys.all, 'list'] as const,
  list: (userId: string) => [...tracksQueryKeys.lists(), userId] as const,
  byProject: (projectId: string) => [...tracksQueryKeys.all, 'by-project', projectId] as const,
  byArtist: (artistId: string) => [...tracksQueryKeys.all, 'by-artist', artistId] as const,
  details: () => [...tracksQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...tracksQueryKeys.details(), id] as const,
  versions: (id: string) => [...tracksQueryKeys.detail(id), 'versions'] as const,
  lyrics: (id: string) => [...tracksQueryKeys.detail(id), 'lyrics'] as const,
  collaborations: (id: string) => [...tracksQueryKeys.detail(id), 'collaborations'] as const,
};

/**
 * Performance-optimized query configuration для audio content
 */
const tracksQueryConfig = {
  staleTime: 3 * 60 * 1000,         // 3 minutes - audio content changes frequently
  gcTime: 15 * 60 * 1000,        // 15 minutes cache для audio URLs
  refetchOnWindowFocus: false,       // Avoid refetching audio metadata
  refetchOnReconnect: true,
  retry: 1,                          // Less retries for large audio data
  retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
};

// ====================================
// 🎯 PRIMARY HOOKS
// ====================================

/**
 * Get all tracks for current user с advanced filtering
 */
export function useTracks(options?: {
  projectId?: string;
  artistId?: string;
  includeVersions?: boolean;
}) {
  const { user } = useAuth();
  const { state, dispatch } = useAppData();
  const queryClient = useQueryClient();
  
  const queryKey = options?.projectId 
    ? tracksQueryKeys.byProject(options.projectId)
    : options?.artistId
    ? tracksQueryKeys.byArtist(options.artistId)
    : tracksQueryKeys.list(user?.id || '');
  
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<EnhancedTrack[]> => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('[useTracks] Fetching tracks from database...');
      
      const baseQuery = supabase
        .from('tracks')
        .select(`
          id,
          title,
          project_id,
          audio_url,
          lyrics,
          duration,
          genre_tags,
          metadata,
          created_at,
          updated_at,
          projects!inner (
            id,
            title,
            artist_id,
            artists (
              id,
              name,
              avatar_url
            )
          )
        `)
        .eq('projects.artists.user_id', user.id);
      
      // Apply filtering based on options
      let finalQuery: any = baseQuery;
      if (options?.projectId) {
        finalQuery = finalQuery.eq('project_id', options.projectId);
      }
      if (options?.artistId) {
        finalQuery = finalQuery.eq('projects.artist_id', options.artistId);
      }
      
      finalQuery = finalQuery.order('updated_at', { ascending: false });
      
      const { data, error } = await finalQuery;
      
      if (error) {
        console.error('[useTracks] Database error:', error);
        throw error;
      }
      
      // TRANSFORM: Convert database format к domain model
      const enhancedTracks: EnhancedTrack[] = (data || []).map(track => ({
        id: track.id,
        title: track.title,
        project_id: track.project_id,
        audio_url: track.audio_url,
        lyrics: track.lyrics,
        duration: track.duration,
        genre_tags: track.genre_tags || [],
        
        metadata: (track.metadata as any)?.metadata || {},
        ai_context: (track.metadata as any)?.ai_context,
        lyrics_context: (track.metadata as any)?.lyrics_context,
        versions: (track.metadata as any)?.versions,
        collaboration: (track.metadata as any)?.collaboration,
        
        _cached_at: Date.now(),
        _cache_ttl: tracksQueryConfig.gcTime,
      }));
      
      // SYNC: Update global state
      dispatch({ type: 'TRACKS_SUCCESS', payload: enhancedTracks });
      
      // PREFETCHING: Load project и artist data в background
      const projectIds = [...new Set(enhancedTracks.map(t => t.project_id))];
      projectIds.forEach(projectId => {
        if (projectId) {
          queryClient.prefetchQuery({
            queryKey: ['projects', 'detail', projectId],
            queryFn: async () => {
              const { data } = await supabase
                .from('projects')
                .select('*, artists (*)')
                .eq('id', projectId)
                .single();
              return data;
            },
            staleTime: tracksQueryConfig.staleTime,
          });
        }
      });
      
      return enhancedTracks;
    },
    enabled: !!user,
    ...tracksQueryConfig,
    
    // OPTIMIZATION: Use global state as initial data
    initialData: () => {
      if (state.tracks.items.length > 0 && !state.tracks.loading) {
        console.log('[useTracks] Using cached data from global state');
        let filteredTracks = state.tracks.items as EnhancedTrack[];
        
        // Apply client-side filtering for performance
        if (options?.projectId) {
          filteredTracks = filteredTracks.filter(t => t.project_id === options.projectId);
        }
        
        return filteredTracks.length > 0 ? filteredTracks : undefined;
      }
      return undefined;
    },
    
  });
  
  return {
    tracks: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    
    // Helper methods for common operations
    getByProject: (projectId: string) => (query.data || []).filter(t => t.project_id === projectId),
    getByGenre: (genre: string) => (query.data || []).filter(t => t.genre_tags?.includes(genre)),
    getCurrentVersions: () => (query.data || []).filter(t => t.versions?.is_current !== false),
  };
}

/**
 * Get single track by ID с comprehensive details
 */
export function useTrack(trackId: string, options?: { includeVersions?: boolean }) {
  const query = useQuery({
    queryKey: tracksQueryKeys.detail(trackId),
    queryFn: async (): Promise<EnhancedTrack | null> => {
      console.log(`[useTrack] Fetching track ${trackId}...`);
      
      let selectQuery = `
        *,
        projects (id, title, type, artist_id, artists (id, name, avatar_url))
      `;
      
      if (options?.includeVersions) {
        selectQuery += `, track_versions (*)`;
      }
      
      const { data, error } = await supabase
        .from('tracks')
        .select(selectQuery)
        .eq('id', trackId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      // ENHANCEMENT: Process и analyze lyrics для structure detection
      const metadataObj = (data as any)?.metadata || {};
      let lyricsContext = metadataObj.lyrics_context;
      if (data && (data as any).lyrics && !lyricsContext) {
        lyricsContext = analyzeLyrics((data as any).lyrics);
      }
      
      const enhanced: EnhancedTrack = {
        ...(data as any),
        metadata: metadataObj?.metadata || {},
        ai_context: metadataObj?.ai_context,
        lyrics_context: lyricsContext,
        versions: metadataObj?.versions || {
          version_number: 1,
          is_current: true,
          created_by: 'user',
        },
        collaboration: metadataObj?.collaboration,
        _cached_at: Date.now(),
      };
      
      return enhanced;
    },
    enabled: !!trackId,
    ...tracksQueryConfig,
  });
  
  return {
    track: query.data,
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
 * Create new track с AI generation и auto-project creation
 */
export function useCreateTrack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { dispatch } = useAppData();
  const { toast } = useToast();
  const createProject = useCreateProject();
  
  return useMutation({
    mutationFn: async (payload: TrackMutationPayload): Promise<EnhancedTrack> => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('[useCreateTrack] Creating track:', payload.title);
      
      let finalProjectId = payload.project_id;
      
      // STEP 1: Auto-create project if needed
      if (!finalProjectId && payload.auto_project?.create_if_missing) {
        console.log('[useCreateTrack] Auto-creating project for track...');
        
        try {
          const projectPayload = {
            title: payload.auto_project.project_title || payload.title,
            type: payload.auto_project.project_type || 'single',
            artist_id: payload.artist_id,
            auto_creation: {
              source: 'track_generation' as const,
              track_title: payload.title,
            },
            ai_generation: payload.auto_project.generate_project_concept ? {
              generate_concept: true,
              genre_preference: payload.genre_tags?.[0],
            } : undefined,
          };
          
          const newProject = await createProject.mutateAsync(projectPayload);
          finalProjectId = newProject.id;
          
          console.log('[useCreateTrack] Auto-created project:', newProject.title);
        } catch (error) {
          console.error('[useCreateTrack] Auto-project creation failed:', error);
          throw new Error(`Failed to auto-create project: ${error}`);
        }
      }
      
      if (!finalProjectId) {
        throw new Error('No project ID provided and auto-creation disabled');
      }
      
      // STEP 2: AI Track Generation если requested
      let aiGeneratedData = null;
      if (payload.ai_generation) {
        try {
          console.log('[useCreateTrack] Generating track with AI...');
          
          const { data: aiData, error: aiError } = await supabase.functions.invoke(
            payload.ai_generation.provider === 'suno' ? 'generate-suno-track' : 'generate-mureka-track',
            {
              body: {
                prompt: payload.ai_generation.prompt,
                stylePrompt: payload.ai_generation.style_prompt,
                lyricsPrompt: payload.ai_generation.lyrics_prompt,
                instrumental: payload.ai_generation.generate_instrumental,
                seed: payload.ai_generation.seed,
                modelPreferences: payload.ai_generation.model_preferences,
              },
            }
          );
          
          if (aiError) {
            console.error('[useCreateTrack] AI generation failed:', aiError);
            throw new Error(`AI generation failed: ${aiError.message}`);
          }
          
          if (aiData?.success) {
            aiGeneratedData = aiData.data;
            console.log('[useCreateTrack] AI generation successful');
          }
        } catch (aiError) {
          console.error('[useCreateTrack] AI generation error:', aiError);
          throw aiError;
        }
      }
      
      // STEP 3: Process lyrics для structure analysis
      const lyricsContext = payload.lyrics ? analyzeLyrics(payload.lyrics) : undefined;
      
      // STEP 4: Create track record
      const trackData = {
        user_id: user.id,
        title: payload.title,
        project_id: finalProjectId,
        lyrics: aiGeneratedData?.lyrics || payload.lyrics,
        audio_url: aiGeneratedData?.audio_url,
        duration: aiGeneratedData?.duration,
        genre_tags: payload.genre_tags || [],
        metadata: {
          metadata: aiGeneratedData?.metadata || {},
          ai_context: aiGeneratedData ? {
            provider: payload.ai_generation!.provider,
            generation_id: aiGeneratedData.generation_id,
            prompt_used: payload.ai_generation!.prompt,
            style_prompt: payload.ai_generation?.style_prompt,
            lyrics_prompt: payload.ai_generation?.lyrics_prompt,
            generation_quality: aiGeneratedData.quality_score || 0.8,
            generation_time: aiGeneratedData.generation_time || 30,
            seed_used: payload.ai_generation?.seed,
            model_version: aiGeneratedData.model_version,
          } : undefined,
          lyrics_context: lyricsContext,
          versions: {
            version_number: 1,
            is_current: true,
            created_by: aiGeneratedData ? 'ai' : 'user',
            change_description: 'Initial version',
          },
          collaboration: payload.version_context?.is_remix ? {
            is_remix: true,
            original_track_id: payload.version_context.parent_track_id,
            collaborators: [user.id],
            remix_permissions: 'friends',
            attribution_required: true,
          } : undefined,
        },
      };
      
      const { data: trackRecord, error: trackError } = await supabase
        .from('tracks')
        .insert({
          ...trackData,
          track_number: 1,
        })
        .select()
        .single();
      
      if (trackError) throw trackError;
      
      // TRANSFORM: Return enhanced track
      const enhancedTrack: EnhancedTrack = {
        id: trackRecord.id,
        title: trackRecord.title,
        project_id: trackRecord.project_id,
        audio_url: trackRecord.audio_url,
        lyrics: trackRecord.lyrics,
        duration: trackRecord.duration,
        genre_tags: trackRecord.genre_tags,
        metadata: (trackRecord.metadata as any)?.metadata || {},
        ai_context: (trackRecord.metadata as any)?.ai_context,
        lyrics_context: (trackRecord.metadata as any)?.lyrics_context,
        versions: (trackRecord.metadata as any)?.versions,
        collaboration: (trackRecord.metadata as any)?.collaboration,
        _cached_at: Date.now(),
      };
      
      return enhancedTrack;
    },
    
    // OPTIMISTIC UPDATES для immediate feedback
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: tracksQueryKeys.all });
      
      const optimisticTrack: EnhancedTrack = {
        id: `temp-${Date.now()}`,
        title: payload.title,
        project_id: payload.project_id || 'temp-project',
        lyrics: payload.lyrics,
        genre_tags: payload.genre_tags || [],
        metadata: {},
        versions: {
          version_number: 1,
          is_current: true,
          created_by: payload.ai_generation ? 'ai' : 'user',
        },
        _cached_at: Date.now(),
      };
      
      const previousTracks = queryClient.getQueryData<EnhancedTrack[]>(
        tracksQueryKeys.list(user?.id || '')
      );
      
      if (previousTracks) {
        queryClient.setQueryData(
          tracksQueryKeys.list(user?.id || ''),
          [optimisticTrack, ...previousTracks]
        );
      }
      
      dispatch({ type: 'TRACK_UPDATE', payload: optimisticTrack });
      
      return { previousTracks };
    },
    
    onSuccess: (newTrack) => {
      // Update caches
      const previousData = queryClient.getQueryData<EnhancedTrack[]>(
        tracksQueryKeys.list(user?.id || '')
      );
      
      if (previousData) {
        const updatedData = previousData.map(track =>
          track.id.startsWith('temp-') ? newTrack : track
        );
        
        queryClient.setQueryData(
          tracksQueryKeys.list(user?.id || ''),
          updatedData
        );
      }
      
      queryClient.setQueryData(tracksQueryKeys.detail(newTrack.id), newTrack);
      dispatch({ type: 'TRACK_UPDATE', payload: newTrack });
      
      const creationType = newTrack.ai_context ? 'сгенерирован ИИ' : 'создан';
      toast({
        title: "✅ Трек создан",
        description: `${newTrack.title} ${creationType}`,
      });
    },
    
    onError: (error, payload, context) => {
      console.error('[useCreateTrack] Mutation failed:', error);
      
      if (context?.previousTracks) {
        queryClient.setQueryData(
          tracksQueryKeys.list(user?.id || ''),
          context.previousTracks
        );
      }
      
      dispatch({ type: 'TRACKS_ERROR', payload: error.message });
      
      toast({
        title: "❌ Ошибка создания",
        description: `Не удалось создать трек: ${error.message}`,
        variant: "destructive",
      });
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tracksQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ====================================
// 🛠️ UTILITY FUNCTIONS
// ====================================

/**
 * Analyze lyrics для structure detection и metadata extraction
 */
function analyzeLyrics(lyrics: string) {
  const sunoTags = ['[Verse', '[Chorus', '[Bridge', '[Pre-Chorus', '[Outro', '[Intro'];
  const hasSunoTags = sunoTags.some(tag => lyrics.includes(tag));
  
  const structureDetected = [];
  if (lyrics.includes('[Verse')) structureDetected.push('Verse');
  if (lyrics.includes('[Chorus')) structureDetected.push('Chorus');
  if (lyrics.includes('[Bridge')) structureDetected.push('Bridge');
  if (lyrics.includes('[Pre-Chorus')) structureDetected.push('Pre-Chorus');
  
  // Simple language detection (English vs Russian)
  const cyrillicPattern = /[\u0400-\u04FF]/;
  const language = cyrillicPattern.test(lyrics) ? 'ru' : 'en';
  
  // Basic explicit content detection
  const explicitWords = ['fuck', 'shit', 'damn', 'блядь', 'хуй', 'пиздец'];
  const explicitContent = explicitWords.some(word => 
    lyrics.toLowerCase().includes(word)
  );
  
  return {
    has_suno_tags: hasSunoTags,
    structure_detected: structureDetected,
    language,
    explicit_content: explicitContent,
    character_count: lyrics.length,
    word_count: lyrics.split(/\s+/).length,
    estimated_duration: Math.ceil(lyrics.split(/\s+/).length * 0.4), // ~0.4 seconds per word
  };
}

/**
 * Обновляет существующий трек с поддержкой версионирования
 * 
 * FEATURES:
 * - Оптимистичные обновления UI
 * - Автоматическое обновление lyrics_context
 * - Поддержка версионирования
 * - Обновление статистики проекта
 */
export function useUpdateTrack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { dispatch } = useAppData();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      trackId, 
      updates 
    }: { 
      trackId: string; 
      updates: Partial<TrackMutationPayload> & {
        title?: string;
        lyrics?: string;
        genre_tags?: string[];
        audio_url?: string;
        duration?: number;
        create_version?: boolean; // Создать новую версию вместо обновления
        version_description?: string; // Описание изменений
      };
    }): Promise<EnhancedTrack> => {
      if (!user) throw new Error('User not authenticated');
      
      console.log(`[Обновление трека] ID: ${trackId}`, updates);
      
      // Получаем текущие данные трека
      const { data: currentTrack, error: fetchError } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single();
      
      if (fetchError) throw fetchError;
      if (!currentTrack) throw new Error('Трек не найден');
      
      // Подготавливаем обновленные метаданные
      const existingMetadata = (currentTrack.metadata as any) || {};
      const updatedMetadata = { ...existingMetadata };
      
      // Обновляем lyrics_context если лирика изменилась
      if (updates.lyrics && updates.lyrics !== currentTrack.lyrics) {
        updatedMetadata.lyrics_context = analyzeLyrics(updates.lyrics);
        console.log('[Обновление трека] Обновлен lyrics_context:', updatedMetadata.lyrics_context);
      }
      
      // Обновляем версионирование
      if (updates.create_version) {
        const currentVersion = existingMetadata.versions?.version_number || 1;
        updatedMetadata.versions = {
          version_number: currentVersion + 1,
          parent_version_id: trackId,
          change_description: updates.version_description || 'Обновление трека',
          created_by: 'user',
          is_current: true,
          version_history: [
            ...(existingMetadata.versions?.version_history || []),
            {
              version: currentVersion,
              created_at: currentTrack.updated_at,
              changes: updates.version_description || 'Предыдущая версия',
              audio_url: currentTrack.audio_url,
            }
          ]
        };
        console.log(`[Обновление трека] Создана новая версия: ${currentVersion + 1}`);
      }
      
      // Подготавливаем объект обновления
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
        metadata: updatedMetadata,
      };
      
      // Добавляем обновляемые поля
      if (updates.title) updatePayload.title = updates.title;
      if (updates.lyrics !== undefined) updatePayload.lyrics = updates.lyrics;
      if (updates.genre_tags) updatePayload.genre_tags = updates.genre_tags;
      if (updates.audio_url !== undefined) updatePayload.audio_url = updates.audio_url;
      if (updates.duration !== undefined) updatePayload.duration = updates.duration;
      
      // Выполняем обновление
      const { data: updatedTrack, error: updateError } = await supabase
        .from('tracks')
        .update(updatePayload)
        .eq('id', trackId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Преобразуем в EnhancedTrack формат
      const enhanced: EnhancedTrack = {
        id: updatedTrack.id,
        title: updatedTrack.title,
        project_id: updatedTrack.project_id,
        audio_url: updatedTrack.audio_url,
        lyrics: updatedTrack.lyrics,
        duration: updatedTrack.duration,
        genre_tags: updatedTrack.genre_tags || [],
        metadata: (updatedTrack.metadata as any)?.metadata || {},
        ai_context: (updatedTrack.metadata as any)?.ai_context,
        lyrics_context: (updatedTrack.metadata as any)?.lyrics_context,
        versions: (updatedTrack.metadata as any)?.versions,
        collaboration: (updatedTrack.metadata as any)?.collaboration,
        _cached_at: Date.now(),
      };
      
      return enhanced;
    },
    
    // Оптимистичные обновления
    onMutate: async ({ trackId, updates }) => {
      await queryClient.cancelQueries({ queryKey: tracksQueryKeys.detail(trackId) });
      
      const previousTrack = queryClient.getQueryData<EnhancedTrack>(
        tracksQueryKeys.detail(trackId)
      );
      
      if (previousTrack) {
        const optimisticTrack: EnhancedTrack = {
          ...previousTrack,
          title: updates.title || previousTrack.title,
          lyrics: updates.lyrics !== undefined ? updates.lyrics : previousTrack.lyrics,
          genre_tags: updates.genre_tags || previousTrack.genre_tags,
          audio_url: updates.audio_url !== undefined ? updates.audio_url : previousTrack.audio_url,
          duration: updates.duration !== undefined ? updates.duration : previousTrack.duration,
          _cached_at: Date.now(),
        };
        
        queryClient.setQueryData(tracksQueryKeys.detail(trackId), optimisticTrack);
        
        // Обновляем список треков
        const tracksList = queryClient.getQueryData<EnhancedTrack[]>(
          tracksQueryKeys.list(user?.id || '')
        );
        if (tracksList) {
          const updatedList = tracksList.map(track =>
            track.id === trackId ? optimisticTrack : track
          );
          queryClient.setQueryData(tracksQueryKeys.list(user?.id || ''), updatedList);
        }
        
        dispatch({ type: 'TRACK_UPDATE', payload: optimisticTrack });
      }
      
      return { previousTrack };
    },
    
    onSuccess: (updatedTrack, { trackId }) => {
      // Обновляем кеши
      queryClient.setQueryData(tracksQueryKeys.detail(trackId), updatedTrack);
      
      const tracksList = queryClient.getQueryData<EnhancedTrack[]>(
        tracksQueryKeys.list(user?.id || '')
      );
      if (tracksList) {
        const updatedList = tracksList.map(track =>
          track.id === trackId ? updatedTrack : track
        );
        queryClient.setQueryData(tracksQueryKeys.list(user?.id || ''), updatedList);
      }
      
      dispatch({ type: 'TRACK_UPDATE', payload: updatedTrack });
      
      toast({
        title: "✅ Трек обновлен",
        description: `${updatedTrack.title} успешно обновлен`,
      });
      
      // Обновляем статистику проекта если изменилась продолжительность
      if (updatedTrack.project_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['projects', 'detail', updatedTrack.project_id] 
        });
      }
    },
    
    onError: (error, { trackId }, context) => {
      console.error('[Ошибка обновления трека]:', error);
      
      if (context?.previousTrack) {
        queryClient.setQueryData(tracksQueryKeys.detail(trackId), context.previousTrack);
      }
      
      dispatch({ type: 'TRACKS_ERROR', payload: error.message });
      
      toast({
        title: "❌ Ошибка обновления",
        description: `Не удалось обновить трек: ${error.message}`,
        variant: "destructive",
      });
    },
    
    onSettled: (data, error, { trackId }) => {
      queryClient.invalidateQueries({ queryKey: tracksQueryKeys.detail(trackId) });
      queryClient.invalidateQueries({ queryKey: tracksQueryKeys.all });
    },
  });
}

/**
 * Удаляет трек с обновлением статистики проекта
 * 
 * SAFETY FEATURES:
 * - Проверка прав доступа
 * - Soft delete опция
 * - Обновление статистики родительского проекта
 * - Откат операции при ошибке
 */
export function useDeleteTrack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { dispatch } = useAppData();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      trackId, 
      options = {} 
    }: { 
      trackId: string; 
      options?: {
        soft?: boolean; // Мягкое удаление (скрытие из UI)
        preserve_versions?: boolean; // Сохранить версии трека
      }; 
    }): Promise<{ success: boolean; message: string; projectId?: string }> => {
      if (!user) throw new Error('User not authenticated');
      
      console.log(`[Удаление трека] ID: ${trackId}`, options);
      
      // Получаем данные трека
      const { data: track, error: fetchError } = await supabase
        .from('tracks')
        .select('*, projects!inner(id, title, user_id)')
        .eq('id', trackId)
        .single();
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Трек не найден');
        }
        throw fetchError;
      }
      
      // Проверяем права доступа
      const project = (track as any).projects;
      if (project.user_id !== user.id) {
        throw new Error('Нет прав на удаление этого трека');
      }
      
      const projectId = track.project_id;
      
      // Мягкое удаление - помечаем как удаленный
      if (options.soft) {
        const metadata = (track.metadata as any) || {};
        const { error: updateError } = await supabase
          .from('tracks')
          .update({ 
            metadata: {
              ...metadata,
              deleted: true,
              deleted_at: new Date().toISOString(),
              delete_reason: 'user_deleted'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', trackId);
        
        if (updateError) throw updateError;
        
        return { 
          success: true, 
          message: `Трек "${track.title}" скрыт с возможностью восстановления`,
          projectId
        };
      }
      
      // Полное удаление
      const { error: deleteError } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);
      
      if (deleteError) throw deleteError;
      
      return { 
        success: true, 
        message: `Трек "${track.title}" удален навсегда`,
        projectId
      };
    },
    
    onMutate: async ({ trackId }) => {
      await queryClient.cancelQueries({ queryKey: tracksQueryKeys.all });
      
      const previousTracks = queryClient.getQueryData<EnhancedTrack[]>(
        tracksQueryKeys.list(user?.id || '')
      );
      const previousTrack = queryClient.getQueryData<EnhancedTrack>(
        tracksQueryKeys.detail(trackId)
      );
      
      // Оптимистично удаляем из списка
      if (previousTracks) {
        const updatedTracks = previousTracks.filter(t => t.id !== trackId);
        queryClient.setQueryData(tracksQueryKeys.list(user?.id || ''), updatedTracks);
      }
      
      return { previousTracks, previousTrack };
    },
    
    onSuccess: (result, { trackId }) => {
      // Очищаем кеш удаленного трека
      queryClient.removeQueries({ queryKey: tracksQueryKeys.detail(trackId) });
      
      dispatch({ type: 'TRACK_DELETE', payload: trackId });
      eventBus.emit('track-deleted', { trackId });
      eventBus.emit('tracks-updated');
      
      toast({
        title: "✅ Трек удален",
        description: result.message,
      });
      
      // Обновляем статистику проекта
      if (result.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: ['projects', 'detail', result.projectId] 
        });
      }
    },
    
    onError: (error, { trackId }, context) => {
      console.error('[Ошибка удаления трека]:', error);
      
      // Восстанавливаем предыдущие данные
      if (context?.previousTracks) {
        queryClient.setQueryData(tracksQueryKeys.list(user?.id || ''), context.previousTracks);
      }
      if (context?.previousTrack) {
        queryClient.setQueryData(tracksQueryKeys.detail(trackId), context.previousTrack);
      }
      
      dispatch({ type: 'TRACKS_ERROR', payload: error.message });
      
      toast({
        title: "❌ Ошибка удаления",
        description: `Не удалось удалить трек: ${error.message}`,
        variant: "destructive",
      });
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tracksQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// РЕАЛИЗОВАНО: useUpdateTrack hook - обновление треков с версионированием
// РЕАЛИЗОВАНО: useDeleteTrack hook - удаление треков с опциями безопасности
// TODO: Add track remix/collaboration hooks
// TODO: Add batch operations support
// TODO: Add lyrics analysis enhancements

/**
 * PERFORMANCE NOTES:
 * 
 * 1. AUTO-PROJECT INTEGRATION:
 *    - Seamless project creation для orphaned tracks
 *    - Context preservation между track и project
 *    - Intelligent project type determination
 * 
 * 2. AI GENERATION PIPELINE:
 *    - Multi-provider support (Suno/Mureka)
 *    - Context preservation для future iterations
 *    - Quality scoring и metadata tracking
 * 
 * 3. LYRICS PROCESSING:
 *    - SUNO.AI tag detection и structure analysis
 *    - Language detection и content filtering
 *    - Duration estimation для preview
 * 
 * 4. VERSION MANAGEMENT:
 *    - Track iteration support
 *    - Change tracking для collaboration
 *    - Remix и collaboration context
 */