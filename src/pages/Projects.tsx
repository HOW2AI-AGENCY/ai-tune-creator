import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter, MoreHorizontal, FolderOpen, Music, Calendar, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { CreateProjectWithAIDialog } from "@/components/projects/CreateProjectWithAIDialog";
import { ProjectDetailsDialog } from "@/components/projects/ProjectDetailsDialog";

interface Project {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateWithAI, setShowCreateWithAI] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Загружаем проекты с информацией об артистах и количеством треков
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          artists!inner(id, name, avatar_url)
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
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.artist?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
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

  return (
    <div className="space-y-6 animate-fade-in">
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
                    <CardTitle className="group-hover:text-primary transition-colors">
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
                      <DropdownMenuItem>
                        <Music className="mr-2 h-4 w-4" />
                        Добавить трек
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
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

      <ProjectDetailsDialog
        project={selectedProject}
        open={showProjectDetails}
        onOpenChange={setShowProjectDetails}
        onProjectUpdated={fetchProjects}
      />
    </div>
  );
}