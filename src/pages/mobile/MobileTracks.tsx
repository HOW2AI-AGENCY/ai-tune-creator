import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Music, Play, MoreHorizontal, Clock, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { MobilePageWrapper } from "@/components/mobile/MobilePageWrapper";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileFAB } from "@/components/mobile/MobileFAB";
import { MobileBottomSheet } from "@/components/mobile/MobileBottomSheet";
import { FloatingPlayer } from "@/features/ai-generation/components/FloatingPlayer";

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
  projects?: {
    title: string;
    artist_id: string;
    is_inbox?: boolean;
    artists?: {
      name: string;
    };
  };
}

export default function MobileTracks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [trackDetailsOpen, setTrackDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

      if (selectedProject !== "all") {
        query = query.eq('project_id', selectedProject);
      }

      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      let filteredTracks = data || [];

      if (searchTerm.trim()) {
        filteredTracks = filteredTracks.filter(track =>
          track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          track.lyrics?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          track.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

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
  }, [user, selectedProject, selectedGenre]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user) {
        loadTracks();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setTrackDetailsOpen(true);
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
      <MobilePageWrapper>
        <MobileCard className="text-center">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">Требуется вход</h3>
            <p className="text-muted-foreground">Войдите, чтобы видеть треки.</p>
          </div>
        </MobileCard>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      {/* Search & Controls */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск треков..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(true)}
            className="gap-2 flex-1"
          >
            <Filter className="h-4 w-4" />
            Фильтры
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={syncInboxTracks}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tracks List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <MobileCard key={i} className="h-16 animate-pulse bg-muted">
              <div />
            </MobileCard>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <MobileCard className="text-center">
          <div className="p-8">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Треков не найдено</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedProject !== "all" || selectedGenre !== "all"
                ? "Попробуйте изменить фильтры поиска"
                : "Создайте свой первый трек"}
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Создать трек
            </Button>
          </div>
        </MobileCard>
      ) : (
        <div className="space-y-2">
          {tracks.map((track) => (
            <MobileCard
              key={track.id}
              interactive
              onClick={() => handleTrackClick(track)}
              className="p-0 overflow-hidden"
            >
              <div className="flex items-center p-3">
                {/* Track Number */}
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-sm font-medium">{track.track_number}</span>
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-sm truncate">{track.title}</h3>
                    {track.current_version > 1 && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        v{track.current_version}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {track.projects?.artists?.name && (
                      <span className="truncate">{track.projects.artists.name}</span>
                    )}
                    {track.projects?.title && (
                      <>
                        <span>•</span>
                        <span className="truncate">{track.projects.title}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(track.duration)}
                    </div>
                    <span>{formatTimeAgo(track.updated_at)}</span>
                  </div>
                </div>

                {/* Play Button */}
                {track.audio_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayTrack(track);
                    }}
                    className="ml-2 flex-shrink-0"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Genre Tags */}
              {track.genre_tags && track.genre_tags.length > 0 && (
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-1">
                    {track.genre_tags.slice(0, 3).map((genre, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                    {track.genre_tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{track.genre_tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </MobileCard>
          ))}
        </div>
      )}

      {/* Filters Bottom Sheet */}
      <MobileBottomSheet
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Фильтры"
        height="auto"
      >
        <div className="p-4 space-y-4">
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

          <Button onClick={() => setFiltersOpen(false)} className="w-full">
            Применить фильтры
          </Button>
        </div>
      </MobileBottomSheet>

      {/* Track Details Bottom Sheet */}
      <MobileBottomSheet
        isOpen={trackDetailsOpen}
        onClose={() => setTrackDetailsOpen(false)}
        title={selectedTrack?.title}
        height="half"
      >
        {selectedTrack && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">{selectedTrack.title}</h2>
                <div className="text-sm text-muted-foreground">
                  Трек #{selectedTrack.track_number}
                  {selectedTrack.current_version > 1 && ` • v${selectedTrack.current_version}`}
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {selectedTrack.description && (
              <p className="text-sm text-muted-foreground">
                {selectedTrack.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Длительность:</span>
                <br />
                <span className="text-muted-foreground">
                  {formatDuration(selectedTrack.duration)}
                </span>
              </div>
              <div>
                <span className="font-medium">Обновлен:</span>
                <br />
                <span className="text-muted-foreground">
                  {formatTimeAgo(selectedTrack.updated_at)}
                </span>
              </div>
            </div>

            {selectedTrack.genre_tags && selectedTrack.genre_tags.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Жанры:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedTrack.genre_tags.map((genre, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {selectedTrack.audio_url && (
                <Button 
                  onClick={() => handlePlayTrack(selectedTrack)} 
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Играть
                </Button>
              )}
              <Button variant="outline" className="flex-1">
                Редактировать
              </Button>
            </div>
          </div>
        )}
      </MobileBottomSheet>

      {/* FAB */}
      <MobileFAB onClick={() => {}}>
        <Plus className="h-6 w-6" />
      </MobileFAB>

      {/* Floating Player */}
      {playerOpen && currentTrack && (
        <FloatingPlayer
          track={currentTrack}
          isOpen={playerOpen}
          onClose={() => setPlayerOpen(false)}
          onNext={() => {}}
          onPrev={() => {}}
        />
      )}
    </MobilePageWrapper>
  );
}