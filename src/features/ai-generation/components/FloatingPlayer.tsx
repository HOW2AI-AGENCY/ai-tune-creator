import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrackActions } from "@/hooks/useTrackActions";
import { isValidAudioUrl } from "@/lib/storage/constants";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Heart,
  Repeat,
  Shuffle,
  ChevronUp
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  project?: {
    title: string;
    artist?: {
      name: string;
    };
  };
}

interface FloatingPlayerProps {
  isOpen: boolean;
  track: Track | null;
  onClose: () => void;
  onPlayPause?: (playing: boolean) => void;
  onShowLyrics?: (track: Track) => void;
  playing?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

export function FloatingPlayer({ isOpen, track, onClose, onPlayPause, onShowLyrics, playing, onPrev, onNext }: FloatingPlayerProps) {
  // Import the hook with full path to fix module resolution
  const { likeTrack, unlikeTrack, isLiked } = useTrackActions();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Validate URL and reset state on track change
  useEffect(() => {
    const audio = audioRef.current;
    if (!track || !audio || !track.audio_url) return;

    // Validate audio URL before setting
    if (!isValidAudioUrl(track.audio_url)) {
      console.error('Invalid audio URL:', track.audio_url);
      setIsLoading(false);
      setIsPlaying(false);
      return;
    }

    const isSameSrc = audio.src === track.audio_url;

    if (!isSameSrc) {
      // Load new source only if changed
      setIsLoading(true);
      setIsPlaying(false);
      setCurrentTime(0);
      audio.src = track.audio_url;
      audio.load();
    }

    // Автозапуск только после загрузки данных
    const handleLoadedData = () => {
      setIsLoading(false);
      if (!playing) return; // Не автозапускаем без явного playing=true
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          onPlayPause?.(true);
        })
        .catch((error) => {
          console.error('Ошибка автозапуска:', error);
        });
    };

    audio.addEventListener('loadeddata', handleLoadedData);
    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [track?.id, track?.audio_url]);

  // Обновление времени воспроизведения
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onNext?.();
    };

    const handleError = (event: Event) => {
      setIsLoading(false);
      setIsPlaying(false);
      
      const audio = event.target as HTMLAudioElement;
      const error = audio.error;
      
      let errorMessage = 'Ошибка воспроизведения аудио';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Воспроизведение прервано пользователем';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Ошибка сети при загрузке аудио';
            console.error('Network error loading audio:', track?.audio_url);
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Ошибка декодирования аудио файла';
            console.error('Audio decode error:', track?.audio_url);
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Формат аудио не поддерживается';
            console.error('Unsupported audio format:', track?.audio_url);
            break;
          default:
            errorMessage = `Неизвестная ошибка аудио (код: ${error.code})`;
        }
      }
      
      console.error('Audio playback error:', {
        errorCode: error?.code,
        errorMessage: error?.message,
        trackUrl: track?.audio_url,
        trackId: track?.id
      });
      
      // Log error for debugging
      console.error('Audio Error Details:', errorMessage);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Синхронизация внешнего состояния воспроизведения
  useEffect(() => {
    if (!audioRef.current || !track?.audio_url) return;
    if (playing === undefined) return;

    const apply = async () => {
      try {
        if (playing && !isPlaying) {
          await audioRef.current.play();
          setIsPlaying(true);
          onPlayPause?.(true);
        } else if (!playing && isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
          onPlayPause?.(false);
        }
      } catch (err) {
        console.error('Sync play/pause error:', err);
      }
    };

    apply();
  }, [playing, track?.id]);
  const togglePlay = async () => {
    if (!audioRef.current || !track?.audio_url) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        onPlayPause?.(false);
        console.log("Audio paused successfully");
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          onPlayPause?.(true);
          console.log("Audio played successfully");
        }
      }
    } catch (error: any) {
      console.error("Play/pause error:", error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
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

  const handleLike = async () => {
    if (!track) return;
    try {
      const liked = isLiked(track.id);
      if (liked) await unlikeTrack(track.id); 
      else await likeTrack(track.id);
    } catch (e) { 
      console.error('Like error:', e); 
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const liked = track ? isLiked(track.id) : false;

  if (!isOpen || !track) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-xl animate-slide-in-bottom pb-safe-or-4 mb-safe-or-16">
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" key={track.id} />
      
      <Card className="m-2 border-0 shadow-none bg-transparent">
        {/* Прогресс бар (сверху) */}
        <div className="px-4 pb-2">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Основной контрол */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between gap-4">
            {/* Информация о треке */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Play className="h-5 w-5 text-primary" />
              </div>
              
              <div className="min-w-0 flex-1">
                <h4 className="font-medium truncate text-sm">{track.title}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {track.project?.artist?.name || "Неизвестный артист"}
                </p>
                {track.project?.title && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {track.project.title}
                  </Badge>
                )}
              </div>
            </div>

            {/* Управление воспроизведением */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPrev?.()} aria-label="Prev track">
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                onClick={togglePlay}
                disabled={isLoading || !track.audio_url}
                size="icon"
                className="h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNext?.()} aria-label="Next track">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Время */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono min-w-0">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Дополнительные контролы */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 ${liked ? 'text-red-500 hover:text-red-400' : ''}`}
                onClick={handleLike}
                aria-label="Лайк"
              >
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              </Button>

              {onShowLyrics && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onShowLyrics(track)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}

              {/* Громкость */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleMute}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}