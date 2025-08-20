import React, { useState, useEffect, useMemo, Suspense, lazy, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Play, Heart, Download, Music, Sparkles, RefreshCw, CloudDownload, MoreHorizontal, Command, Clock, Eye, Pause, Filter, SlidersHorizontal, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrackSync } from "@/hooks/useTrackSync";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { GenerationParams } from "@/features/ai-generation/types";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { useTranslation } from "@/hooks/useTranslation";
import { useTrackGenerationWithProgress } from "@/features/ai-generation/hooks/useTrackGenerationWithProgress";
import { TrackSkeleton } from "@/components/ui/track-skeleton";
import { ManualUploadLastTwo } from "@/components/dev/ManualUploadLastTwo";
import { useEventListener } from "@/lib/events/event-bus";

// Lazy-loaded components for code splitting
const GenerationContextPanel = lazy(() => import("@/features/ai-generation/components/GenerationContextPanel").then(m => ({
  default: m.GenerationContextPanel
})));
const TaskQueuePanel = lazy(() => import("@/features/ai-generation/components/TaskQueuePanel").then(m => ({
  default: m.TaskQueuePanel
})));
const TrackResultsGrid = lazy(() => import("@/features/ai-generation/components/TrackResultsGrid").then(m => ({
  default: m.TrackResultsGrid
})));
const TrackDetailsDrawer = lazy(() => import("@/features/ai-generation/components/TrackDetailsDrawer").then(m => ({
  default: m.TrackDetailsDrawer
})));
const CommandPalette = lazy(() => import("@/features/ai-generation/components/CommandPalette").then(m => ({
  default: m.CommandPalette
})));
const FloatingPlayer = lazy(() => import("@/features/ai-generation/components/FloatingPlayer").then(m => ({
  default: m.FloatingPlayer
})));
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
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    t
  } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const {
    state: sidebarState
  } = useSidebar();

  // Generation with progress tracking
  const {
    generateTrack,
    isGenerating,
    generationProgress,
    ongoingGenerations,
    cancelGeneration
  } = useTrackGenerationWithProgress();

  // Check sidebar actual state
  const sidebarCollapsed = sidebarState === "collapsed";

  // Listen for tracks-updated events
  useEventListener('tracks-updated', () => {
    console.log('📢 Received tracks-updated event, refreshing tracks...');
    fetchTracks();
  });

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
  const [showRecoveryTools, setShowRecoveryTools] = useState(false);

  // Mobile State
  const [isGenerationPanelOpen, setIsGenerationPanelOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sync Hook
  const {
    isSyncing,
    syncTracks,
    lastSyncResults
  } = useTrackSync();

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
    if (!isMobile) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMobile]);

  // Open generation panel on request (from track details button)
  useEffect(() => {
    const openHandler = () => setIsGenerationPanelOpen(true);
    window.addEventListener('open-generation-panel', openHandler);
    return () => window.removeEventListener('open-generation-panel', openHandler);
  }, []);
  useEffect(() => {
    if (!user) return;

    // Clear stuck processing tasks first
    const clearStuckTasks = async () => {
      try {
        await supabase.functions.invoke('update-processing-status');
      } catch (error) {
        console.error('Error clearing stuck tasks:', error);
      }
    };
    clearStuckTasks().then(() => {
      fetchData();
    });

    // Preload lazy components to minimize suspensions
    Promise.all([import("@/features/ai-generation/components/GenerationContextPanel"), import("@/features/ai-generation/components/TaskQueuePanel"), import("@/features/ai-generation/components/TrackResultsGrid"), import("@/features/ai-generation/components/TrackDetailsDrawer"), import("@/features/ai-generation/components/CommandPalette"), import("@/features/ai-generation/components/FloatingPlayer")]).catch(() => {
      // Silently handle preload failures
    });
  }, [user]);
  const fetchData = async () => {
    try {
      // Fetch context data
      const [projectsRes, artistsRes] = await Promise.all([supabase.from("projects").select("id, title, artists(name)").order("created_at", {
        ascending: false
      }), supabase.from("artists").select("id, name").order("name")]);
      if (projectsRes.data) {
        setProjects(projectsRes.data.map((p: any) => ({
          id: p.id,
          name: p.artists?.name ? `${p.title} (${p.artists.name})` : p.title
        })));
      }
      if (artistsRes.data) {
        setArtists(artistsRes.data.map((a: any) => ({
          id: a.id,
          name: a.name
        })));
      }
      await Promise.all([fetchTasks(), fetchTracks()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  const fetchTasks = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("ai_generations").select(`
          id,
          prompt,
          service,
          status,
          created_at,
          metadata,
          error_message,
          track_id
        `).order("created_at", {
        ascending: false
      }).limit(50);
      if (error) throw error;
      const transformedTasks: GenerationTask[] = data?.map(item => ({
        id: item.id,
        prompt: item.prompt,
        service: item.service as 'suno' | 'mureka',
        status: item.status as any,
        error: item.error_message,
        created_at: item.created_at,
        progress: item.status === 'running' ? 50 : item.status === 'completed' ? 100 : 0,
        estimated_time: 120 // 2 minutes default
      })) || [];
      setTasks(transformedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };
  const fetchTracks = async () => {
    if (!user) return;
    try {
      console.log('[AIGenerationStudio] Fetching tracks from database...');

      // Получаем треки с более детальным запросом включая проекты через artists
      const {
        data,
        error
      } = await supabase.from('tracks').select(`
          id,
          title,
          project_id,
          track_number,
          audio_url,
          lyrics,
          duration,
          genre_tags,
          metadata,
          created_at,
          updated_at,
          projects!inner (
            id,
            title,
            artist_id,
            artists!inner (
              id,
              name,
              user_id,
              avatar_url
            )
          )
        `).eq('projects.artists.user_id', user.id).not('audio_url', 'is', null).order('updated_at', {
        ascending: false
      });
      if (error) {
        console.error('[AIGenerationStudio] Error fetching tracks:', error);
        toast({
          title: "Ошибка загрузки треков",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      console.log(`[AIGenerationStudio] Raw tracks data:`, data);
      console.log(`[AIGenerationStudio] Found ${data?.length || 0} tracks for user ${user.id}`);

      // Проверяем на аудио URL
      const tracksWithAudio = data?.filter(track => track.audio_url) || [];
      console.log(`[AIGenerationStudio] Tracks with audio:`, {
        total: data?.length || 0,
        withAudio: tracksWithAudio.length,
        tracks: tracksWithAudio.map(t => ({
          id: t.id,
          title: t.title,
          audio_url: !!t.audio_url
        }))
      });
      const formattedTracks: Track[] = (data || []).map(track => ({
        id: track.id,
        title: track.title,
        project_id: track.project_id,
        track_number: track.track_number,
        audio_url: track.audio_url,
        lyrics: track.lyrics,
        duration: track.duration,
        genre_tags: track.genre_tags || [],
        metadata: track.metadata,
        created_at: track.created_at,
        updated_at: track.updated_at,
        project: track.projects ? {
          title: track.projects.title,
          artist: track.projects.artists ? {
            name: track.projects.artists.name
          } : undefined
        } : undefined
      }));
      setTracks(formattedTracks);
      console.log('[AIGenerationStudio] Tracks loaded and formatted successfully');

      // Показываем уведомление если треки есть
      if (formattedTracks.length > 0) {
        toast({
          title: "Треки загружены",
          description: `Найдено ${formattedTracks.length} треков`
        });
      }
    } catch (error) {
      console.error('[AIGenerationStudio] Unexpected error fetching tracks:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Произошла неожиданная ошибка при загрузке треков",
        variant: "destructive"
      });
    }
  };
  const handleSync = async () => {
    console.log('🔄 Starting manual sync...');
    try {
      // Сначала синхронизируем треки
      const result = await syncTracks();
      console.log('🔄 Sync result:', result);

      // Затем перезагружаем данные  
      await Promise.all([fetchTracks(), fetchTasks()]);
      console.log('✅ Data refresh completed');
      toast({
        title: 'Синхронизация завершена',
        description: 'Список треков обновлен'
      });
    } catch (error) {
      console.error('❌ Sync error:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: `Не удалось обновить список треков: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        variant: 'destructive'
      });
    }
  };
  const filteredTracks = useMemo(() => {
    return tracks.filter(track => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return track.title?.toLowerCase().includes(query) || track.description?.toLowerCase().includes(query) || track.genre_tags?.some(tag => tag.toLowerCase().includes(query)) || track.project?.title?.toLowerCase().includes(query) || track.project?.artist?.name?.toLowerCase().includes(query);
    });
  }, [tracks, searchQuery]);
  const handleGenerate = async (params: GenerationParams) => {
    try {
      await generateTrack(params);
      toast({
        title: t('generationStarted'),
        description: `${params.service === 'suno' ? 'Suno AI' : 'Mureka'} создает ваш трек`
      });

      // Close mobile generation panel
      if (isMobile) {
        setIsGenerationPanelOpen(false);
      }

      // Refresh tasks
      await fetchTasks();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: t('generationError'),
        description: error.message || t('generationErrorDesc'),
        variant: "destructive"
      });
    }
  };
  const handlePlayTrack = (track: Track) => {
    console.log('🎵 handlePlayTrack called with:', {
      id: track.id,
      title: track.title,
      audio_url: track.audio_url
    });
    if (!track.audio_url) {
      console.warn('❌ Cannot play track without audio_url');
      toast({
        title: "Ошибка воспроизведения",
        description: "У этого трека нет аудио файла для воспроизведения",
        variant: "destructive"
      });
      return;
    }
    if (currentPlayingTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentPlayingTrack(track);
      setIsPlaying(true);
    }
    // Close track details drawer when starting playback
    setIsTrackDetailsOpen(false);
  };
  const handlePlayerPlayPause = (playing: boolean) => {
    setIsPlaying(playing);
  };
  const handleTrackClick = (track: Track) => {
    console.log('🔍 handleTrackClick called with:', {
      id: track.id,
      title: track.title
    });
    setSelectedTrack(track);
    setIsTrackDetailsOpen(true);
  };
  const playNextTrack = () => {
    if (!currentPlayingTrack || filteredTracks.length === 0) return;
    const idx = filteredTracks.findIndex(t => t.id === currentPlayingTrack.id);
    if (idx === -1) return;
    const next = filteredTracks[(idx + 1) % filteredTracks.length];
    setCurrentPlayingTrack(next);
    setIsPlaying(true);
  };
  const playPrevTrack = () => {
    if (!currentPlayingTrack || filteredTracks.length === 0) return;
    const idx = filteredTracks.findIndex(t => t.id === currentPlayingTrack.id);
    if (idx === -1) return;
    const prev = filteredTracks[(idx - 1 + filteredTracks.length) % filteredTracks.length];
    setCurrentPlayingTrack(prev);
    setIsPlaying(true);
  };
  const handleCommandAction = (action: string, data?: any) => {
    startTransition(() => {
      switch (action) {
        case 'search':
          setSearchQuery(data?.query || '');
          break;
        case 'generate':
          if (isMobile) {
            setIsGenerationPanelOpen(true);
          }
          break;
        case 'sync':
          handleSync();
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
    });
  };
  if (!user) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">{t('loginRequired')}</h2>
            <p className="text-muted-foreground">
              {t('loginRequiredDesc')}
            </p>
          </CardContent>
        </Card>
      </div>;
  }

  // Mobile Layout
  if (isMobile) {
    return <div className={cn("min-h-screen bg-background animate-fade-in", "pb-mobile-nav", currentPlayingTrack && "pb-[150px]")}>
        {/* Mobile Header */}
        <MobileHeader title="AI Studio" subtitle={`${filteredTracks.length} ${t('tracks')}`} showSearch={true} onSearch={() => startTransition(() => setIsCommandPaletteOpen(true))} showNotifications={false} isOnline={true}>
          {/* Search Bar */}
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('searchTracksPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-0" />
            </div>
            
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className={cn("tap-highlight", showFilters && "bg-primary/10 text-primary")} aria-label={t('filterTracks')}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>

            <Button size="icon" onClick={handleSync} disabled={isSyncing} className="tap-highlight bg-gradient-primary" aria-label={t('syncTracks')}>
              <CloudDownload className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowRecoveryTools(v => !v)} className="tap-highlight" aria-label="Загрузить 2 трека" title="Ручная загрузка последних 2 треков">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </MobileHeader>

        {/* Task Queue */}
        <Suspense fallback={<div className="p-4"><TrackSkeleton animated /></div>}>
          <TaskQueuePanel />
        </Suspense>

        {showRecoveryTools && <div className="p-4">
            <ManualUploadLastTwo />
          </div>}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Generation Progress Skeletons */}
          {ongoingGenerations.length > 0 && <div className="p-4 space-y-3">
              {ongoingGenerations.map(generation => <TrackSkeleton key={generation.taskId} progress={generation.progress} title={generation.taskId} subtitle={generation.service === 'suno' ? 'Suno AI' : 'Mureka'} status={generation.status as any} steps={generation.steps} animated={true} />)}
            </div>}
          
          <TrackResultsGrid tracks={filteredTracks} onTrackClick={handleTrackClick} onPlayTrack={handlePlayTrack} currentPlayingTrack={currentPlayingTrack} isPlaying={isPlaying} isSyncing={isSyncing} onTrackDeleted={fetchTracks} />
        </div>

        {/* Floating Action Button */}
        <Button size="icon" onClick={() => startTransition(() => setIsGenerationPanelOpen(true))} className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-gradient-primary shadow-glow animate-float tap-highlight" aria-label={t('createTrack')}>
          <Plus className="h-6 w-6" />
        </Button>

        {/* Generation Panel Sheet */}
        <Sheet open={isGenerationPanelOpen} onOpenChange={open => startTransition(() => setIsGenerationPanelOpen(open))}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-xl border-0 p-0 animate-slide-in-bottom">
            <div className="h-full overflow-y-auto">
              <div className="p-4 border-b border-border">
                <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-center">{t('createTrack')}</h2>
              </div>
              
              <div className="p-4">
                <Suspense fallback={<div className="p-4">Loading...</div>}>
                  <GenerationContextPanel projects={projects} artists={artists} onGenerate={handleGenerate} />
                </Suspense>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Track Details Drawer */}
        <TrackDetailsDrawer track={selectedTrack} isOpen={isTrackDetailsOpen} onClose={() => startTransition(() => setIsTrackDetailsOpen(false))} onPlay={handlePlayTrack} />

        {/* Command Palette */}
        <Suspense fallback={null}>
          <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => startTransition(() => setIsCommandPaletteOpen(false))} onAction={handleCommandAction} tracks={tracks} projects={projects} artists={artists} />
        </Suspense>

        {/* Floating Player */}
        {currentPlayingTrack && <Suspense fallback={null}>
            <FloatingPlayer track={currentPlayingTrack} isOpen={true} playing={isPlaying} onClose={() => startTransition(() => setCurrentPlayingTrack(null))} onPlayPause={handlePlayerPlayPause} onPrev={playPrevTrack} onNext={playNextTrack} />
          </Suspense>}

        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>;
  }

  // Desktop Layout (using proper sidebar layout)
  return <div className="h-screen bg-background text-foreground flex animate-fade-in">
      {/* Context Panel - adapts to sidebar state */}
      <div className={cn("bg-card border-r border-border flex flex-col glass transition-all duration-200 relative", sidebarCollapsed ? "w-64 xl:w-72" : "w-80")}>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
          <Suspense fallback={<div className="animate-pulse h-96 bg-muted rounded-md" />}>
            <GenerationContextPanel projects={projects} artists={artists} onGenerate={handleGenerate} />
          </Suspense>
        </div>
      </div>

      {/* Main Content - adapts to sidebar and context panel */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-surface">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('searchTracks')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-0 focus:ring-2 focus:ring-primary/50" />
              </div>
              <Button size="sm" variant="outline" onClick={() => startTransition(() => setIsCommandPaletteOpen(true))} className="flex items-center gap-2 hover-lift">
                <Command className="h-4 w-4" />
                <span className="hidden md:inline">Команды</span>
                <Badge variant="secondary" className="text-xs">⌘K</Badge>
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={handleSync} disabled={isSyncing} className="flex items-center gap-2 hover-lift">
                <CloudDownload className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                {isSyncing ? 'Синхронизация...' : 'Синхронизация'}
              </Button>
              
              <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary">
                {filteredTracks.length} треков
              </Badge>
            </div>
          </div>
        </div>

        {/* Task Queue */}
        <Suspense fallback={<div className="p-4"><TrackSkeleton animated /></div>}>
          <TaskQueuePanel />
        </Suspense>

        <Separator />

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-slim">
          {/* Generation Progress Skeletons */}
          {ongoingGenerations.length > 0 && <div className="p-4 space-y-3 bg-muted/20 border-b border-border">
              {ongoingGenerations.map(generation => <TrackSkeleton key={generation.taskId} progress={generation.progress} title={generation.title} subtitle={generation.service === 'suno' ? 'Suno AI' : 'Mureka'} status={generation.status as any} steps={generation.steps} animated={true} />)}
            </div>}
          
          <TrackResultsGrid tracks={filteredTracks} onTrackClick={handleTrackClick} onPlayTrack={handlePlayTrack} currentPlayingTrack={currentPlayingTrack} isPlaying={isPlaying} isSyncing={isSyncing} onTrackDeleted={fetchTracks} />
        </div>
      </div>

      {/* Right Drawer - Track Details */}
      <TrackDetailsDrawer track={selectedTrack} isOpen={isTrackDetailsOpen} onClose={() => startTransition(() => setIsTrackDetailsOpen(false))} onPlay={handlePlayTrack} />

      {/* Command Palette */}
      <Suspense fallback={null}>
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => startTransition(() => setIsCommandPaletteOpen(false))} onAction={handleCommandAction} tracks={tracks} projects={projects} artists={artists} />
      </Suspense>

      {/* Floating Player */}
      {currentPlayingTrack && <Suspense fallback={null}>
          <FloatingPlayer track={currentPlayingTrack} isOpen={true} playing={isPlaying} onClose={() => startTransition(() => setCurrentPlayingTrack(null))} onPlayPause={handlePlayerPlayPause} onPrev={playPrevTrack} onNext={playNextTrack} />
        </Suspense>}
    </div>;
}