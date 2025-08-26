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
  type: z.enum(['single', 'ep', 'album']),
  status: z.enum(['draft', 'published', 'archived', 'in_progress']),
  cover_url: z.string().url().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).optional(),
  cover_metadata: z.record(z.string(), z.any()).optional(),
});

// Инферируем основные типы
export type Project = z.infer<typeof projectSchema> & {
  artists?: Partial<Artist>;
  stats?: {
    tracks_count: number;
    total_duration: number;
    completion_percentage: number;
    last_activity: string;
  };
};

export type CreateProjectData = Omit<z.infer<typeof projectSchema>, 'id' | 'created_at' | 'updated_at'> & {
  status?: 'draft' | 'published' | 'archived' | 'in_progress';
  is_inbox?: boolean;
  metadata?: any;
  cover_metadata?: any;
};
export type UpdateProjectData = Partial<Omit<z.infer<typeof projectSchema>, 'id' | 'created_at' | 'updated_at'>>;

// ====================================
// 🎯 API FUNCTIONS
// ====================================

/**
 * Получить все проекты пользователя с пагинацией и расширенной информацией
 */
export const getProjects = async ({ userId, page = 1, pageSize = 10 }: { userId: string; page?: number; pageSize?: number }): Promise<Project[]> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Use regular projects table instead of non-existent view
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      artists (
        id,
        name,
        avatar_url
      )
    `)
    .range(from, to)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error(error.message);
  }

  return (data || []) as Project[];
};

/**
 * Получить один проект по ID
 */
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      artists (
        id,
        name,
        avatar_url,
        bio
      )
    `)
    .eq('id', projectId)
    .single();

  if (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(error.message);
  }

  return data as Project;
};

/**
 * Создать новый проект
 */
export const createProject = async (projectData: CreateProjectData): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select(`
      *,
      artists (
        id,
        name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error(error.message);
  }

  return data as Project;
};

/**
 * Обновить проект
 */
export const updateProject = async (projectId: string, updateData: UpdateProjectData): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select(`
      *,
      artists (
        id,
        name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error(`Error updating project ${projectId}:`, error);
    throw new Error(error.message);
  }

  return data as Project;
};

/**
 * Удалить проект
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    throw new Error(error.message);
  }
};

/**
 * Получить статистику по проекту
 */
export const getProjectStats = async (projectId: string): Promise<{ tracks_count: number; total_duration: number }> => {
  const { data, error } = await supabase
    .from('tracks')
    .select('duration')
    .eq('project_id', projectId);

  if (error) {
    console.error(`Error fetching project stats for ${projectId}:`, error);
    throw new Error(error.message);
  }

  const tracks = data || [];
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

  return {
    tracks_count: tracks.length,
    total_duration: totalDuration,
  };
};

/**
 * Создать концепцию проекта с помощью AI
 */
export const generateProjectConcept = async (params: {
  title: string;
  description?: string;
  genre?: string;
  mood?: string;
  target_audience?: string;
}): Promise<{ concept: string; marketing_strategy: string }> => {
  const { data, error } = await supabase.functions.invoke('generate-project-concept', {
    body: params,
  });

  if (error) {
    console.error('Error generating project concept:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Получить проекты по ID артиста
 */
export const getProjectsByArtistId = async (artistId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      artists (
        id,
        name,
        avatar_url
      )
    `)
    .eq('artist_id', artistId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(`Error fetching projects for artist ${artistId}:`, error);
    throw new Error(error.message);
  }

  return (data || []) as Project[];
};

/**
 * Создать проект-инбокс для артиста, если он не существует
 */
export const ensureArtistInbox = async (artistId: string): Promise<Project> => {
  // Сначала проверим, есть ли уже инбокс для этого артиста
  const { data: existingInbox, error: searchError } = await supabase
    .from('projects')
    .select('*')
    .eq('artist_id', artistId)
    .eq('is_inbox', true)
    .single();

  if (searchError && searchError.code !== 'PGRST116') {
    console.error('Error searching for existing inbox:', searchError);
    throw new Error(searchError.message);
  }

  if (existingInbox) {
    return existingInbox as Project;
  }

  // Создаем новый инбокс
  const { data, error } = await supabase
    .from('projects')
    .insert({
      artist_id: artistId,
      title: 'Inbox',
      description: 'AI Generated tracks for this artist',
      type: 'album',
      status: 'draft',
      is_inbox: true,
      metadata: {
        auto_created: true,
        created_for: 'ai_generations',
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating artist inbox:', error);
    throw new Error(error.message);
  }

  return data as Project;
};