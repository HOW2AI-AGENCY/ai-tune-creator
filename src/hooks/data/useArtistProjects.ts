import { useProjects } from './useProjects';

/**
 * Get projects for a specific artist ID by filtering the main projects list.
 * This is an efficient client-side approach that avoids extra network requests.
 * It stays in sync with the global project cache.
 */
export const useGetProjectsByArtistId = (artistId: string | null) => {
  const { data, isLoading, isError, error } = useProjects();

  if (!artistId) {
    return {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    };
  }

  const allProjects = data?.pages?.flat() || [];
  const filteredProjects = allProjects.filter(p => p.artist_id === artistId);

  return {
    data: filteredProjects,
    isLoading,
    isError,
    error,
  };
};
