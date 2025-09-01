import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useState } from 'react';

interface TrackData {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  lyrics?: string;
}

interface TelegramMobilePlayerProps {
  track: TrackData;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  onShare: (track: TrackData) => Promise<void>;
  onDownload: (track: TrackData) => void;
  onShowLyrics: () => void;
  playlist: TrackData[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
}

export const TelegramMobilePlayer = ({ 
  track, 
  isPlaying, 
  onPlayPause, 
  onShare,
  onDownload,
  onShowLyrics,
  playlist,
  currentIndex,
  onNext,
  onPrev
}: TelegramMobilePlayerProps) => {

  if (!track?.audio_url) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPlayPause(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex-1">
            <p className="text-sm font-medium">{track.title || 'Сгенерированный трек'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};