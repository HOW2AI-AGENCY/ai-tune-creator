import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Artist = Database['public']['Tables']['artists']['Row'];

interface CreateArtistPayload {
  name: string;
  description?: string;
  avatar_url?: string;
  type?: string;
  genre?: string;
  bio?: string;
  banner_url?: string;
}

interface UpdateArtistPayload extends Partial<CreateArtistPayload> {
  id: string;
}

export function useArtists() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['artists', user?.id],
    queryFn: async (): Promise<Artist[]> => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useArtist(artistId: string) {
  return useQuery({
    queryKey: ['artist', artistId],
    queryFn: async (): Promise<Artist | null> => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data;
    },
    enabled: !!artistId,
  });
}

export function useCreateArtist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (payload: CreateArtistPayload): Promise<Artist> => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('artists')
        .insert({
          user_id: user.id,
          name: payload.name,
          description: payload.description,
          avatar_url: payload.avatar_url,
          type: payload.type || 'solo',
          genre: payload.genre,
          bio: payload.bio,
          banner_url: payload.banner_url,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      toast({
        title: 'Artist created',
        description: 'Your artist profile has been created successfully.',
      });
    },
    onError: (error) => {
      console.error('Create artist error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create artist profile.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateArtist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (payload: UpdateArtistPayload): Promise<Artist> => {
      const { id, ...updates } = payload;
      
      const { data, error } = await supabase
        .from('artists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['artist', data.id] });
      toast({
        title: 'Artist updated',
        description: 'Your artist profile has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Update artist error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update artist profile.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteArtist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (artistId: string): Promise<void> => {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', artistId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      toast({
        title: 'Artist deleted',
        description: 'Your artist profile has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Delete artist error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete artist profile.',
        variant: 'destructive',
      });
    },
  });
}
