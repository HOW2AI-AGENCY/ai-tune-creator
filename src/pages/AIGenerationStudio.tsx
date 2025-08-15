import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Play, 
  Heart, 
  Download, 
  Music,
  Sparkles,
  RefreshCw,
  CloudDownload,
  MoreHorizontal,
  Command,
  Clock,
  Eye,
  Pause,
  SkipForward,
  Volume2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrackSync } from "@/hooks/useTrackSync";
import { GenerationContextPanel } from "@/features/ai-generation/components/GenerationContextPanel";
import { TaskQueuePanel } from "@/features/ai-generation/components/TaskQueuePanel";
import { TrackResultsGrid } from "@/features/ai-generation/components/TrackResultsGrid";
import { TrackDetailsDrawer } from "@/features/ai-generation/components/TrackDetailsDrawer";
import { CommandPalette } from "@/features/ai-generation/components/CommandPalette";
import { FloatingPlayer } from "@/features/ai-generation/components/FloatingPlayer";
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

interface GenerationTask {
  id: string;
  prompt: string;
  service: 'suno' | 'mureka';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  result?: Track;
  created_at: string;
  estimated_time?: number;
}

interface Option {
  id: string;
  name: string;
}

export default function AIGenerationStudio() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Core State
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [artists, setArtists] = useState<Option[]>([]);
  
  // UI State
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isTrackDetailsOpen, setIsTrackDetailsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync Hook
  const { isSyncing, syncTracks, lastSyncResults } = useTrackSync();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsTrackDetailsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch context data
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

      await Promise.all([fetchTasks(), fetchTracks()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_generations")
        .select(`
          id,
          prompt,
          service,
          status,
          created_at,
          metadata,
          error_message,
          track_id
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const transformedTasks: GenerationTask[] = data?.map(item => ({
        id: item.id,
        prompt: item.prompt,
        service: item.service as 'suno' | 'mureka',
        status: item.status as any,
        error: item.error_message,
        created_at: item.created_at,
        progress: item.status === 'running' ? 50 : item.status === 'completed' ? 100 : 0,
        estimated_time: 120, // 2 minutes default
      })) || [];

      setTasks(transformedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
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
        .not("audio_url", "is", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    }
  };

  const filteredTracks = useMemo(() => {
    return tracks.filter(track => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        track.title?.toLowerCase().includes(query) ||
        track.description?.toLowerCase().includes(query) ||
        track.genre_tags?.some(tag => tag.toLowerCase().includes(query)) ||
        track.project?.title?.toLowerCase().includes(query) ||
        track.project?.artist?.name?.toLowerCase().includes(query)
      );
    });
  }, [tracks, searchQuery]);

  const handleGenerate = async (params: GenerationParams) => {
    try {
      const { data, error } = await supabase.functions.invoke(`generate-${params.service}-track`, {
        body: params
      });

      if (error) throw error;

      toast({
        title: "🎵 Генерация запущена",
        description: `${params.service === 'suno' ? 'Suno AI' : 'Mureka'} создает ваш трек`,
      });

      // Refresh tasks
      await fetchTasks();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || 'Произошла ошибка при запуске генерации',
        variant: "destructive"
      });
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (currentPlayingTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentPlayingTrack(track);
      setIsPlaying(true);
    }
  };

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setIsTrackDetailsOpen(true);
  };

  const handleCommandAction = (action: string, data?: any) => {
    switch (action) {
      case 'search':
        setSearchQuery(data?.query || '');
        break;
      case 'generate':
        if (data?.params) {
          handleGenerate(data.params);
        }
        break;
      case 'sync':
        syncTracks();
        break;
      case 'play':
        if (data?.track) {
          handlePlayTrack(data.track);
        }
        break;
      default:
        console.log('Unknown command action:', action);
    }
    setIsCommandPaletteOpen(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Войдите в систему</h2>
            <p className="text-muted-foreground">
              Для доступа к AI Studio необходимо войти в систему
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Left Panel - Context & Generation Controls */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">AI Studio</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Генерация музыки нового поколения
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <GenerationContextPanel
            projects={projects}
            artists={artists}
            onGenerate={handleGenerate}
          />
        </div>
      </div>

      {/* Center Panel - Task Queue & Results */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск треков, стилей, артистов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-2"
              >
                <Command className="h-4 w-4" />
                <span className="hidden md:inline">Команды</span>
                <Badge variant="secondary" className="text-xs">⌘K</Badge>
              </Button>
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
                {isSyncing ? 'Синхронизация...' : 'Синхронизация'}
              </Button>
              <Badge variant="secondary" className="px-3 py-1">
                {filteredTracks.length} треков
              </Badge>
            </div>
          </div>
        </div>

        {/* Task Queue */}
        <TaskQueuePanel tasks={tasks} />

        <Separator />

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto">
          <TrackResultsGrid
            tracks={filteredTracks}
            onTrackClick={handleTrackClick}
            onPlayTrack={handlePlayTrack}
            currentPlayingTrack={currentPlayingTrack}
            isPlaying={isPlaying}
            isSyncing={isSyncing}
          />
        </div>
      </div>

      {/* Right Drawer - Track Details */}
      <TrackDetailsDrawer
        track={selectedTrack}
        isOpen={isTrackDetailsOpen}
        onClose={() => setIsTrackDetailsOpen(false)}
        onPlay={handlePlayTrack}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onAction={handleCommandAction}
        tracks={tracks}
        projects={projects}
        artists={artists}
      />

      {/* Floating Player */}
      {currentPlayingTrack && (
        <FloatingPlayer
          track={currentPlayingTrack}
        />
      )}
    </div>
  );
}