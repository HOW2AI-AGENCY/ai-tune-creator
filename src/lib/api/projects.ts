import { supabase } from '@/integrations/supabase/client';

// A basic type for Project, can be expanded later
export interface Project {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all projects for a given artist
 */
export const getProjectsByArtist = async (artistId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching projects for artist ${artistId}:`, error);
    throw new Error(error.message);
  }

  return data || [];
};
