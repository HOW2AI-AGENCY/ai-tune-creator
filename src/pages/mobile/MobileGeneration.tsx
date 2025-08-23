import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTracks } from "@/hooks/data/useTracks";
import { TelegramGenerationForm } from "@/components/mobile/TelegramGenerationForm";
import { TelegramMobilePlayer } from "@/components/mobile/TelegramMobilePlayer";
import { TelegramPageLayout, TelegramSection } from "@/components/mobile/TelegramPageLayout";
import { TelegramNativeButton } from "@/components/mobile/TelegramNativeButton";
import { EnhancedMobileCard } from "@/components/mobile/EnhancedMobileCard";
import { MobileHeader } from "@/components/mobile/MobileHeader";
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
    <div className="flex flex-col h-full bg-[--tg-theme-bg-color]">
      <MobileHeader
        title="AI Studio"
        subtitle={`${generatedTracks.length} треков`}
        className="h-auto py-2"
      >
        <div className="flex justify-end pt-2">
          <button 
            onClick={handleNewGeneration}
            className="w-8 h-8 rounded-full bg-[--tg-button-color] text-[--tg-button-text-color] flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </MobileHeader>

      {/* Track List */}
      <div className="flex-1 overflow-auto">
        {tracksLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-lg bg-[--tg-button-color]/20 flex items-center justify-center mb-4">
                <Music className="h-6 w-6 text-[--tg-button-color] animate-pulse" />
              </div>
              <h3 className="font-medium mb-2 text-[--tg-text]">Загружаем ваши треки...</h3>
              <p className="text-sm text-[--tg-hint] mb-4">
                Подождите, идет загрузка музыкальной библиотеки
              </p>
            </div>
          </div>
        ) : generatedTracks.length > 0 ? (
          <div className="divide-y divide-[--tg-separator-color]">
            {generatedTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-4 tap-highlight active:bg-[--tg-theme-secondary-bg-color]/50 transition-colors"
                onClick={() => handleTrackSelect(track)}
              >
                {/* Track Icon */}
                <div className="w-12 h-12 rounded-lg bg-[--tg-button-color] flex items-center justify-center flex-shrink-0">
                  <Music className="h-6 w-6 text-[--tg-button-text-color]" />
                </div>
                
                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[--tg-text] truncate text-sm leading-tight">
                    {track.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-[--tg-hint] mt-1">
                    <span>AI Generated</span>
                    <span>•</span>
                    <span>Inbox</span>
                    <span>•</span>
                    <span>
                      {Math.floor((track.duration || 0) / 60)}:{((track.duration || 0) % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    className="w-8 h-8 rounded-full bg-[--tg-button-color] text-[--tg-button-text-color] flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrackSelect(track);
                    }}
                  >
                    <div className="w-0 h-0 border-l-[3px] border-l-current border-y-[2px] border-y-transparent ml-0.5" />
                  </button>
                  <button 
                    className="w-8 h-8 rounded-full text-[--tg-hint] flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(track);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-lg bg-[--tg-button-color]/20 flex items-center justify-center mb-4">
                <Music className="h-6 w-6 text-[--tg-button-color]" />
              </div>
              <h3 className="font-medium mb-2 text-[--tg-text]">Нет треков</h3>
              <p className="text-sm text-[--tg-hint] mb-4">
                Создайте свой первый трек с помощью ИИ
              </p>
              <button 
                onClick={handleNewGeneration}
                className="bg-[--tg-button-color] text-[--tg-button-text-color] px-6 py-2 rounded-lg text-sm font-medium"
              >
                Создать трек
              </button>
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
    </div>
  );
}