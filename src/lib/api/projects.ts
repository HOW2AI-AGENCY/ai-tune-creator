import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import type { Artist } from './artists';

// ====================================
// 🎯 ZOD SCHEMAS & TYPES
// ====================================

const projectDetailsSchema = z.object({
  concept: z.string().optional().default(''),
  target_audience: z.string().optional().default(''),
  release_strategy: z.string().optional().default(''),
  marketing_notes: z.string().optional().default(''),
  mood_description: z.string().optional().default(''),
  genre_primary: z.string().optional().default(''),
  genre_secondary: z.array(z.string()).optional().default([]),
});

const aiContextSchema = z.object({
  auto_created: z.boolean().optional().default(false),
  source_track_id: z.string().optional(),
  generation_quality: z.number().optional().default(0),
  concept_generated: z.boolean().optional().default(false),
  regeneration_count: z.number().optional().default(0),
});

const coverContextSchema = z.object({
  provider: z.enum(['sunoapi', 'stability', 'dalle3', 'midjourney']).optional(),
  prompt_used: z.string().optional(),
  generation_metadata: z.record(z.unknown()).optional(),
  variants: z.array(z.string()).optional().default([]),
});

const projectStatsSchema = z.object({
  tracks_count: z.number(),
  total_duration: z.number(),
  completion_percentage: z.number(),
  last_activity: z.string(),
});

export const projectSchema = z.object({
  id: z.string().uuid(),
  artist_id: z.string().uuid(),
  title: z.string().min(1, "Project title is required"),
  description: z.string().nullable().optional(),
  type: z.enum(['single', 'ep', 'album']).default('single'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  cover_url: z.string().url().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.any().optional(), // Keep raw metadata
  details: projectDetailsSchema.optional(),
  ai_context: aiContextSchema.optional(),
  cover_context: coverContextSchema.optional(),
  artists: z.any().optional(),
  stats: projectStatsSchema.optional(),
});

export type Project = z.infer<typeof projectSchema> & {
  artists?: Artist;
};

export const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  artist_id: z.string().uuid("A valid artist is required"),
  type: z.enum(['single', 'ep', 'album']).optional(),
  description: z.string().optional(),
  auto_creation: z.object({
    source: z.enum(['track_generation', 'user_creation']),
    source_track_id: z.string().optional(),
  }).optional(),
  ai_generation: z.object({
    generate_concept: z.boolean(),
    artist_context: z.string().optional(),
    genre_preference: z.string().optional(),
    mood_preference: z.string().optional(),
    target_audience: z.string().optional(),
  }).optional(),
  cover_generation: z.object({
    auto_generate: z.boolean(),
    provider: z.enum(['sunoapi', 'stability', 'dalle3']).optional(),
    custom_prompt: z.string().optional(),
    style_reference: z.string().optional(),
  }).optional(),
});

export type CreateProjectData = z.infer<typeof createProjectSchema>;
export type UpdateProjectData = Partial<Omit<CreateProjectData, 'artist_id' | 'auto_creation'>>;

// ====================================
// 🧮 HELPER FUNCTIONS
// ====================================

const parseProjectData = (project: any): Project => {
  const metadata = project.metadata || {};
  return projectSchema.parse({
    ...project,
    details: metadata.details,
    ai_context: metadata.ai_context,
    cover_context: metadata.cover_context,
  });
};

async function calculateProjectStats(projectId: string, projectData?: any) {
  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('id, duration, metadata, audio_url')
    .eq('project_id', projectId);
  if (error) {
    console.warn('[calculateProjectStats] Error fetching tracks:', error);
    return {
      tracks_count: 0,
      total_duration: 0,
      completion_percentage: 0,
      last_activity: projectData?.updated_at || new Date().toISOString(),
    };
  }
  const tracksData = tracks || [];
  const totalDuration = tracksData.reduce((sum, track) => sum + (track.duration || 0), 0);
  const completedTracks = tracksData.filter(track => {
    const hasAudio = !!track.audio_url;
    const hasAIGeneration = !!(track.metadata as any)?.ai_context?.generation_id;
    return hasAudio || hasAIGeneration;
  }).length;
  const completionPercentage = tracksData.length > 0 ? Math.round((completedTracks / tracksData.length) * 100) : 0;
  return {
    tracks_count: tracksData.length,
    total_duration: totalDuration,
    completion_percentage: completionPercentage,
    last_activity: projectData?.updated_at || new Date().toISOString(),
  };
}

