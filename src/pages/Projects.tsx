import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter, MoreHorizontal, FolderOpen, Music, Calendar, Eye, Sparkles, ArrowLeft, Play, Clock, Edit, Trash2, Image, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { CreateProjectDialog, CreateProjectWithAIDialog, CoverUploadDialog, BannerUploadDialog } from "@/features/projects";
import { CreateTrackDialog, TrackDetailsDialog } from "@/features/tracks";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function Projects() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateWithAI, setShowCreateWithAI] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [createTrackDialogOpen, setCreateTrackDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [trackDetailsOpen, setTrackDetailsOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Загружаем проекты с информацией об артистах и количеством треков
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          artists(id, name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Получаем количество треков для каждого проекта
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
    } else {
      setProjects([]);
    }
  }, [user]);

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.artist?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = async (project: Project) => {
    setSelectedProject(project);
    await loadTracks(project.id);
  };

  const loadTracks = async (projectId: string) => {
    try {
      setTracksLoading(true);
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
    } finally {
      setTracksLoading(false);
    }
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setTracks([]);
  };

  const handleProjectCreated = () => {
    fetchProjects();
    setShowCreateProject(false);
    setShowCreateWithAI(false);
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
      case 'published':
        return 'Опубликован';
      case 'in_progress':
        return 'В работе';
      case 'draft':
        return 'Черновик';
      default:
        return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'album':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'ep':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'single':
        return 'bg-accent/10 text-accent-foreground border-accent/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'album':
        return 'Альбом';
      case 'ep':
        return 'EP';
      case 'single':
        return 'Сингл';
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'album':
        return <Music className="h-4 w-4" />;
      case 'single':
        return <Play className="h-4 w-4" />;
      case 'ep':
        return <FolderOpen className="h-4 w-4" />;
      default:
        return <Music className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (duration: number) => {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот проект? Все треки и данные будут потеряны.')) {
      return;
    }

    try {
      // Удаляем треки
      const { error: tracksError } = await supabase
        .from('tracks')
        .delete()
        .eq('project_id', projectId);

      if (tracksError) throw tracksError;

      // Удаляем заметки проекта
      const { error: notesError } = await supabase
        .from('project_notes')
        .delete()
        .eq('project_id', projectId);

      if (notesError) throw notesError;

      // Удаляем проект
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (projectError) throw projectError;

      toast({
        title: "Проект удален",
        description: "Проект и все связанные данные успешно удалены"
      });

      // Возвращаемся к списку проектов
      handleBackToProjects();
      fetchProjects();
    } catch (error: any) {
      console.error('Delete project error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить проект",
        variant: "destructive"
      });
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  const handleUpdateProject = async (data: any) => {
    if (!editingProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: data.title,
          description: data.description,
          type: data.type,
          status: data.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      toast({
        title: "Проект обновлен",
        description: "Изменения успешно сохранены"
      });

      setEditingProject(null);
      fetchProjects();
      
      // Обновляем выбранный проект
      if (selectedProject?.id === editingProject.id) {
        const updatedProject = { ...selectedProject, ...data };
        setSelectedProject(updatedProject);
      }
    } catch (error: any) {
      console.error('Update project error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить проект",
        variant: "destructive"
      });
    }
  };

  const handleTrackClick = (track: any) => {
    setSelectedTrack(track);
    setTrackDetailsOpen(true);
  };

  const handleTrackUpdated = () => {
    if (selectedProject) {
      loadTracks(selectedProject.id);
    }
  };

  if (!user) {
    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle>Требуется вход</CardTitle>
        </CardHeader>
        <CardContent>Войдите, чтобы видеть свои проекты и треки.</CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="space-y-6 animate-fade-in p-1">
      {selectedProject ? (
        // Project Details View - Social Media Style
        <div className="space-y-0">
          {/* Back Button */}
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={handleBackToProjects}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к проектам
            </Button>
          </div>

          {/* Social Media Profile Style Layout */}
          <Card className="overflow-hidden">
            {/* Banner Section */}
            <div className="relative">
              {selectedProject.metadata?.banner_url ? (
                <div className="relative group">
                  <img
                    src={selectedProject.metadata.banner_url}
                    alt={`Баннер ${selectedProject.title}`}
                    className="w-full h-48 md:h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-white/20 gap-2"
                      onClick={() => setBannerDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4" />
                      Изменить баннер
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="w-full h-48 md:h-64 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center cursor-pointer hover:from-primary/30 hover:via-secondary/30 hover:to-accent/30 transition-colors"
                  onClick={() => setBannerDialogOpen(true)}
                >
                  <div className="text-center">
                    <Image className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Нажмите для добавления баннера</p>
                  </div>
                </div>
              )}
              
              {/* Avatar & Quick Actions */}
              <div className="absolute -bottom-12 left-6 flex items-end gap-4">
                {/* Project Avatar (Cover) */}
                <div className="relative group">
                  {selectedProject.cover_url ? (
                    <img
                      src={selectedProject.cover_url}
                      alt={`Обложка ${selectedProject.title}`}
                      className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover border-4 border-background shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg border-4 border-background bg-muted flex items-center justify-center shadow-lg">
                      <Music className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div 
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                    onClick={() => setCoverDialogOpen(true)}
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-4 right-6 flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="shadow-md gap-2"
                  onClick={() => setBannerDialogOpen(true)}
                >
                  <Image className="h-4 w-4" />
                  Баннер
                </Button>
              </div>
            </div>

            {/* Profile Info Section */}
            <CardContent className="pt-16 pb-6">
              <div className="space-y-4">
                {/* Title & Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(selectedProject.type)}
                        <h1 className="text-2xl md:text-3xl font-bold">{selectedProject.title}</h1>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedProject.artist.avatar_url} alt={selectedProject.artist.name} />
                          <AvatarFallback className="text-xs">
                            {selectedProject.artist.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">@{selectedProject.artist.name}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(selectedProject.status)} text-xs`}
                      >
                        {getStatusText(selectedProject.status)}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`${getTypeColor(selectedProject.type)} text-xs`}
                      >
                        {getTypeText(selectedProject.type)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleEditProject(selectedProject)}>
                      <Edit className="h-4 w-4" />
                      Редактировать
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDeleteProject(selectedProject.id)}>
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                </div>

                {/* Description */}
                {selectedProject.description && (
                  <div>
                    <p className="text-muted-foreground">{selectedProject.description}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                    <span><strong>{tracks.length}</strong> треков</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Создан {formatDate(selectedProject.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Треки */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Треки ({tracks.length})
                </CardTitle>
                <Button 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setCreateTrackDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Добавить трек
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tracksLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  Загрузка треков...
                </div>
              ) : tracks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-8 w-8 mx-auto mb-2" />
                  <p>В этом проекте пока нет треков</p>
                  <Button
                    variant="outline"
                    className="mt-4 gap-2"
                    onClick={() => setCreateTrackDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Добавить первый трек
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tracks.map((track, index) => (
                    <Card key={track.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {track.track_number || index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{track.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {track.duration && (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDuration(track.duration)}</span>
                                  </>
                                )}
                                {track.audio_url && (
                                  <>
                                    <span>•</span>
                                    <span>Аудио загружено</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Projects List View
        <>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("projectsTitle")}</h1>
            <p className="text-muted-foreground">Управляйте вашими музыкальными проектами и альбомами</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="shadow-glow gap-2"
              onClick={() => setShowCreateWithAI(true)}
            >
              <Sparkles className="h-4 w-4" />
              Создать с ИИ
            </Button>
            <Button 
              className="shadow-glow gap-2"
              onClick={() => setShowCreateProject(true)}
            >
              <Plus className="h-4 w-4" />
              Новый проект
            </Button>
          </div>
        </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск проектов..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Фильтр
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex gap-2">
                      <div className="h-5 bg-muted rounded w-16"></div>
                      <div className="h-5 bg-muted rounded w-20"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-4/5"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-8 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Projects Grid */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="shadow-card hover:shadow-elevated transition-all duration-200 group cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={getTypeColor(project.type)}>
                        {getTypeText(project.type).toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(project.status)}>
                        {getStatusText(project.status)}
                      </Badge>
                      {project.metadata?.generated_by_ai && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20">
                          <Sparkles className="h-3 w-3 mr-1" />
                          ИИ
                        </Badge>
                      )}
                    </div>
                    <div className="w-full h-32 bg-muted rounded-lg overflow-hidden mb-2">
                      {project.cover_url ? (
                        <img 
                          src={project.cover_url} 
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <Music className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors text-sm">
                      {project.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      от {project.artist.name}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleProjectClick(project)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Посмотреть детали
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedProject(project);
                        setCreateTrackDialogOpen(true);
                      }}>
                        <Music className="mr-2 h-4 w-4" />
                        Добавить трек
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEditProject(project)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive" 
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description || "Описание не указано"}
                </p>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                    <span>{project.track_count || 0} треков</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => handleProjectClick(project)}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Открыть проект
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Пока нет проектов</h3>
          <p className="text-muted-foreground mb-4">
            Создайте ваш первый музыкальный проект, чтобы начать
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setShowCreateWithAI(true)} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Создать с ИИ
            </Button>
            <Button onClick={() => setShowCreateProject(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Создать проект
            </Button>
          </div>
        </div>
      )}

      {/* No Search Results */}
      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Проекты не найдены</h3>
          <p className="text-muted-foreground mb-4">
            Попробуйте изменить поисковый запрос
          </p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Очистить поиск
            </Button>
          </div>
        )}
        </>
      )}

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

      {editingProject && (
        <CreateProjectDialog
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
          onProjectCreated={handleUpdateProject}
          initialData={editingProject}
          mode="edit"
        />
      )}

        <CoverUploadDialog
          open={coverDialogOpen}
          onOpenChange={setCoverDialogOpen}
          projectId={selectedProject?.id || ""}
          currentCoverUrl={selectedProject?.cover_url}
          onCoverUpdated={(newCoverUrl) => {
            if (selectedProject) {
              setSelectedProject({ ...selectedProject, cover_url: newCoverUrl });
              // Refresh projects list
              fetchProjects();
            }
          }}
        />

        <BannerUploadDialog
          open={bannerDialogOpen}
          onOpenChange={setBannerDialogOpen}
          projectId={selectedProject?.id || ""}
          projectTitle={selectedProject?.title || ""}
          onBannerUploaded={(bannerUrl) => {
            if (selectedProject) {
              setSelectedProject({ 
                ...selectedProject, 
                banner_url: bannerUrl,
                metadata: { ...selectedProject.metadata, banner_url: bannerUrl }
              });
              // Refresh projects list
              fetchProjects();
            }
          }}
        />

        <CreateTrackDialog
          open={createTrackDialogOpen}
          onOpenChange={setCreateTrackDialogOpen}
          projectId={selectedProject?.id || ""}
          artistInfo={selectedProject?.artist}
          projectInfo={selectedProject}
          onTrackCreated={() => {
            if (selectedProject) {
              loadTracks(selectedProject.id);
            }
            setCreateTrackDialogOpen(false);
          }}
          nextTrackNumber={(tracks.length || 0) + 1}
        />

        <TrackDetailsDialog
          open={trackDetailsOpen}
          onOpenChange={setTrackDetailsOpen}
          track={selectedTrack ? {
            ...selectedTrack,
            project: {
              title: selectedProject?.title,
              artist: selectedProject?.artist
            }
          } : null}
          onTrackUpdated={handleTrackUpdated}
        />
      </div>
    </ScrollArea>
  );
}