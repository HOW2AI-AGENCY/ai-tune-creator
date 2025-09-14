import { useEffect, useMemo, useState } from "react";
import { ResizableSidebar } from "@/components/ui/resizable-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTrackSync } from "@/hooks/useTrackSync";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrackLibrary } from "@/components/tracks/TrackLibrary";
import { TrackGenerationSidebar } from "@/features/ai-generation/components/TrackGenerationSidebar";
import { LyricsDrawer } from "@/features/ai-generation/components/LyricsDrawer";
import { useSimpleGeneration } from "@/features/ai-generation/hooks/useSimpleGeneration";
import { lazy, Suspense } from "react";
const FloatingPlayer = lazy(() => import("@/features/ai-generation/components/FloatingPlayer").then(m => ({ default: m.FloatingPlayer })));
import { 
  Search, 
  Play, 
  Heart, 
  Download, 
  MoreHorizontal, 
  Music,
  Clock,
  Eye,
  Sparkles,
  RefreshCw,
  CloudDownload
} from "lucide-react";
import { GenerationParams } from "@/features/ai-generation/types";

interface Track {
  id: string;
  title: string;
  track_number?: number;
  duration?: number;
  lyrics?: string;
  description?: string;
  genre_tags?: string[];
  style_prompt?: string;
  current_version?: number;
  created_at?: string;
  updated_at?: string;
  audio_url?: string;
  metadata?: any;
  project?: {
    title: string;
    artist?: {
      name: string;
    };
  };
}

interface GenerationItem {
  id: string;
  prompt: string;
  service: 'suno' | 'mureka';
  status: string;
  result_url?: string;
  created_at: string;
  track?: Track;
}

interface Option {
  id: string;
  name: string;
}

// Удаляем локальный интерфейс - используем из types
// interface GenerationParams удален

