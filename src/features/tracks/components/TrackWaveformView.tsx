import React, { memo, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward,
  Clock,
  Waves,
  Download,
  Share
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Track {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  audio_url: string | null;
  current_version: number;
  created_at: string;
  updated_at: string;
  description?: string | null;
  genre_tags?: string[] | null;
  projects?: {
    title: string;
    artists?: {
      name: string;
    };
  };
}

interface TrackWaveformViewProps {
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
  onEditTrack: (track: Track) => void;
  className?: string;
}

// Simulated waveform data generator
const generateWaveformData = (duration: number = 180): number[] => {
  const dataPoints = Math.min(200, duration * 2); // 2 points per second, max 200
  const waveform = [];
  
  for (let i = 0; i < dataPoints; i++) {
    const t = i / dataPoints;
    // Generate realistic waveform with peaks and variations
    const base = Math.sin(t * Math.PI * 8) * 0.3;
    const variation = Math.sin(t * Math.PI * 32) * 0.2;
    const noise = (Math.random() - 0.5) * 0.1;
    const envelope = Math.sin(t * Math.PI) * 0.8 + 0.2; // Overall song envelope
    
    waveform.push(Math.abs(base + variation + noise) * envelope);
  }
  
  return waveform;
};

const WaveformVisualization = memo(({ 
  waveformData, 
  isPlaying = false, 
  progress = 0, 
  onSeek 
}: {
  waveformData: number[];
  isPlaying?: boolean;
  progress?: number;
  onSeek?: (position: number) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const barWidth = width / waveformData.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform bars
    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = amplitude * height * 0.8;
      const y = (height - barHeight) / 2;
      
      // Determine bar color based on progress
      const position = index / waveformData.length;
      let color;
      
      if (position <= progress) {
        color = '#3b82f6'; // Blue for played portion
      } else if (hoveredPosition !== null && Math.abs(position - hoveredPosition) < 0.02) {
        color = '#6366f1'; // Purple for hover
      } else {
        color = '#e2e8f0'; // Gray for unplayed
      }
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight);
    });
    
    // Draw progress indicator
    if (isPlaying) {
      const progressX = progress * width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  }, [waveformData, isPlaying, progress, hoveredPosition]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSeek) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const position = x / rect.width;
    onSeek(Math.max(0, Math.min(1, position)));
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const position = x / rect.width;
    setHoveredPosition(position);
  };

  const handleCanvasMouseLeave = () => {
    setHoveredPosition(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={60}
      className="w-full h-full cursor-pointer hover:opacity-80 transition-opacity"
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={handleCanvasMouseLeave}
      style={{ imageRendering: 'pixelated' }}
    />
  );
});

WaveformVisualization.displayName = 'WaveformVisualization';

export const TrackWaveformView = memo(({ 
  tracks, 
  onPlayTrack, 
  onEditTrack, 
  className 
}: TrackWaveformViewProps) => {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState<Record<string, number>>({});
  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);

  const handlePlay = (track: Track) => {
    if (playingTrack === track.id) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(track.id);
      onPlayTrack(track);
    }
  };

  const handleSeek = (trackId: string, position: number) => {
    setPlayProgress(prev => ({ ...prev, [trackId]: position }));
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        {/* Audio Controls Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-primary" />
                Waveform Player
              </CardTitle>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMuted(!muted)}
                      className="gap-1"
                    >
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {muted ? 'Unmute' : 'Mute'}
                  </TooltipContent>
                </Tooltip>
                <div className="w-20">
                  <Progress value={muted ? 0 : volume * 100} className="h-1" />
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {tracks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Waves className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tracks Available</h3>
              <p className="text-muted-foreground text-center">
                Upload or generate some tracks to see their waveforms
              </p>
            </CardContent>
          </Card>
        ) : (
          tracks.map((track) => {
            const waveformData = generateWaveformData(track.duration || 180);
            const isPlaying = playingTrack === track.id;
            const progress = playProgress[track.id] || 0;

            return (
              <Card key={track.id} className={`transition-all duration-200 ${
                isPlaying ? 'ring-2 ring-primary/50 shadow-lg' : 'hover:shadow-md'
              }`}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Track Info Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate text-lg">{track.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>#{track.track_number}</span>
                          {track.projects?.artists?.name && (
                            <>
                              <span>•</span>
                              <span>{track.projects.artists.name}</span>
                            </>
                          )}
                          {track.projects?.title && (
                            <>
                              <span>•</span>
                              <span>{track.projects.title}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                        
                        {/* Genre Tags */}
                        {track.genre_tags && track.genre_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {track.genre_tags.slice(0, 3).map((genre, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                            {track.genre_tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{track.genre_tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Share className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Share track</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download track</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Waveform and Controls */}
                    <div className="space-y-3">
                      {/* Waveform Visualization */}
                      <div className="relative bg-muted/30 rounded-lg p-2">
                        <div className="h-16">
                          <WaveformVisualization
                            waveformData={waveformData}
                            isPlaying={isPlaying}
                            progress={progress}
                            onSeek={(position) => handleSeek(track.id, position)}
                          />
                        </div>
                        
                        {/* Time indicators */}
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0:00</span>
                          <span>{formatDuration(track.duration)}</span>
                        </div>
                      </div>
                      
                      {/* Playback Controls */}
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" disabled>
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          onClick={() => handlePlay(track)}
                          disabled={!track.audio_url}
                          className="h-10 w-10 rounded-full"
                          size="sm"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4 ml-0.5" />
                          )}
                        </Button>
                        
                        <Button variant="outline" size="sm" disabled>
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Additional Info */}
                      {track.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/20 p-2 rounded">
                          {track.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </TooltipProvider>
  );
});

TrackWaveformView.displayName = 'TrackWaveformView';