import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Download, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrackStems } from '@/hooks/useTrackStems';
import { STEM_ICONS, STEM_NAMES } from '@/types/track-stems';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  has_stems?: boolean;
  stems_count?: number;
  stems_separation_mode?: 'simple' | 'detailed';
  variant_number?: number;
  is_master_variant?: boolean;
}

interface TrackRowWithStemsProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: (track: Track) => void;
  onSelect?: (track: Track) => void;
  className?: string;
}

export function TrackRowWithStems({
  track,
  isPlaying = false,
  onPlay,
  onSelect,
  className
}: TrackRowWithStemsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { stems, isLoading, downloadStem } = useTrackStems(
    track.id,
    track.variant_number || 1
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div 
        className={cn(
          'flex items-center gap-3 p-4',
          'hover:bg-muted/50 transition-colors cursor-pointer',
          isPlaying && 'bg-primary/5'
        )}
        onClick={() => onSelect?.(track)}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.(track);
          }}
        >
          <Play className={cn('h-5 w-5', isPlaying && 'fill-current')} />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{track.title}</h3>
            {isPlaying && (
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatDuration(track.duration)}</span>
            {track.is_master_variant && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">
                  ⭐ Главный
                </Badge>
              </>
            )}
          </div>
        </div>

        {track.has_stems && track.stems_count && track.stems_count > 0 && (
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="flex items-center gap-1"
            >
              <Scissors className="h-3 w-3" />
              {track.stems_count}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Скрыть стемы
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Показать стемы ({track.stems_count})
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t bg-muted/20 p-4">
              {isLoading ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Загрузка стемов...
                </div>
              ) : stems.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Стемы не найдены
                </div>
              ) : (
                <div className="space-y-2">
                  {stems.map((stem) => (
                    <div
                      key={stem.id}
                      className="flex items-center gap-3 p-3 rounded-md bg-background/50 hover:bg-background transition-colors"
                    >
                      <div className="text-2xl">{STEM_ICONS[stem.stem_type as keyof typeof STEM_ICONS] || '🎵'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {STEM_NAMES[stem.stem_type as keyof typeof STEM_NAMES] || stem.stem_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(stem.file_size)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (onPlay && stem.stem_url) {
                              onPlay({ ...track, audio_url: stem.stem_url, title: stem.stem_name });
                            }
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => downloadStem(stem)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
