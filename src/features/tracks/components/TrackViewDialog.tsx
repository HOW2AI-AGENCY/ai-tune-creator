import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { 
  Music, 
  Clock, 
  Hash, 
  FileText, 
  Brain,
  Calendar,
  User,
  Loader2,
  Eye,
  Play,
  History,
  Sparkles,
  Edit2,
  Users,
  Folder,
  Copy,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Track {
  id: string;
  title: string;
  track_number: number;
  duration?: number | null;
  lyrics?: string | null;
  audio_url?: string | null;
  current_version: number;
  description?: string | null;
  genre_tags?: string[] | null;
  style_prompt?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
  project_id: string;
  projects?: {
    id?: string;
    title: string;
    artist_id: string;
    artists?: {
      id?: string;
      name: string;
      avatar_url?: string;
    };
  };
}

interface Artist {
  id: string;
  name: string;
  avatar_url?: string;
}

interface Project {
  id: string;
  title: string;
  artist_id: string;
  artists?: Artist;
}

interface TrackViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
}

export function TrackViewDialog({ open, onOpenChange, track }: TrackViewDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [aiGenerations, setAiGenerations] = useState<any[]>([]);
  const [loadingAiHistory, setLoadingAiHistory] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (track && open) {
      loadAiHistory(track.id);
      loadArtistsAndProjects();
      setSelectedArtistId(track.projects?.artist_id || "");
      setSelectedProjectId(track.project_id);
    }
  }, [track, open]);

  const loadArtistsAndProjects = async () => {
    try {
      // Загружаем артистов
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('id, name, avatar_url')
        .order('name');

      if (artistsError) throw artistsError;
      setArtists(artistsData || []);

      // Загружаем проекты
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          artist_id,
          artists (
            id,
            name,
            avatar_url
          )
        `)
        .order('title');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading artists and projects:', error);
    }
  };

  const loadAiHistory = async (trackId: string) => {
    try {
      setLoadingAiHistory(true);
      console.log('Loading AI history for track:', trackId);
      
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('AI history query error:', error);
        throw error;
      }
      
      console.log('AI history loaded:', data);
      setAiGenerations(data || []);
    } catch (error: any) {
      console.error('Error loading AI history:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить историю ИИ генераций",
        variant: "destructive"
      });
    } finally {
      setLoadingAiHistory(false);
    }
  };

  const updateTrackAssignment = async () => {
    if (!track || !selectedProjectId) return;

    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('tracks')
        .update({ project_id: selectedProjectId })
        .eq('id', track.id);

      if (error) throw error;

      toast({
        title: "Успешно обновлено",
        description: "Привязка трека к проекту изменена"
      });
      
      // Обновляем локальное состояние
      if (track.projects) {
        track.projects.id = selectedProjectId;
        const selectedProject = projects.find(p => p.id === selectedProjectId);
        if (selectedProject) {
          track.projects.title = selectedProject.title;
          track.projects.artist_id = selectedProject.artist_id;
          track.projects.artists = selectedProject.artists;
        }
      }
    } catch (error) {
      console.error('Error updating track assignment:', error);
      toast({
        title: "Ошибка обновления",
        description: "Не удалось изменить привязку трека",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getFilteredProjects = () => {
    if (!selectedArtistId) return projects;
    return projects.filter(p => p.artist_id === selectedArtistId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration: number) => {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "Текст скопирован в буфер обмена"
    });
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'lyrics':
        return <FileText className="h-4 w-4" />;
      case 'concept':
        return <Brain className="h-4 w-4" />;
      case 'analysis':
        return <Eye className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getServiceName = (service: string) => {
    switch (service) {
      case 'lyrics':
        return 'Генерация лирики';
      case 'concept':
        return 'Генерация концепции';
      case 'analysis':
        return 'Анализ лирики';
      case 'improvement':
        return 'Улучшение лирики';
      case 'suno':
        return 'Suno AI';
      case 'mureka':
        return 'Mureka AI';
      default:
        return service;
    }
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 sm:max-w-[90vw]">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2 pr-8">
            <Music className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <span className="truncate">{track.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 sm:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 text-xs sm:text-sm">
              <TabsTrigger value="overview" className="px-2">Обзор</TabsTrigger>
              <TabsTrigger value="lyrics" className="px-2">Лирика</TabsTrigger>
              <TabsTrigger value="history" className="px-2">История</TabsTrigger>
              <TabsTrigger value="settings" className="px-2">Настройки</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] sm:h-[500px] w-full mt-4">
              <TabsContent value="overview" className="space-y-4 pr-2 sm:pr-4">
                {/* Основная информация */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Music className="h-4 w-4 sm:h-5 sm:w-5" />
                      Информация о треке
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium min-w-0 flex-shrink-0">Номер:</span>
                          <span className="truncate">{track.track_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium min-w-0 flex-shrink-0">Длительность:</span>
                          <span className="truncate">{formatDuration(track.duration || 0)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium min-w-0 flex-shrink-0">Создан:</span>
                          <span className="truncate text-xs sm:text-sm">{formatDate(track.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium min-w-0 flex-shrink-0">Артист:</span>
                          <span className="truncate">{track.projects?.artists?.name || 'Не указан'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium min-w-0 flex-shrink-0">Проект:</span>
                          <span className="truncate">{track.projects?.title || 'Не указан'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium min-w-0 flex-shrink-0">Версия:</span>
                          <Badge variant="secondary" className="text-xs">v{track.current_version}</Badge>
                        </div>
                      </div>
                    </div>

                    {track.description && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Описание</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">{track.description}</p>
                      </div>
                    )}

                    {track.genre_tags && track.genre_tags.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Жанры</h4>
                        <div className="flex flex-wrap gap-1">
                          {track.genre_tags.map((genre, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {track.style_prompt && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Стилистический промпт</h4>
                        <div className="p-3 bg-muted rounded-lg text-xs sm:text-sm">
                          {track.style_prompt}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="lyrics" className="space-y-4 pr-2 sm:pr-4">
                {track.lyrics ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                          Лирика трека
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(track.lyrics!)}
                          className="h-7 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-xs sm:text-sm p-3 bg-muted/50 rounded-lg max-h-80 overflow-y-auto">
                        {track.lyrics}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Лирика отсутствует</h3>
                      <p className="text-muted-foreground text-center text-sm">
                        У этого трека пока нет лирики
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 pr-2 sm:pr-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <History className="h-4 w-4 sm:h-5 sm:w-5" />
                      История ИИ генераций
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingAiHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2 text-sm">Загрузка истории...</span>
                      </div>
                    ) : aiGenerations.length === 0 ? (
                      <div className="text-center py-8">
                        <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">История пуста</h3>
                        <p className="text-muted-foreground text-sm">
                          Для этого трека еще не было ИИ генераций
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiGenerations.map((generation) => (
                          <div key={generation.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {getServiceIcon(generation.service)}
                                <span className="font-medium text-sm truncate">
                                  {getServiceName(generation.service)}
                                </span>
                                <Badge 
                                  variant={generation.status === 'completed' ? 'default' : 
                                          generation.status === 'failed' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {generation.status}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(generation.created_at)}
                              </span>
                            </div>
                            
                            {generation.prompt && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Промпт:
                                </p>
                                <p className="text-xs bg-muted/50 p-2 rounded">
                                  {generation.prompt}
                                </p>
                              </div>
                            )}

                            {generation.result_url && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Результат:
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(generation.result_url, '_blank')}
                                  className="text-xs h-7"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Открыть
                                </Button>
                              </div>
                            )}

                            {generation.error_message && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-destructive mb-1">
                                  Ошибка:
                                </p>
                                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                                  {generation.error_message}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 pr-2 sm:pr-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      Привязка к артисту и проекту
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="artist-select" className="text-sm">Артист</Label>
                      <Select
                        value={selectedArtistId}
                        onValueChange={(value) => {
                          setSelectedArtistId(value);
                          setSelectedProjectId("");
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Выберите артиста" />
                        </SelectTrigger>
                        <SelectContent>
                          {artists.map((artist) => (
                            <SelectItem key={artist.id} value={artist.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={artist.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {artist.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{artist.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project-select" className="text-sm">Проект</Label>
                      <Select
                        value={selectedProjectId}
                        onValueChange={setSelectedProjectId}
                        disabled={!selectedArtistId}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Выберите проект" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredProjects().map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              <span className="text-sm">{project.title}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={updateTrackAssignment}
                      disabled={!selectedProjectId || selectedProjectId === track.project_id || isUpdating}
                      className="w-full h-9"
                      size="sm"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      <span className="text-sm">Сохранить изменения</span>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}