export default function AIGenerationNew() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [artists, setArtists] = useState<Option[]>([]);
  
  // Player & Lyrics state
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isLyricsDrawerOpen, setIsLyricsDrawerOpen] = useState(false);
  const [trackLikes, setTrackLikes] = useState<Record<string, boolean>>({});
  const [trackViews, setTrackViews] = useState<Record<string, number>>({});
  
  // Состояние для polling генерации
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [generatingMessage, setGeneratingMessage] = useState<string>('');
  
  // Состояние для обработки ошибок
  const [generationError, setGenerationError] = useState<{
    type: 'network' | 'api' | 'validation' | 'unknown';
    message: string;
    details?: string;
    code?: string;
  } | null>(null);
  
  // Simple generation hook
  const { generateTrack, activeGenerations, isGenerating: hookIsGenerating, generationProgress } = useSimpleGeneration();
  
  // Хук для синхронизации треков
  const { isSyncing, syncTracks, downloadSingleTrack, lastSyncResults } = useTrackSync();


  useEffect(() => {
    if (!user) return;
    
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch projects and artists for generation sidebar
      const [projectsRes, artistsRes] = await Promise.all([
        supabase.from("projects").select("id, title, artists(name)").order("created_at", { ascending: false }),
        supabase.from("artists").select("id, name").order("name")
      ]);

      if (projectsRes.data) {
        setProjects(projectsRes.data.map((p: any) => ({
          id: p.id,
          name: p.artists?.name ? `${p.title} (${p.artists.name})` : p.title,
        })));
      }

      if (artistsRes.data) {
        setArtists(artistsRes.data.map((a: any) => ({ id: a.id, name: a.name })));
      }

      await Promise.all([fetchGenerations(), fetchTracks()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchGenerations = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_generations")
        .select(`
          id,
          prompt,
          service,
          status,
          result_url,
          created_at,
          track_id
        `)
        .eq("status", "completed")
        .not("result_url", "is", null) // Только с результатами
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch track details for generations with track_id
      const trackIds = data?.filter(g => g.track_id).map(g => g.track_id) || [];
      let trackData: any[] = [];
      
      if (trackIds.length > 0) {
        const { data: tracksData, error: tracksError } = await supabase
          .from("tracks")
          .select(`
            id,
            title,
            track_number,
            duration,
            lyrics,
            description,
            genre_tags,
            style_prompt,
            current_version,
            created_at,
            updated_at,
            audio_url,
            metadata,
            projects(
              title,
              artists(name)
            )
          `)
          .in("id", trackIds)
          .not("audio_url", "is", null); // Только с аудио

        if (!tracksError) {
          trackData = tracksData || [];
        }
      }

      // Фильтруем только генерации, у которых есть треки с аудио
      const enrichedGenerations = data?.map(gen => ({
        ...gen,
        service: gen.service as 'suno' | 'mureka',
        track: trackData.find(t => t.id === gen.track_id)
      })).filter(gen => gen.track && gen.track.audio_url) || [];

      setGenerations(enrichedGenerations);
    } catch (error) {
      console.error("Error fetching generations:", error);
    }
  };

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          id,
          title,
          track_number,
          duration,
          lyrics,
          description,
          genre_tags,
          style_prompt,
          current_version,
          created_at,
          updated_at,
          audio_url,
          metadata,
          projects(
            title,
            artists(name)
          )
        `)
        .not("audio_url", "is", null) // Только треки с аудио
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    }
  };

  const filteredGenerations = useMemo(() => {
    return generations.filter(gen => {
      if (searchQuery && !gen.prompt.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !gen.track?.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [generations, searchQuery]);

  // Обработчики
  const handleGenerate = async (params: GenerationParams) => {
    try {
      setGenerationError(null);
      await generateTrack(params);
      await fetchGenerations();
    } catch (error: any) {
      console.error('Generation error:', error);
      setGenerationError({
        type: error.name === 'TypeError' ? 'network' : 'api',
        message: error.message || 'Произошла ошибка при генерации трека',
        details: error.details,
        code: error.code
      });
    }
  };

  const handleErrorDismiss = () => {
    setGenerationError(null);
  };

  const handleTrackClick = (track: Track) => {
    // Увеличиваем счетчик просмотров
    setTrackViews(prev => ({
      ...prev,
      [track.id]: (prev[track.id] || 0) + 1
    }));
    
    // Открываем drawer с лирикой
    setSelectedTrack(track);
    setIsLyricsDrawerOpen(true);
  };

  const handlePlayTrack = (track: Track) => {
    setSelectedTrack(track);
    setIsPlayerOpen(true);
  };

  const handleToggleLike = async (track: Track) => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите, чтобы лайкать треки",
        variant: "destructive"
      });
      return;
    }

    const isLiked = trackLikes[track.id];
    
    try {
      if (isLiked) {
        // Убираем лайк (пока в локальном состоянии)
        setTrackLikes(prev => ({ ...prev, [track.id]: false }));
      } else {
        // Добавляем лайк
        setTrackLikes(prev => ({ ...prev, [track.id]: true }));
        toast({
          title: "❤️ Добавлено в избранное",
          description: track.title
        });
      }
      
      // TODO: Сохранить в базу данных
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Войдите в систему</h2>
            <p className="text-muted-foreground">
              Для просмотра генераций и треков необходимо войти в систему
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Левый сайдбар с формой генерации */}
      <ResizableSidebar
        defaultWidth={380}
        minWidth={320}
        maxWidth={600}
        collapsible={true}
        position="left"
      >
        <TrackGenerationSidebar
          projects={projects}
          artists={artists}
          onGenerate={handleGenerate}
          isGenerating={hookIsGenerating}
          generationProgress={generationProgress}
          error={generationError}
          onErrorDismiss={handleErrorDismiss}
        />
      </ResizableSidebar>

      {/* Основная область контента */}
      <div className="flex-1 flex flex-col">
        {/* Заголовок и поиск */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                ИИ Генерация музыки
              </h1>
              <p className="text-sm text-muted-foreground">
                {generatingMessage ? (
                  <span className="text-primary">{generatingMessage}</span>
                ) : (
                  "Сгенерированные треки с аудио"
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={syncTracks}
                disabled={isSyncing}
                className="flex items-center gap-2"
              >
                <CloudDownload className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Синхронизация...' : 'Загрузить треки'}
              </Button>
              <Badge variant="secondary" className="px-3 py-1">
                {filteredGenerations.length} треков
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {lastSyncResults && (
              <div className="text-sm text-muted-foreground">
                Последняя синхронизация: {lastSyncResults.summary.successful_downloads} загружено
              </div>
            )}
          </div>
        </div>

        {/* Сетка треков */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSyncing && (
            <div className="text-center py-8 mb-6">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Синхронизация треков с внешними сервисами...
              </p>
            </div>
          )}
          
          {filteredGenerations.length === 0 && !isSyncing ? (
            <div className="text-center py-12">
              <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Нет треков с аудио
              </h3>
              <p className="text-muted-foreground mb-4">
                Создайте первый трек с помощью формы слева или загрузите существующие
              </p>
              <Button 
                onClick={syncTracks} 
                disabled={isSyncing}
                className="flex items-center gap-2"
              >
                <CloudDownload className="h-4 w-4" />
                Загрузить существующие треки
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredGenerations.map((generation) => (
                <Card 
                  key={generation.id} 
                  className="bg-card border-border hover:bg-accent/10 transition-all cursor-pointer group hover:scale-105"
                  onClick={() => generation.track && handleTrackClick(generation.track)}
                >
                  <CardContent className="p-0 relative">
                    {/* Cover Image */}
                    <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/30 relative overflow-hidden rounded-t-lg">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Music className="h-12 w-12 text-primary/60" />
                      </div>
                      
                      {/* Hover Controls */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            generation.track && handleToggleLike(generation.track);
                          }}
                        >
                          <Heart 
                            className={`h-4 w-4 ${trackLikes[generation.track?.id || ''] ? 'fill-red-500 text-red-500' : ''}`} 
                          />
                        </Button>
                        
                        <Button 
                          size="sm" 
                          className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            generation.track && handlePlayTrack(generation.track);
                          }}
                        >
                          <Play className="h-5 w-5 ml-0.5" />
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Download functionality
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Duration & Views */}
                      <div className="absolute top-2 right-2 space-y-1">
                        {generation.track?.duration && (
                          <Badge variant="secondary" className="bg-black/60 text-white text-xs border-0">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(generation.track.duration)}
                          </Badge>
                        )}
                        {trackViews[generation.track?.id || ''] && (
                          <Badge variant="secondary" className="bg-black/60 text-white text-xs border-0 block">
                            <Eye className="h-3 w-3 mr-1" />
                            {trackViews[generation.track?.id || '']}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Track Info */}
                    <div className="p-3 space-y-1">
                      <h3 className="font-medium text-sm truncate">
                        {generation.track?.title || generation.prompt.slice(0, 30) + "..."}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {generation.track?.project?.artist?.name || "Неизвестный артист"}
                      </p>
                      
                      {/* Badges */}
                      <div className="flex items-center justify-between mt-2">
                        <Badge 
                          variant={generation.service === 'suno' ? 'default' : 'outline'} 
                          className="text-xs"
                        >
                          {generation.service}
                        </Badge>
                        
                        {generation.track?.genre_tags && generation.track.genre_tags.length > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                          >
                            {generation.track.genre_tags[0]}
                          </Badge>
                        )}
                      </div>

                      {trackLikes[generation.track?.id || ''] && (
                        <div className="flex items-center gap-1 mt-2">
                          <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                          <span className="text-xs text-muted-foreground">В избранном</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Выездной drawer с лирикой */}
      <LyricsDrawer
        isOpen={isLyricsDrawerOpen}
        onClose={() => setIsLyricsDrawerOpen(false)}
        track={selectedTrack}
        onPlay={handlePlayTrack}
      />

      {/* Всплывающий плеер */}
      <Suspense fallback={null}>
        <FloatingPlayer
          isOpen={isPlayerOpen}
          track={selectedTrack}
          onClose={() => setIsPlayerOpen(false)}
          onShowLyrics={(track) => {
            setSelectedTrack(track);
            setIsLyricsDrawerOpen(true);
          }}
        />
      </Suspense>
    </div>
  );
}