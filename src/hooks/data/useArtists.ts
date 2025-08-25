import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  getArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
  CreateArtistData,
  UpdateArtistData,
  Artist,
} from '@/lib/api/artists';

// Re-exporting the types for easy access from components
export type { Artist, CreateArtistData, UpdateArtistData };

const ARTISTS_QUERY_KEY = 'artists';

/**
 * Hook to fetch all artists for the current user.
 * The underlying API call (getArtists) is secured by RLS.
 */
export const useGetArtists = () => {
  const { user } = useAuth();
  return useQuery<Artist[]>({
    queryKey: [ARTISTS_QUERY_KEY, user?.id],
    queryFn: getArtists,
    enabled: !!user,
  });
};

/**
 * Hook to fetch a single artist by their ID.
 */
export const useGetArtistById = (artistId: string | null) => {
  return useQuery<Artist | null>({
    queryKey: [ARTISTS_QUERY_KEY, artistId],
    queryFn: () => {
      if (!artistId) return null;
      return getArtistById(artistId);
    },
    enabled: !!artistId,
  });
};

/**
 * Hook to create a new artist.
 */
export const useCreateArtist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (artistData: Omit<CreateArtistData, 'user_id'>): Promise<Artist> => {
      if (!user) throw new Error('User not authenticated');
      
      const fullPayload: CreateArtistData = {
        ...artistData,
        user_id: user.id,
      };
      return createArtist(fullPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ARTISTS_QUERY_KEY] });
      toast({
        title: 'Артист создан',
        description: 'Профиль артиста был успешно создан.',
      });
    },
    onError: (error) => {
      console.error('Create artist error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать профиль артиста.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to update an existing artist.
 */
export const useUpdateArtist = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateArtistData }): Promise<Artist> => updateArtist(id, data),
    onSuccess: (updatedArtist) => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: [ARTISTS_QUERY_KEY] });
      // Update the specific artist's query cache directly for a faster UI update
      queryClient.setQueryData([ARTISTS_QUERY_KEY, updatedArtist.id], updatedArtist);
      toast({
        title: 'Артист обновлен',
        description: 'Профиль артиста был успешно обновлен.',
      });
    },
    onError: (error) => {
      console.error('Update artist error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить профиль артиста.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to delete an artist.
 */
export const useDeleteArtist = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (artistId: string): Promise<void> => deleteArtist(artistId),
    onSuccess: (_, deletedId) => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: [ARTISTS_QUERY_KEY] });
      // Remove the specific artist's query from the cache
      queryClient.removeQueries({ queryKey: [ARTISTS_QUERY_KEY, deletedId] });
      toast({
        title: 'Артист удален',
        description: 'Профиль артиста был успешно удален.',
      });
    },
    onError: (error) => {
      console.error('Delete artist error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить профиль артиста.',
        variant: 'destructive',
      });
    },
  });
};