// ====================================
// 🚀 API SERVICE FUNCTIONS
// ====================================

/**
 * Get all projects for the currently authenticated user.
 */
export const getProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select(`*, artists!inner(id, name, avatar_url)`)
    .eq('artists.user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error(error.message);
  }

  return (data || []).map(parseProjectData);
};

/**
 * Get a single project by its ID, enriched with stats.
 */
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .select(`*, artists(id, name, avatar_url)`)
    .eq('id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error(`Error fetching project ${projectId}:`, error);
    throw new Error(error.message);
  }

  const stats = await calculateProjectStats(projectId, data);
  const parsed = parseProjectData(data);
  return { ...parsed, stats };
};

/**
 * Create a new project with complex, multi-step logic.
 */
export const createProject = async (payload: CreateProjectData): Promise<Project> => {
  // Step 1: Create the basic project record
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .insert({
      title: payload.title,
      type: payload.type || 'single',
      status: 'draft',
      artist_id: payload.artist_id,
      description: payload.description,
      metadata: {
        auto_generated: !!payload.auto_creation,
        generation_context: payload.auto_creation,
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

  if (projectError) {
    console.error('Error creating project record:', projectError);
    throw projectError;
  }

  let currentMetadata = projectData.metadata as any;

  // Step 2 (Optional): AI Concept Generation
  if (payload.ai_generation?.generate_concept) {
    try {
      const { data: aiData } = await supabase.functions.invoke('generate-project-concept', {
        body: { projectTitle: payload.title, ...payload.ai_generation },
      });
      if (aiData?.success) {
        currentMetadata = {
          ...currentMetadata,
          details: aiData.data.concept,
          ai_context: { ...currentMetadata.ai_context, concept_generated: true, generation_quality: aiData.data.quality_score || 0.8 },
        };
      }
    } catch (e) { console.warn('AI concept generation failed, continuing...', e); }
  }

  // Step 3 (Optional): Cover Generation
  if (payload.cover_generation?.auto_generate) {
    try {
      const { data: coverData } = await supabase.functions.invoke('generate-cover-image', {
        body: { title: payload.title, type: 'project', ...payload.cover_generation },
      });
      if (coverData?.success) {
        projectData.cover_url = coverData.data.cover_url;
        currentMetadata = {
          ...currentMetadata,
          cover_context: {
            provider: payload.cover_generation.provider || 'sunoapi',
            prompt_used: coverData.data.prompt_used,
            generation_metadata: coverData.data.metadata,
            variants: coverData.data.variants || [],
          },
        };
      }
    } catch (e) { console.warn('Cover generation failed, continuing...', e); }
  }

  // Step 4: Update project with all generated assets
  const { data: finalData, error: updateError } = await supabase
    .from('projects')
    .update({ cover_url: projectData.cover_url, metadata: currentMetadata })
    .eq('id', projectData.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating project with generated assets:', updateError);
    // Return partially created data, it's better than nothing
    return parseProjectData(projectData);
  }

  return parseProjectData(finalData);
};

/**
 * Update an existing project. (Not Implemented)
 */
export const updateProject = async (id: string, data: UpdateProjectData): Promise<Project> => {
  // TODO: Implement the update logic
  console.log('Updating project', id, data);
  throw new Error('Function not implemented.');
};

/**
 * Delete a project. (Not Implemented)
 */
export const deleteProject = async (id: string): Promise<void> => {
  // TODO: Implement the delete logic
  console.log('Deleting project', id);
  throw new Error('Function not implemented.');
};
