import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Calendar, 
  Users, 
  Play,
  FolderOpen,
  Clock,
  Edit,
  Trash2,
  Plus,
  Image,
  Camera
} from "lucide-react";
import { CoverUploadDialog } from "./CoverUploadDialog";

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
}

interface ProjectDetailsDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated?: () => void;
}

export function ProjectDetailsDialog({ 
  project, 
  open, 
  onOpenChange, 
  onProjectUpdated 
}: ProjectDetailsDialogProps) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadTracks = async () => {
    if (!project) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('project_id', project.id)
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project && open) {
      loadTracks();
    }
  }, [project, open]);

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

  const formatDuration = (duration: number) => {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!project) return null;

  const metadata = project.metadata || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getTypeIcon(project.type)}
              <span>{project.title}</span>
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
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Обложка проекта */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Обложка проекта
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setCoverDialogOpen(true)}
                  >
                    <Camera className="h-4 w-4" />
                    {project.cover_url ? 'Изменить' : 'Добавить'} обложку
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  {project.cover_url ? (
                    <div className="relative group">
                      <img
                        src={project.cover_url}
                        alt={`Обложка ${project.title}`}
                        className="w-64 h-64 rounded-lg object-cover border"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-white hover:bg-white/20"
                          onClick={() => setCoverDialogOpen(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Изменить
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="w-64 h-64 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors bg-muted/20"
                      onClick={() => setCoverDialogOpen(true)}
                    >
                      <Image className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground text-sm text-center">
                        Нажмите для добавления<br />обложки проекта
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Основная информация */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Информация о проекте
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={project.artist.avatar_url} alt={project.artist.name} />
                    <AvatarFallback>
                      {project.artist.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">Артист</h4>
                    <p className="text-sm text-muted-foreground">{project.artist.name}</p>
                  </div>
                </div>

                {project.description && (
                  <div>
                    <h4 className="font-medium mb-2">Описание</h4>
                    <p className="text-muted-foreground">{project.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(project.type)}
                    <span className="text-sm">
                      <strong>Тип:</strong> {project.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Треков:</strong> {tracks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Создан:</strong> {formatDate(project.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Редактировать
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </Button>
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
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Добавить трек
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
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
        </ScrollArea>

        {/* Cover Upload Dialog */}
        <CoverUploadDialog
          open={coverDialogOpen}
          onOpenChange={setCoverDialogOpen}
          projectId={project.id}
          currentCoverUrl={project.cover_url}
          onCoverUpdated={(newCoverUrl) => {
            if (onProjectUpdated) {
              onProjectUpdated();
            }
            toast({
              title: "Успешно",
              description: "Обложка проекта обновлена"
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}