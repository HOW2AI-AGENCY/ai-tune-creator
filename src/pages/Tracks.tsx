import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrackEditDialog, TrackVersionsDialog, TrackGenerationDialog, TrackViewDialog } from "@/features/tracks";
import { FloatingPlayer } from "@/features/ai-generation/components/FloatingPlayer";
import { 
  Plus, 
  Search, 
  Music, 
  Clock, 
  Edit, 
  History,
  Sparkles,
  Filter,
  SortAsc,
  Play,
  Loader2,
  FileText,
  Eye,
  RefreshCw
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  lyrics: string | null;
  audio_url: string | null;
  current_version: number;
  metadata: any;
  created_at: string;
  updated_at: string;
  description?: string | null;
  genre_tags?: string[] | null;
  style_prompt?: string | null;
  project_id: string;
  projects?: {
    title: string;
    artist_id: string;
    is_inbox?: boolean;
    artists?: {
      name: string;
    };
  };
}

export default function Tracks() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated_at");
  const [projects, setProjects] = useState<any[]>([]);
  
  // Диалоги
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  // Player state
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  const loadTracks = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('tracks')
        .select(`
          *,
          projects (
            title,
            artist_id,
            is_inbox,
            artists (
              name
            )
          )
        `);

      // Фильтрация по проекту
      if (selectedProject !== "all") {
        query = query.eq('project_id', selectedProject);
      }

      // Сортировка
      query = query.order(sortBy, { ascending: sortBy === 'track_number' });

      const { data, error } = await query;

      if (error) throw error;

      let filteredTracks = data || [];

      // Фильтрация по поиску
      if (searchTerm.trim()) {
        filteredTracks = filteredTracks.filter(track =>
          track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          track.lyrics?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          track.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Фильтрация по жанру
      if (selectedGenre !== "all") {
        filteredTracks = filteredTracks.filter(track =>
          track.genre_tags?.includes(selectedGenre)
        );
      }

      setTracks(filteredTracks as any);
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

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          is_inbox,
          artists (
            name
          )
        `)
        .order('title');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadTracks();
      loadProjects();
    }
  }, [user, selectedProject, selectedGenre, sortBy]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user) {
        loadTracks();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleEditTrack = (track: Track) => {
    setSelectedTrack(track);
    setEditDialogOpen(true);
  };

  const handleViewTrack = (track: Track) => {
    setSelectedTrack(track);
    setViewDialogOpen(true);
  };

  const handleViewVersions = (track: Track) => {
    setSelectedTrack(track);
    setVersionsDialogOpen(true);
  };

  const handleGenerateAI = (track?: Track) => {
    setSelectedTrack(track || null);
    setGenerationDialogOpen(true);
  };

  const handleGenerationResult = (type: 'lyrics' | 'concept' | 'description', data: any) => {
    if (selectedTrack && type === 'lyrics') {
      // Обновляем трек с сгенерированной лирикой
      setSelectedTrack({
        ...selectedTrack,
        lyrics: data.lyrics
      });
    }
    // TODO: Обработать другие типы генерации
  };

  const handlePlayTrack = (track: Track) => {
    if (!track.audio_url) {
      toast({
        title: "Аудио недоступно",
        description: "У этого трека нет аудиофайла",
        variant: "destructive"
      });
      return;
    }
    setCurrentTrack(track);
    setPlayerOpen(true);
  };

  const syncInboxTracks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-generated-tracks');
      if (error) throw error;
      
      toast({
        title: "Синхронизация запущена",
        description: "Треки обновляются..."
      });
      
      // Обновляем список треков
      loadTracks();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Ошибка синхронизации",
        description: error.message || "Не удалось синхронизировать треки",
        variant: "destructive"
      });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Получаем уникальные жанры для фильтра
  const allGenres = tracks.reduce((genres: string[], track) => {
    if (track.genre_tags) {
      track.genre_tags.forEach(genre => {
        if (!genres.includes(genre)) {
          genres.push(genre);
        }
      });
    }
    return genres;
  }, []);

  if (!user) {
    return (
      <Card className="container mx-auto p-6">
        <CardHeader>
          <CardTitle>Требуется вход</CardTitle>
        </CardHeader>
        <CardContent>Войдите, чтобы видеть и управлять треками.</CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full p-2 md:p-6 space-y-3 md:space-y-6 pt-safe-top">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Треки</h1>
          <p className="text-muted-foreground">
            Управление музыкальными треками и генерация с помощью ИИ
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={syncInboxTracks}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Синхронизация
          </Button>
          <Button 
            onClick={() => handleGenerateAI()}
            variant="outline"
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Генерация ИИ
          </Button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры и поиск
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Поиск</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по названию, лирике..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Проект</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Все проекты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все проекты</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.is_inbox ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">Inbox</Badge>
                          {project.title}
                        </div>
                      ) : (
                        <span>
                          {project.title} 
                          {project.artists?.name && ` (${project.artists.name})`}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Жанр</label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Все жанры" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все жанры</SelectItem>
                  {allGenres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Сортировка</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">По дате изменения</SelectItem>
                  <SelectItem value="created_at">По дате создания</SelectItem>
                  <SelectItem value="title">По названию</SelectItem>
                  <SelectItem value="track_number">По номеру трека</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список треков */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : tracks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Music className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Треков не найдено</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || selectedProject !== "all" || selectedGenre !== "all"
                ? "Попробуйте изменить фильтры поиска"
                : "Создайте свой первый трек или воспользуйтесь генерацией ИИ"}
            </p>
            <Button onClick={() => handleGenerateAI()} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Создать с ИИ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => (
            <Card key={track.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{track.title}</CardTitle>
                    <div className="space-y-1">
                      {track.projects?.artists?.name && (
                        <p className="text-sm text-muted-foreground">
                          {track.projects.artists.name}
                        </p>
                      )}
                      {track.projects?.title && (
                        <p className="text-sm text-muted-foreground">
                          {track.projects.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Трек #{track.track_number}
                    </div>
                    {track.current_version > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        v{track.current_version}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Описание */}
                {track.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {track.description}
                  </p>
                )}

                {/* Жанры */}
                {track.genre_tags && track.genre_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {track.genre_tags.map((genre, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Информация о треке */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(track.duration)}
                    </div>
                    {track.lyrics && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Лирика
                      </div>
                    )}
                  </div>
                </div>

                {/* Действия */}
                <div className="flex gap-2">
                  {track.audio_url && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handlePlayTrack(track)}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Играть
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewTrack(track)}
                    className={track.audio_url ? "" : "flex-1"}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditTrack(track)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewVersions(track)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleGenerateAI(track)}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Диалоги */}
      <TrackEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        track={selectedTrack}
        onTrackUpdated={loadTracks}
      />

      <TrackVersionsDialog
        open={versionsDialogOpen}
        onOpenChange={setVersionsDialogOpen}
        trackId={selectedTrack?.id || ""}
        trackTitle={selectedTrack?.title || ""}
      />

      <TrackGenerationDialog
        open={generationDialogOpen}
        onOpenChange={setGenerationDialogOpen}
        onGenerated={handleGenerationResult}
        artistInfo={selectedTrack?.projects?.artists}
        projectInfo={selectedTrack?.projects}
        trackId={selectedTrack?.id}
        existingTrackData={selectedTrack ? {
          stylePrompt: selectedTrack.style_prompt || "",
          genreTags: selectedTrack.genre_tags || [],
          lyrics: selectedTrack.lyrics || ""
        } : undefined}
      />

      <TrackViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        track={selectedTrack}
      />

      {/* Player */}
      <FloatingPlayer
        isOpen={playerOpen}
        onClose={() => setPlayerOpen(false)}
        track={currentTrack ? {
          id: currentTrack.id,
          title: currentTrack.title,
          audio_url: currentTrack.audio_url || '',
          project: {
            title: currentTrack.projects?.title || '',
            artist: {
              name: currentTrack.projects?.artists?.name || 'Unknown Artist'
            }
          }
        } : null}
      />
    </div>
  );
}