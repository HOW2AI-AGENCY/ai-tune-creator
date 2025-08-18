import { Play, Pause, Music, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

interface MobileTrackRowProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: (track: Track) => void;
  onSelect?: (track: Track) => void;
  onMore?: (track: Track) => void;
  className?: string;
}

export function MobileTrackRow({ 
  track, 
  isPlaying = false, 
  onPlay, 
  onSelect,
  onMore,
  className 
}: MobileTrackRowProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay?.(track);
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMore?.(track);
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 py-3 px-4 tap-highlight",
        "border-b border-border/50 last:border-b-0",
        "active:bg-muted/50 transition-colors",
        className
      )}
      onClick={() => onSelect?.(track)}
    >
      {/* Play Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full flex-shrink-0"
        onClick={handlePlayClick}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-sm truncate text-foreground">
            {track.title}
          </h3>
          {isPlaying && (
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {track.project?.artist?.name || 'Unknown Artist'}
          </span>
          <span>•</span>
          <span className="flex-shrink-0">
            {formatDuration(track.duration)}
          </span>
        </div>
      </div>

      {/* More Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={handleMoreClick}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
}