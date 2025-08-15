import { useQuery } from '@tanstack/react-query';
import { useArtists } from '@/hooks/data/useArtists';
import { useProjects } from '@/hooks/data/useProjects';
import { useTracks } from '@/hooks/data/useTracks';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSmartDashboard() {
  const { user } = useAuth();
  const artistsQuery = useArtists();
  const projectsQuery = useProjects();
  const tracksQuery = useTracks();

  // Get active generations
  const { data: activeGenerations = [], isLoading: generationsLoading } = useQuery({
    queryKey: ['dashboard', 'active-generations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('ai_generations')
        .select('id, status, service, created_at')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const stats = {
    totalArtists: artistsQuery.data?.length || 0,
    totalProjects: projectsQuery.projects?.length || 0,
    totalTracks: tracksQuery.tracks?.length || 0,
    activeGenerations: activeGenerations.length,
  };

  const isLoading = artistsQuery.isLoading || projectsQuery.isLoading || tracksQuery.isLoading || generationsLoading;

  return {
    stats,
    isLoading,
    activeGenerations,
  };
}