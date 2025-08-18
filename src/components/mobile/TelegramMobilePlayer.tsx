import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTrackActions } from "@/hooks/useTrackActions";
import { useTelegramWebApp, useTelegramMainButton, useTelegramBackButton } from "@/hooks/useTelegramWebApp";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Repeat,
  Shuffle,
  Share2,
  Download,
  MoreHorizontal,
  Lyrics
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Track {
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

interface TelegramMobilePlayerProps {
  track: Track | null;
  isPlaying?: boolean;
  onPlayPause?: (playing: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onShare?: (track: Track) => void;
  onDownload?: (track: Track) => void;
  onShowLyrics?: (track: Track) => void;
  onClose?: () => void;
  playlist?: Track[];
  currentIndex?: number;
}

export function TelegramMobilePlayer({
  track,
  isPlaying = false,
  onPlayPause,
  onPrev,
  onNext,
  onShare,
  onDownload,
  onShowLyrics,
  onClose,
  playlist = [],
  currentIndex = 0
}: TelegramMobilePlayerProps) {
  const { isInTelegram, colorScheme } = useTelegramWebApp();
  const { showMainButton, hideMainButton } = useTelegramMainButton();
  const { showBackButton, hideBackButton } = useTelegramBackButton();
  const { likeTrack, unlikeTrack, isLiked } = useTrackActions();
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Telegram button integration
  useEffect(() => {
    if (isInTelegram && track) {
      if (isPlaying) {
        showMainButton("Пауза", () => onPlayPause?.(false));
      } else {
        showMainButton("Играть", () => onPlayPause?.(true));
      }

      showBackButton(() => {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose?.();
        }
      });

      return () => {
        hideMainButton();
        hideBackButton();
      };
    }
  }, [isInTelegram, track, isPlaying, isExpanded, showMainButton, hideMainButton, showBackButton, hideBackButton, onPlayPause, onClose]);

  // Audio handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.audio_url) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [track]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const toggleLike = () => {
    if (!track) return;
    if (isLiked(track.id)) {
      unlikeTrack(track.id);
    } else {
      likeTrack(track.id);
    }
  };

  if (!track) return null;

  const artistName = track.project?.artist?.name || 'Unknown Artist';
  const artistAvatar = track.project?.artist?.avatar_url;
  const hasNextTrack = currentIndex < playlist.length - 1;
  const hasPrevTrack = currentIndex > 0;

  // Compact player (bottom bar)
  if (!isExpanded) {
    return (
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card border-t border-border",
        "animate-slide-up",
        isInTelegram && "pb-safe-area-inset-bottom"
      )}>
        <audio ref={audioRef} src={track.audio_url} />
        
        <div className="p-3">
          <div className="flex items-center gap-3">
            {/* Track Info */}
            <div 
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => setIsExpanded(true)}
            >
              <Avatar className="h-10 w-10 rounded-lg">
                <AvatarImage src={artistAvatar} />
                <AvatarFallback className="rounded-lg bg-primary/10">
                  {artistName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{track.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{artistName}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleLike}
                className="h-8 w-8 p-0"
              >
                <Heart className={cn(
                  "h-4 w-4",
                  isLiked(track.id) && "fill-red-500 text-red-500"
                )} />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPlayPause?.(!isPlaying)}
                className="h-8 w-8 p-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full h-1"
            />
          </div>
        </div>
      </div>
    );
  }

  // Expanded player (full screen)
  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background",
      "flex flex-col",
      isInTelegram && "pt-safe-area-inset-top pb-safe-area-inset-bottom"
    )}>
      <audio ref={audioRef} src={track.audio_url} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="h-8 w-8 p-0"
        >
          <Lyrics className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <p className="text-sm font-medium">Now Playing</p>
          <p className="text-xs text-muted-foreground">
            {currentIndex + 1} of {playlist.length}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {}}
          className="h-8 w-8 p-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Album Art */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          <div className={cn(
            "w-80 h-80 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5",
            "flex items-center justify-center shadow-xl",
            "border border-border/20"
          )}>
            {artistAvatar ? (
              <img 
                src={artistAvatar} 
                alt={track.title}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className="text-6xl text-muted-foreground">🎵</div>
            )}
          </div>
          
          {/* Vinyl effect for playing state */}
          {isPlaying && (
            <div className="absolute inset-0 rounded-2xl bg-black/10 animate-pulse" />
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className="px-6 pb-4">
        <h1 className="text-2xl font-bold text-center mb-2">{track.title}</h1>
        <p className="text-lg text-muted-foreground text-center mb-4">{artistName}</p>
        
        {/* Genre/Project badges */}
        <div className="flex justify-center gap-2 mb-6">
          {track.project?.title && (
            <Badge variant="secondary" className="text-xs">
              {track.project.title}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 pb-4">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="w-full mb-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setIsShuffle(!isShuffle)}
            className={cn(
              "h-12 w-12 p-0",
              isShuffle && "text-primary"
            )}
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onPrev}
            disabled={!hasPrevTrack}
            className="h-12 w-12 p-0"
          >
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            size="lg"
            onClick={() => onPlayPause?.(!isPlaying)}
            className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onNext}
            disabled={!hasNextTrack}
            className="h-12 w-12 p-0"
          >
            <SkipForward className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={() => setIsRepeat(!isRepeat)}
            className={cn(
              "h-12 w-12 p-0",
              isRepeat && "text-primary"
            )}
          >
            <Repeat className="h-5 w-5" />
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLike}
            className="h-10 w-10 p-0"
          >
            <Heart className={cn(
              "h-5 w-5",
              isLiked(track.id) && "fill-red-500 text-red-500"
            )} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare?.(track)}
            className="h-10 w-10 p-0"
          >
            <Share2 className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 flex-1 max-w-32">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-8 w-8 p-0"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload?.(track)}
            className="h-10 w-10 p-0"
          >
            <Download className="h-5 w-5" />
          </Button>

          {track.lyrics && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShowLyrics?.(track)}
              className="h-10 w-10 p-0"
            >
              <Lyrics className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}