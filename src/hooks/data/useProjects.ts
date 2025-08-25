import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/providers/AppDataProvider';
import { useToast } from '@/hooks/use-toast';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  Project,
  CreateProjectData,
  UpdateProjectData,
} from '@/lib/api/projects';

// ====================================
// 🎯 QUERY KEYS
// ====================================

export const projectsQueryKeys = {
  all: ['projects'] as const,
  lists: () => [...projectsQueryKeys.all, 'list'] as const,
  list: (userId: string) => [...projectsQueryKeys.lists(), userId] as const,
  details: () => [...projectsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectsQueryKeys.details(), id] as const,
};

// ====================================
// 🎯 PRIMARY HOOKS
// ====================================

/**
 * Hook to fetch all projects for the current user.
 * Delegates data fetching to the centralized API service.
 */
export function useProjects() {
  const { user } = useAuth();
  const { state, dispatch } = useAppData();

  const query = useQuery({
    queryKey: projectsQueryKeys.list(user?.id || ''),
    queryFn: async (): Promise<Project[]> => {
      if (!user) throw new Error('User not authenticated');
      const projects = await getProjects(user.id);
      // Sync with global state for other components to use
      dispatch({ type: 'PROJECTS_SUCCESS', payload: projects });
      return projects;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: () => {
      // Use global state for initial data to avoid flickering
      if (state.projects.items.length > 0 && !state.projects.loading) {
        return state.projects.items as Project[];
      }
      return undefined;
    },
  });

  return {
    projects: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Hook to fetch a single project by its ID.
 */
export function useProject(projectId: string) {
  return useQuery<Project | null>({
    queryKey: projectsQueryKeys.detail(projectId),
    queryFn: () => getProjectById(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes for detailed views
  });
}

/**
 * Get projects by artist ID by filtering the main projects list.
 * This is an efficient way to avoid extra network requests.
 */
export function useProjectsByArtist(artistId: string) {
  const { projects, isLoading } = useProjects();
  
  const filteredProjects = projects.filter(p => p.artist_id === artistId);
  
  return {
    projects: filteredProjects,
    isLoading, // Reflects the loading state of the main hook
    count: filteredProjects.length,
  };
}


// ====================================
// 🔄 MUTATION HOOKS
// ====================================

/**
 * Hook to create a new project.
 * Handles optimistic updates for a smooth user experience.
 */
export function useCreateProject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { dispatch } = useAppData();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateProjectData): Promise<Project> => {
      if (!user) throw new Error('User not authenticated');
      return createProject(payload);
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: projectsQueryKeys.lists() });
      const previousProjects = queryClient.getQueryData<Project[]>(projectsQueryKeys.list(user!.id));

      // Create an optimistic project object
      const optimisticProject: Project = {
        id: `temp-${Date.now()}`,
        title: newData.title,
        artist_id: newData.artist_id,
        type: newData.type || 'single',
        status: 'draft',
        description: newData.description || null,
        cover_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {},
      };

      // Optimistically update the cache
      queryClient.setQueryData(
        projectsQueryKeys.list(user!.id),
        (old) => [optimisticProject, ...(old || [])]
      );
      
      dispatch({ type: 'PROJECT_UPDATE', payload: optimisticProject });

      return { previousProjects };
    },
    onSuccess: (result) => {
      toast({
        title: "✅ Проект создан",
        description: `${result.title} был успешно создан.`,
      });
      // The onSettled handler will invalidate queries to get the final data.
    },
    onError: (error, newData, context) => {
      // Rollback to the previous state on error
      if (context?.previousProjects) {
        queryClient.setQueryData(projectsQueryKeys.list(user!.id), context.previousProjects);
      }
      dispatch({ type: 'PROJECTS_ERROR', payload: error.message });
      toast({
        title: "❌ Ошибка создания проекта",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidate all project queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all });
    },
  });
}

/**
 * Hook to update an existing project.
 * (Placeholder - to be implemented)
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectData }) => updateProject(id, data),
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all });
      queryClient.setQueryData(projectsQueryKeys.detail(updatedProject.id), updatedProject);
      toast({ title: 'Проект обновлен' });
    },
    onError: (error) => {
      toast({ title: 'Ошибка обновления', description: error.message, variant: 'destructive' });
    }
  });
}

/**
 * Hook to delete a project.
 * (Placeholder - to be implemented)
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all });
      toast({ title: 'Проект удален' });
    },
    onError: (error) => {
      toast({ title: 'Ошибка удаления', description: error.message, variant: 'destructive' });
    }
  });
}