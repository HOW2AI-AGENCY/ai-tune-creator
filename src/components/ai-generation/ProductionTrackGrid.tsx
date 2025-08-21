import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Play, Pause, Download, Clock, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  created_at: string;
  metadata?: any;
  lyrics?: string;
  genre_tags?: string[];
}

interface ProductionTrackGridProps {
  tracks: Track[];
  currentTrack?: Track | null;
  isPlaying: boolean;
  onTrackClick: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  onDeleteTrack: (trackId: string) => void;
}

export function ProductionTrackGrid({
  tracks,
  currentTrack,
  isPlaying,
  onTrackClick,
  onPlayTrack,
  onDeleteTrack
}: ProductionTrackGridProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`;
    return `${Math.floor(diffMins / 1440)} дн назад`;
  };

  if (tracks.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="py-12 text-center">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Создайте первый трек</h3>
          <p className="text-muted-foreground">
            Опишите музыку, которую хотите создать, и мы сгенерируем её для вас
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {tracks.map((track) => (
        <Card 
          key={track.id} 
          className={cn(
            "overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer group",
            currentTrack?.id === track.id && "ring-2 ring-primary"
          )}
          onClick={() => onTrackClick(track)}
        >
          <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Music className="h-12 w-12 text-primary/60" />
            </div>
            
            {/* Play Button */}
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onPlayTrack(track);
              }}
            >
              {currentTrack?.id === track.id && isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {/* Duration Badge */}
            {track.duration && (
              <Badge 
                variant="secondary" 
                className="absolute top-2 right-2 bg-background/80 text-foreground"
              >
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(track.duration)}
              </Badge>
            )}

            {/* Genre Tag */}
            {track.genre_tags && track.genre_tags.length > 0 && (
              <Badge 
                variant="outline" 
                className="absolute top-2 left-2 bg-background/80"
              >
                {track.genre_tags[0]}
              </Badge>
            )}
          </div>
          
          <CardContent className="p-4">
            <h3 className="font-medium truncate mb-2" title={track.title}>
              {track.title}
            </h3>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{formatTimeAgo(track.created_at)}</span>
              <div className="flex gap-1">
                {track.audio_url && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0" 
                    title="Скачать"
                    onClick={(e) => {
                      e.stopPropagation();
                      const link = document.createElement('a');
                      link.href = track.audio_url!;
                      link.download = `${track.title}.mp3`;
                      link.click();
                    }}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    // More options menu
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Lyrics preview */}
            {track.lyrics && (
              <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                <div className="line-clamp-2">
                  {track.lyrics.slice(0, 100)}
                  {track.lyrics.length > 100 && '...'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}