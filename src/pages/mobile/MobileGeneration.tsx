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
import { Wand2, Music, ArrowLeft, Plus, Share2, Download, Heart, MoreHorizontal, Search, Filter, Clock } from "lucide-react";
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
  const { tracks: userTracks = [], isLoading: tracksLoading, isFetching: tracksFetching, refetch: refreshTracks } = useTracks();

  const [currentTrack, setCurrentTrack] = useState<TrackData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // Refresh tracks when background downloads complete
  useEffect(() => {
    const handler = () => refreshTracks();
    window.addEventListener('tracks-updated', handler as EventListener);
    return () => window.removeEventListener('tracks-updated', handler as EventListener);
  }, [refreshTracks]);

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
      window.open(track.audio_url, '_blank', 'noopener,noreferrer');
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
    <div className="flex flex-col h-full bg-[--tg-theme-bg-color] relative">
      <MobileHeader
        title="Generate Music"
        subtitle="Create amazing music with AI"
        className="border-b border-[--tg-separator-color]"
      />

      {/* Search Bar */}
      <div className="p-3 bg-[--tg-theme-bg-color] border-b border-[--tg-separator-color]">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[--tg-hint]" />
            <input
              type="text"
              placeholder="Поиск треков..."
              className="w-full pl-10 pr-4 py-2 bg-[--tg-theme-secondary-bg-color] text-[--tg-text] placeholder-[--tg-hint] rounded-lg border-0 focus:outline-none text-sm"
            />
          </div>
          <button className="w-9 h-9 bg-[--tg-button-color] text-[--tg-button-text-color] rounded-lg flex items-center justify-center">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-auto">
        {(tracksLoading || tracksFetching) ? (
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
          <div className="p-2">
            {generatedTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-2 p-3 mb-2 bg-[--tg-theme-secondary-bg-color] rounded-lg tap-highlight active:opacity-80 transition-opacity"
                onClick={() => handleTrackSelect(track)}
              >
                {/* Track Icon */}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Music className="h-5 w-5 text-white" />
                </div>
                
                {/* Track Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-medium text-[--tg-text] truncate text-sm leading-tight mb-0.5">
                    {track.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-[--tg-hint] truncate">
                    <span className="truncate">DIGGY</span>
                    <span>•</span>
                    <span className="truncate">Inbox</span>
                    <span>•</span>
                    <span className="flex-shrink-0">
                      {Math.floor((track.duration || 0) / 60)}:{((track.duration || 0) % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button 
                    className="w-7 h-7 rounded-full text-[--tg-hint] hover:text-red-500 flex items-center justify-center transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    className="w-7 h-7 rounded-full bg-[--tg-button-color] text-[--tg-button-text-color] flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrackSelect(track);
                    }}
                  >
                    <div className="w-0 h-0 border-l-[3px] border-l-current border-y-[2px] border-y-transparent ml-0.5" />
                  </button>
                  <button 
                    className="w-7 h-7 rounded-full text-[--tg-hint] flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
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

      {/* Floating Action Button */}
      <button
        onClick={handleNewGeneration}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 tap-highlight active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

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