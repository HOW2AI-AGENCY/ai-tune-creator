import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Схема валидации для данных артиста, которые можно обновлять
// На основе `createArtistSchema` из CreateArtistDialog.tsx
const artistSchema = z.object({
  name: z.string().min(1, "Название артиста обязательно"),
  description: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  metadata: z.object({
    genre: z.string().optional(),
    location: z.string().optional(),
    background: z.string().optional(),
    style: z.string().optional(),
    influences: z.array(z.string()).optional(),
    banner_url: z.string().optional(),
  }).optional()
});

// Тип для создания нового артиста (все поля опциональны, кроме user_id)
export type CreateArtistData = z.infer<typeof artistSchema> & { user_id: string };

// Тип для обновления артиста (все поля опциональны)
export type UpdateArtistData = Partial<z.infer<typeof artistSchema>>;

// Полный тип артиста, включая системные поля
export type Artist = z.infer<typeof artistSchema> & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

// --- API Service ---

/**
 * Получить всех артистов текущего пользователя
 */
export const getArtists = async (): Promise<Artist[]> => {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching artists:', error);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Получить артиста по ID
 */
export const getArtistById = async (id: string): Promise<Artist | null> => {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching artist ${id}:`, error);
    if (error.code === 'PGRST116') { // PostgREST error for "Not a single row"
      return null;
    }
    throw new Error(error.message);
  }

  return data;
};

/**
 * Создать нового артиста
 */
export const createArtist = async (artistData: CreateArtistData): Promise<Artist> => {
  const { data, error } = await supabase
    .from('artists')
    .insert(artistData)
    .select()
    .single();

  if (error) {
    console.error('Error creating artist:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Обновить существующего артиста
 */
export const updateArtist = async (id: string, artistData: UpdateArtistData): Promise<Artist> => {
  const { data, error } = await supabase
    .from('artists')
    .update(artistData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating artist ${id}:`, error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Удалить артиста
 */
export const deleteArtist = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('artists')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting artist ${id}:`, error);
    throw new Error(error.message);
  }
};
