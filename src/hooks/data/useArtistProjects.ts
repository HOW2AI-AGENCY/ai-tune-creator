import { useQuery } from '@tanstack/react-query';
import { getProjectsByArtist } from '@/lib/api/projects';
import type { Project } from '@/lib/api/projects';

const PROJECTS_QUERY_KEY = 'projects';

/**
 * A simple hook to fetch all projects for a specific artist ID.
 * This is more direct than filtering from a list of all projects.
 */
export const useGetProjectsByArtistId = (artistId: string | null) => {
  return useQuery<Project[]>({
    queryKey: [PROJECTS_QUERY_KEY, 'by-artist', artistId],
    queryFn: () => {
      if (!artistId) {
        return [];
      }
      return getProjectsByArtist(artistId);
    },
    enabled: !!artistId, // Only run the query if artistId is provided
  });
};
