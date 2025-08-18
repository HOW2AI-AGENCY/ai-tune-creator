import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreHorizontal, Music, ArrowLeft, Play, Edit, Image, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { CreateProjectDialog, CreateProjectWithAIDialog } from "@/features/projects";
import { MobilePageWrapper } from "@/components/mobile/MobilePageWrapper";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileFAB } from "@/components/mobile/MobileFAB";
import { MobileBottomSheet } from "@/components/mobile/MobileBottomSheet";

interface Project {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  banner_url?: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  artist: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  track_count?: number;
}

export default function MobileProjects() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateWithAI, setShowCreateWithAI] = useState(false);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          artists(id, name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectsWithCounts = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { count } = await supabase
            .from('tracks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          return {
            ...project,
            artist: project.artists,
            track_count: count || 0
          };
        })
      );

      setProjects(projectsWithCounts);
    } catch (error: any) {
      console.error('Fetch projects error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить проекты",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.artist?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = async (project: Project) => {
    setSelectedProject(project);
    setProjectDetailsOpen(true);
    await loadTracks(project.id);
  };

  const loadTracks = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('project_id', projectId)
        .order('track_number', { ascending: true });

      if (error) throw error;
      setTracks(data || []);
    } catch (error: any) {
      console.error('Error loading tracks:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить треки",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'draft':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default:
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Опубликован';
      case 'in_progress': return 'В работе';
      case 'draft': return 'Черновик';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'album': return 'Альбом';
      case 'ep': return 'EP';
      case 'single': return 'Сингл';
      default: return type;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'только что';
    if (diffInHours < 24) return `${diffInHours}ч назад`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}д назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const handleProjectCreated = () => {
    fetchProjects();
    setShowCreateProject(false);
    setShowCreateWithAI(false);
  };

  if (!user) {
    return (
      <MobilePageWrapper>
        <MobileCard className="text-center">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">Требуется вход</h3>
            <p className="text-muted-foreground">Войдите, чтобы видеть свои проекты.</p>
          </div>
        </MobileCard>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      {/* Search */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск проектов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <MobileCard key={i} className="h-24 animate-pulse bg-muted">
              <div />
            </MobileCard>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <MobileCard className="text-center">
          <div className="p-8">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Проектов не найдено</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? "Попробуйте изменить поисковый запрос"
                : "Создайте свой первый проект"}
            </p>
            <Button onClick={() => setShowCreateProject(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Создать проект
            </Button>
          </div>
        </MobileCard>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <MobileCard
              key={project.id}
              interactive
              onClick={() => handleProjectClick(project)}
              className="p-0 overflow-hidden"
            >
              <div className="flex">
                {/* Cover Image */}
                <div className="w-20 h-20 flex-shrink-0">
                  {project.cover_url ? (
                    <img
                      src={project.cover_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Project Info */}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={project.artist.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {project.artist.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">
                          {project.artist.name}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <Badge variant="outline" className={`text-xs ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getTypeText(project.type)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project.track_count} треков</span>
                    <span>{formatTimeAgo(project.updated_at)}</span>
                  </div>
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* FAB */}
      <MobileFAB onClick={() => setShowCreateProject(true)}>
        <Plus className="h-6 w-6" />
      </MobileFAB>

      {/* Project Details Bottom Sheet */}
      <MobileBottomSheet
        isOpen={projectDetailsOpen}
        onClose={() => setProjectDetailsOpen(false)}
        title={selectedProject?.title}
        height="half"
      >
        {selectedProject && (
          <div className="p-4 space-y-4">
            {/* Project Header */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden">
                {selectedProject.cover_url ? (
                  <img
                    src={selectedProject.cover_url}
                    alt={selectedProject.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Music className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg truncate">{selectedProject.title}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedProject.artist.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {selectedProject.artist.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{selectedProject.artist.name}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedProject.description && (
              <p className="text-sm text-muted-foreground">
                {selectedProject.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="font-medium">{selectedProject.track_count}</span>
                <span className="text-muted-foreground ml-1">треков</span>
              </div>
              <div>
                <span className="font-medium">{getTypeText(selectedProject.type)}</span>
              </div>
              <div>
                <Badge variant="outline" className={getStatusColor(selectedProject.status)}>
                  {getStatusText(selectedProject.status)}
                </Badge>
              </div>
            </div>

            {/* Tracks Preview */}
            {tracks.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Треки</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {tracks.slice(0, 5).map((track) => (
                    <div key={track.id} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium">{track.track_number}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        {track.duration && (
                          <p className="text-xs text-muted-foreground">
                            {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                          </p>
                        )}
                      </div>
                      {track.audio_url && (
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {tracks.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{tracks.length - 5} ещё
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
              <Button variant="outline" className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Воспроизвести
              </Button>
            </div>
          </div>
        )}
      </MobileBottomSheet>

      {/* Dialogs */}
      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onProjectCreated={handleProjectCreated}
      />

      <CreateProjectWithAIDialog
        open={showCreateWithAI}
        onOpenChange={setShowCreateWithAI}
        onProjectCreated={handleProjectCreated}
      />
    </MobilePageWrapper>
  );
}