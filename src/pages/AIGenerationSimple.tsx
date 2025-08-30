import { useState } from "react";
import { ResizableSidebar } from "@/components/ui/resizable-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { TrackGenerationSidebar } from "@/features/ai-generation/components/TrackGenerationSidebar";
import { TrackLibrary } from "@/components/tracks/TrackLibrary";
import { LyricsDrawer } from "@/features/ai-generation/components/LyricsDrawer";
import { useTrackGenerationWithProgress } from "@/features/ai-generation/hooks/useTrackGenerationWithProgress";
import { useTrackSync } from "@/hooks/useTrackSync";
import { lazy, Suspense } from "react";
const FloatingPlayer = lazy(() => import("@/features/ai-generation/components/FloatingPlayer").then(m => ({ default: m.FloatingPlayer })));
import { 
  Search, 
  Music,
  Sparkles,
  CloudDownload
} from "lucide-react";
import { GenerationParams } from "@/features/ai-generation/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

interface Option {
  id: string;
  name: string;
}

export default function AIGenerationSimple() {
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [projects] = useState<Option[]>([]);
  const [artists] = useState<Option[]>([]);
  
  // Player & Lyrics state
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isLyricsDrawerOpen, setIsLyricsDrawerOpen] = useState(false);
  
  // Generation error state
  const [generationError, setGenerationError] = useState<{
    type: 'network' | 'api' | 'validation' | 'unknown';
    message: string;
    details?: string;
    code?: string;
  } | null>(null);
  
  // Hooks
  const { generateTrack, isGenerating, generationProgress } = useTrackGenerationWithProgress();
  const { isSyncing, syncTracks, lastSyncResults } = useTrackSync();

  // Handlers
  const handleGenerate = async (params: GenerationParams) => {
    try {
      setGenerationError(null);
      await generateTrack(params);
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

  const handleTrackClick = (track: Track | undefined) => {
    if (!track) return;
    setSelectedTrack(track);
    setIsLyricsDrawerOpen(true);
  };

  const handlePlayTrack = (track: Track | undefined) => {
    if (!track) return;
    setSelectedTrack(track);
    setIsPlayerOpen(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Войдите в систему</h2>
            <p className="text-muted-foreground">
              Для работы с ИИ генерацией необходимо войти в систему
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
          isGenerating={isGenerating}
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
                Сгенерированные треки с аудио
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
                Треки
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

        {/* Библиотека треков */}
        <div className="flex-1 overflow-y-auto p-6">
          <TrackLibrary
            searchQuery={searchQuery}
            onPlayTrack={handlePlayTrack}
            onSelectTrack={handleTrackClick}
          />
        </div>
      </div>

      {/* Lyrics Drawer */}
      <LyricsDrawer
        isOpen={isLyricsDrawerOpen}
        onClose={() => setIsLyricsDrawerOpen(false)}
        track={selectedTrack}
      />

      {/* Floating Player */}
      <Suspense fallback={null}>
        <FloatingPlayer
          isOpen={isPlayerOpen}
          track={selectedTrack}
          onClose={() => setIsPlayerOpen(false)}
        />
      </Suspense>
    </div>
  );
}