import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Music, Sparkles, RefreshCw, Command, Plus } from "lucide-react";
import { useTrackSync } from "@/hooks/useTrackSync";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useTranslation } from "@/hooks/useTranslation";
import { TrackSkeleton } from "@/components/ui/track-skeleton";
import { GenerationInterface } from "@/components/ai-generation/GenerationInterface";
import { ProductionTrackGrid } from "@/components/ai-generation/ProductionTrackGrid";
import { useCleanGeneration } from "@/hooks/useCleanGeneration";
import { TrackDetailsDrawer } from "@/features/ai-generation/components/TrackDetailsDrawer";
import { CommandPalette } from "@/features/ai-generation/components/CommandPalette";
import { FloatingPlayer } from "@/features/ai-generation/components/FloatingPlayer";

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
}

interface Option {
  id: string;
  name: string;
}

export default function AIGenerationStudio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { state: sidebarState } = useSidebar();

  // Use clean generation hook
  const {
    tracks,
    activeGenerations,
    loading,
    generateTrack,
    deleteTrack,
    playTrack,
    currentTrack,
    isPlaying
  } = useCleanGeneration();

  // Check sidebar actual state
  const sidebarCollapsed = sidebarState === "collapsed";

  // Core State
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<Option[]>([]);
  const [artists, setArtists] = useState<Option[]>([]);

  // UI State
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isTrackDetailsOpen, setIsTrackDetailsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGenerationPanelOpen, setIsGenerationPanelOpen] = useState(false);

  // Sync Hook
  const { isSyncing, syncTracks } = useTrackSync();

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

  const handleSync = async () => {
    console.log('🔄 Starting manual sync...');
    try {
      const result = await syncTracks();
      console.log('🔄 Sync result:', result);
      
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
      return track.title?.toLowerCase().includes(query) || 
             track.lyrics?.toLowerCase().includes(query) || 
             track.genre_tags?.some(tag => tag.toLowerCase().includes(query));
    });
  }, [tracks, searchQuery]);

  const handleGenerate = async (prompt: string, service: 'suno' | 'mureka') => {
    await generateTrack(prompt, service);
    
    // Close mobile generation panel
    if (isMobile) {
      setIsGenerationPanelOpen(false);
    }
  };

  const handlePlayTrack = (track: Track) => {
    playTrack(track);
    setIsTrackDetailsOpen(false);
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
    if (!currentTrack || filteredTracks.length === 0) return;
    const idx = filteredTracks.findIndex(t => t.id === currentTrack.id);
    if (idx === -1) return;
    const next = filteredTracks[(idx + 1) % filteredTracks.length];
    playTrack(next);
  };
  
  const playPrevTrack = () => {
    if (!currentTrack || filteredTracks.length === 0) return;
    const idx = filteredTracks.findIndex(t => t.id === currentTrack.id);
    if (idx === -1) return;
    const prev = filteredTracks[(idx - 1 + filteredTracks.length) % filteredTracks.length];
    playTrack(prev);
  };

  const handleCommandAction = (action: string, data?: any) => {
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
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">{t('loginRequired')}</h2>
            <p className="text-muted-foreground">
              {t('loginRequiredDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className={cn("min-h-screen bg-background animate-fade-in", "pb-mobile-nav", currentTrack && "pb-[150px]")}>
        {/* Mobile Header */}
        <MobileHeader 
          title="AI Studio" 
          subtitle={`${filteredTracks.length} ${t('tracks')}`} 
          showSearch={true} 
          onSearch={() => setIsCommandPaletteOpen(true)} 
          showNotifications={false} 
          isOnline={true}
        >
          {/* Search Bar */}
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t('searchTracksPlaceholder')} 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-10 bg-muted/50 border-0" 
              />
            </div>
            
            <Button 
              size="icon" 
              onClick={handleSync} 
              disabled={isSyncing} 
              className="tap-highlight bg-gradient-primary" 
              aria-label={t('syncTracks')}
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </Button>
          </div>
        </MobileHeader>

        {/* Active Generations */}
        {activeGenerations.length > 0 && (
          <div className="px-4 py-2">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Генерация треков</h3>
                <div className="space-y-2">
                  {activeGenerations.map((gen) => (
                    <div key={gen.taskId} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{gen.service === 'suno' ? 'Suno AI' : 'Mureka'}</div>
                        <div className="text-xs text-muted-foreground">{gen.status}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{gen.progress}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tracks Grid */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <TrackSkeleton key={i} />
              ))}
            </div>
          ) : filteredTracks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">{t('noTracksYet')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('createFirstTrack')}
                </p>
                <Button onClick={() => setIsGenerationPanelOpen(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t('startGenerating')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <ProductionTrackGrid 
                tracks={filteredTracks} 
                currentTrack={currentTrack} 
                isPlaying={isPlaying} 
                onTrackClick={handleTrackClick} 
                onPlayTrack={handlePlayTrack} 
                onDeleteTrack={deleteTrack}
              />
            </div>
          )}
        </div>

        {/* Generation Panel Sheet */}
        <Sheet open={isGenerationPanelOpen} onOpenChange={setIsGenerationPanelOpen}>
          <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-xl border-t">
            <div className="h-full overflow-hidden">
              <GenerationInterface onGenerate={handleGenerate} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Floating Action Button */}
        <Button 
          size="icon" 
          onClick={() => setIsGenerationPanelOpen(true)} 
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-gradient-primary shadow-lg" 
          aria-label={t('createTrack')}
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Floating Player */}
        {currentTrack && (
          <FloatingPlayer 
            track={currentTrack} 
            isPlaying={isPlaying} 
            onPlayPause={() => playTrack(currentTrack)} 
            onNext={playNextTrack} 
            onPrev={playPrevTrack} 
          />
        )}

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Command Palette */}
        <CommandPalette 
          open={isCommandPaletteOpen} 
          onOpenChange={setIsCommandPaletteOpen} 
          tracks={filteredTracks} 
          onAction={handleCommandAction} 
        />

        {/* Track Details Drawer */}
        <TrackDetailsDrawer 
          track={selectedTrack} 
          open={isTrackDetailsOpen} 
          onOpenChange={setIsTrackDetailsOpen} 
          onPlay={handlePlayTrack}
          onEdit={track => console.log('Edit track:', track)} 
          onDownload={track => {
            if (track.audio_url) {
              const link = document.createElement('a');
              link.href = track.audio_url;
              link.download = `${track.title}.mp3`;
              link.click();
            }
          }} 
          onDelete={track => {
            deleteTrack(track.id);
            setIsTrackDetailsOpen(false);
          }}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="h-screen bg-background flex">
      <div className="flex-1 flex">
        {/* Generation Form/Panel */}
        <div className={cn("transition-all duration-300", sidebarCollapsed ? "w-full px-6" : "w-2/3")}>
          {sidebarCollapsed ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <Button onClick={() => setIsGenerationPanelOpen(true)} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Создать трек
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full">
              <GenerationInterface onGenerate={handleGenerate} />
            </div>
          )}
        </div>

        {/* Tracks Panel */}
        <div className={cn("flex-1 overflow-hidden transition-all duration-300", sidebarCollapsed ? "px-6" : "pl-6")}>
          <div className="h-full flex flex-col">
            {/* Header with Search */}
            <div className="flex-shrink-0 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold">{t('tracks')}</h2>
                  <Badge variant="secondary" className="gap-1">
                    <Music className="h-3 w-3" />
                    {filteredTracks.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsCommandPaletteOpen(true)} 
                    className="gap-2"
                  >
                    <Command className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('search')}</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSync} 
                    disabled={isSyncing} 
                    className="gap-2"
                  >
                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                    <span className="hidden sm:inline">
                      {isSyncing ? t('syncing') : t('sync')}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t('searchTracksPlaceholder')} 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-10" 
                />
              </div>
            </div>

            {/* Active Generations */}
            {activeGenerations.length > 0 && (
              <div className="flex-shrink-0 mb-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-3">Активная генерация</h3>
                    <div className="space-y-2">
                      {activeGenerations.map((gen) => (
                        <div key={gen.taskId} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{gen.service === 'suno' ? 'Suno AI' : 'Mureka'}</div>
                            <div className="text-xs text-muted-foreground">{gen.status}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">{gen.progress}%</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tracks Grid */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
                  {[...Array(8)].map((_, i) => (
                    <TrackSkeleton key={i} />
                  ))}
                </div>
              ) : filteredTracks.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <Card className="max-w-md w-full text-center">
                    <CardContent className="py-12">
                      <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">{t('noTracksYet')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('createFirstTrack')}
                      </p>
                      <Button onClick={() => setIsGenerationPanelOpen(true)} className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        {t('startGenerating')}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
                  <ProductionTrackGrid 
                    tracks={filteredTracks} 
                    currentTrack={currentTrack} 
                    isPlaying={isPlaying} 
                    onTrackClick={handleTrackClick} 
                    onPlayTrack={handlePlayTrack} 
                    onDeleteTrack={deleteTrack}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generation Panel Sheet for collapsed sidebar */}
      {sidebarCollapsed && (
        <Sheet open={isGenerationPanelOpen} onOpenChange={setIsGenerationPanelOpen}>
          <SheetContent side="right" className="w-full sm:w-[500px] p-0">
            <div className="h-full overflow-hidden">
              <GenerationInterface onGenerate={handleGenerate} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Floating Player */}
      {currentTrack && (
        <FloatingPlayer 
          track={currentTrack} 
          isPlaying={isPlaying} 
          onPlayPause={() => playTrack(currentTrack)} 
          onNext={playNextTrack} 
          onPrev={playPrevTrack} 
        />
      )}

      {/* Command Palette */}
      <CommandPalette 
        open={isCommandPaletteOpen} 
        onOpenChange={setIsCommandPaletteOpen} 
        tracks={filteredTracks} 
        onAction={handleCommandAction} 
      />

      {/* Track Details Drawer */}
      <TrackDetailsDrawer 
        track={selectedTrack} 
        open={isTrackDetailsOpen} 
        onOpenChange={setIsTrackDetailsOpen} 
        onPlay={handlePlayTrack}
        onEdit={track => console.log('Edit track:', track)} 
        onDownload={track => {
          if (track.audio_url) {
            const link = document.createElement('a');
            link.href = track.audio_url;
            link.download = `${track.title}.mp3`;
            link.click();
          }
        }} 
        onDelete={track => {
          deleteTrack(track.id);
          setIsTrackDetailsOpen(false);
        }}
      />
    </div>
  );
}