import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTracks } from "@/hooks/data/useTracks";
import { TelegramGenerationForm } from "@/components/mobile/TelegramGenerationForm";
import { TelegramMobilePlayer } from "@/components/mobile/TelegramMobilePlayer";
import { TelegramPageLayout, TelegramSection } from "@/components/mobile/TelegramPageLayout";
import { TelegramNativeButton } from "@/components/mobile/TelegramNativeButton";
import { EnhancedMobileCard } from "@/components/mobile/EnhancedMobileCard";
import { useTelegramWebApp, useTelegramHaptics } from "@/hooks/useTelegramWebApp";
import { useTelegramTheme } from "@/hooks/useTelegramTheme";
import { useTelegramShare } from "@/hooks/useTelegramShare";
import { TelegramGenerationProgress } from "@/components/mobile/TelegramGenerationProgress";
import { useUnifiedGeneration } from "@/features/ai-generation/hooks/useUnifiedGeneration";
import { Wand2, Music, ArrowLeft, Plus, Share2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationFormData {
  prompt: string;
  lyrics?: string;
  title?: string;
  genre: string;
  mood: string;
  duration: number;
  tempo: number;
  instrumental: boolean;
  language: string;
  voice_style?: string;
  tags: string[];
}

interface TrackData {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  lyrics?: string;
  project?: {
    title: string;
    artist?: {
      name: string;
      avatar_url?: string;
    };
  };
}

export default function MobileGeneration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isInTelegram } = useTelegramWebApp();
  const { notificationFeedback, impactFeedback } = useTelegramHaptics();
  const { shareTrackToTelegram, copyShareLink, canShareToTelegram } = useTelegramShare();
  
  // Apply Telegram theme
  useTelegramTheme();
  const { generateTrack, activeGenerations } = useUnifiedGeneration();
  const { tracks: userTracks = [], isLoading: tracksLoading, refetch: refreshTracks } = useTracks();

  const [currentTrack, setCurrentTrack] = useState<TrackData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // Use actual user tracks instead of local state
  const generatedTracks = userTracks;

  const isGenerating = activeGenerations.size > 0;
  const generationProgress = Array.from(activeGenerations.values())[0]?.overallProgress || 0;

  const handleGenerate = async (formData: GenerationFormData) => {
    if (!user) {
      toast({
        title: "Authentication required", 
        description: "Please sign in to generate music",
        variant: "destructive"
      });
      return;
    }

    try {
      impactFeedback?.('medium');
      
      const result = await generateTrack({
        service: 'suno',
        description: formData.prompt,
        lyrics: formData.lyrics,
        tags: formData.tags,
        flags: {
          instrumental: formData.instrumental,
          language: formData.language,
          voiceStyle: formData.voice_style,
          duration: formData.duration,
        },
        mode: 'quick',
        inputType: formData.lyrics ? 'lyrics' : 'description',
        context: {
          useInbox: true,
        },
      });

      if (result) {
        setShowForm(false);
        
        notificationFeedback?.('success');
        toast({
          title: "Генерация запущена!",
          description: "Трек создается с помощью ИИ. Он появится в списке после завершения.",
        });
        
        // Refresh tracks to show any completed generations
        setTimeout(() => {
          refreshTracks();
        }, 2000);
      }

    } catch (error) {
      console.error('Generation error:', error);
      notificationFeedback?.('error');
      toast({
        title: "Generation failed", 
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handlePlayPause = (playing: boolean) => {
    setIsPlaying(playing);
    impactFeedback?.('light');
  };

  const handleTrackSelect = (track: TrackData) => {
    setCurrentTrack(track);
    setIsPlaying(false);
    impactFeedback?.('light');
  };

  const handleShare = async (track: TrackData) => {
    impactFeedback?.('medium');
    
    if (canShareToTelegram) {
      await shareTrackToTelegram({ track });
    } else {
      await copyShareLink(track);
    }
  };

  const handleDownload = (track: TrackData) => {
    if (track.audio_url) {
      window.open(track.audio_url, '_blank');
    }
    impactFeedback?.('medium');
  };

  const handleCancel = () => {
    setShowForm(true);
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  const handleNewGeneration = () => {
    setShowForm(true);
    setCurrentTrack(null);
    setIsPlaying(false);
    impactFeedback?.('medium');
  };

  if (!user) {
    return (
      <TelegramPageLayout>
        <TelegramSection className="flex-1 flex items-center justify-center">
          <EnhancedMobileCard variant="telegram" className="p-6 text-center max-w-sm">
            <Music className="h-12 w-12 mx-auto mb-4 text-[--tg-hint]" />
            <h2 className="text-lg font-semibold mb-2 text-[--tg-text]">Sign in required</h2>
            <p className="text-[--tg-hint] mb-4">
              Please sign in to start generating music with AI
            </p>
          </EnhancedMobileCard>
        </TelegramSection>
      </TelegramPageLayout>
    );
  }

  // Show enhanced Telegram progress overlay
  if (isGenerating) {
    return (
      <TelegramPageLayout fullscreen>
        <TelegramGenerationProgress
          isActive={isGenerating}
          onCancel={() => {
            toast({
              title: "Generation cancelled",
              description: "Music creation was stopped",
              variant: "default"
            });
          }}
          onComplete={() => {
            setShowForm(false);
            refreshTracks();
          }}
        />
      </TelegramPageLayout>
    );
  }

  if (showForm) {
    return (
      <TelegramPageLayout>
        <TelegramGenerationForm
          onGenerate={handleGenerate}
          onCancel={() => {}}
          isGenerating={isGenerating}
        />
      </TelegramPageLayout>
    );
  }

  return (
    <TelegramPageLayout>
      {/* Enhanced Telegram Header */}
      <TelegramSection padding="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isInTelegram && (
              <TelegramNativeButton
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-9 w-9 p-0 rounded-full"
                hapticFeedback="light"
              >
                <ArrowLeft className="h-4 w-4" />
              </TelegramNativeButton>
            )}
            <div>
              <h1 className="text-lg font-semibold text-[--tg-text]">Generated Music</h1>
              <p className="text-sm text-[--tg-hint]">
                {generatedTracks.length} track{generatedTracks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <TelegramNativeButton
            onClick={handleNewGeneration}
            size="sm"
            className="gap-2"
            hapticFeedback="medium"
          >
            <Wand2 className="h-4 w-4" />
            New
          </TelegramNativeButton>
        </div>
      </TelegramSection>

      {/* Track List */}
      <div className="flex-1 overflow-auto scrollbar-hide">
        {tracksLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="relative mb-4">
                <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Music className="h-6 w-6 text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="font-medium mb-2">Загружаем ваши треки...</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Подождите, идет загрузка музыкальной библиотеки
              </p>
              <div className="w-16 h-1 bg-secondary rounded-full mx-auto overflow-hidden">
                <div className="w-full h-full bg-primary rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        ) : generatedTracks.length > 0 ? (
          <div className="divide-y divide-border/50">
            {generatedTracks.map((track) => (
              <div
                key={track.id}
                className={cn(
                  "flex items-center gap-3 py-3 px-4 tap-highlight",
                  "active:bg-muted/50 transition-colors",
                  currentTrack?.id === track.id && "bg-primary/5 border-l-2 border-l-primary"
                )}
                onClick={() => handleTrackSelect(track)}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{track.title}</h3>
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <span className="truncate">
                       AI Composer
                     </span>
                     <span>•</span>
                     <span>
                       {Math.floor((track.duration || 0) / 60)}:{((track.duration || 0) % 60).toString().padStart(2, '0')}
                     </span>
                   </div>
                </div>

                {currentTrack?.id === track.id && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-primary">Playing</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="relative mb-4">
                <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Music className="h-6 w-6 text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="font-medium mb-2">Загружаем ваши треки...</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Подождите, идет загрузка музыкальной библиотеки
              </p>
              <div className="w-16 h-1 bg-secondary rounded-full mx-auto overflow-hidden">
                <div className="w-full h-full bg-primary rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Player */}
      {currentTrack && (
        <TelegramMobilePlayer
          track={currentTrack}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onShare={handleShare}
          onDownload={handleDownload}
          onShowLyrics={() => {}}
          playlist={generatedTracks}
          currentIndex={generatedTracks.findIndex(t => t.id === currentTrack.id)}
          onNext={() => {
            const currentIndex = generatedTracks.findIndex(t => t.id === currentTrack.id);
            const nextTrack = generatedTracks[currentIndex + 1];
            if (nextTrack) {
              setCurrentTrack(nextTrack);
              setIsPlaying(false);
            }
          }}
          onPrev={() => {
            const currentIndex = generatedTracks.findIndex(t => t.id === currentTrack.id);
            const prevTrack = generatedTracks[currentIndex - 1];
            if (prevTrack) {
              setCurrentTrack(prevTrack);
              setIsPlaying(false);
            }
          }}
        />
      )}
    </TelegramPageLayout>
  );
}