import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Music, 
  MapPin, 
  Calendar, 
  Users, 
  Plus,
  FolderOpen,
  Play,
  Clock
} from "lucide-react";
import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog";

interface Artist {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  metadata?: any;
  created_at: string;
  user_id: string;
}

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
}

interface ArtistDetailsDialogProps {
  artist: Artist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtistDetailsDialog({ artist, open, onOpenChange }: ArtistDetailsDialogProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const { toast } = useToast();

  const loadProjects = async () => {
    if (!artist) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('artist_id', artist.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error loading projects:', error);
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
    if (artist && open) {
      loadProjects();
    }
  }, [artist, open]);

  const handleProjectCreated = () => {
    loadProjects();
    setShowCreateProject(false);
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

  if (!artist) return null;

  const metadata = artist.metadata || {};

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] p-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={artist.avatar_url} alt={artist.name} />
                  <AvatarFallback>{artist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {artist.name}
              </DialogTitle>
              <DialogDescription>
                Информация об артисте и его проектах
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 h-0">
              <div className="space-y-6 p-6">
              {/* Основная информация */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Информация об артисте
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {artist.description && (
                    <div>
                      <h4 className="font-medium mb-2">Описание</h4>
                      <p className="text-muted-foreground">{artist.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metadata.genre && (
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Жанр:</strong> {metadata.genre}
                        </span>
                      </div>
                    )}

                    {metadata.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Локация:</strong> {metadata.location}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>Создан:</strong> {formatDate(artist.created_at)}
                      </span>
                    </div>
                  </div>

                  {metadata.influences && metadata.influences.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Влияния</h4>
                      <div className="flex flex-wrap gap-2">
                        {metadata.influences.map((influence: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {influence}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {metadata.style && (
                    <div>
                      <h4 className="font-medium mb-2">Стиль</h4>
                      <p className="text-sm text-muted-foreground">{metadata.style}</p>
                    </div>
                  )}

                  {metadata.background && (
                    <div>
                      <h4 className="font-medium mb-2">Предыстория</h4>
                      <p className="text-sm text-muted-foreground">{metadata.background}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Проекты */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Проекты ({projects.length})
                    </CardTitle>
                    <Button
                      onClick={() => setShowCreateProject(true)}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Создать проект
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      Загрузка проектов...
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-8 w-8 mx-auto mb-2" />
                      <p>У этого артиста пока нет проектов</p>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateProject(true)}
                        className="mt-4 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Создать первый проект
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((project) => (
                        <Card key={project.id} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  {getTypeIcon(project.type)}
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-medium">{project.title}</h4>
                                  {project.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {project.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Тип: {project.type}</span>
                                    <span>•</span>
                                    <span>Обновлен: {formatDate(project.updated_at)}</span>
                                  </div>
                                </div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={getStatusColor(project.status)}
                              >
                                {project.status === 'published' && 'Опубликован'}
                                {project.status === 'in_progress' && 'В работе'}
                                {project.status === 'draft' && 'Черновик'}
                                {!['published', 'in_progress', 'draft'].includes(project.status) && project.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <CreateProjectDialog
        artist={artist}
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
}