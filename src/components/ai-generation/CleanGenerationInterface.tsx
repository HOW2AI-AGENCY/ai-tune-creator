import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Sparkles, Clock, Download, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  created_at: string;
  metadata?: any;
}

interface GenerationProgress {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  service: 'suno' | 'mureka';
}

interface CleanGenerationInterfaceProps {
  tracks: Track[];
  activeGenerations: GenerationProgress[];
  onGenerateTrack: (prompt: string, service: 'suno' | 'mureka') => void;
  onDeleteTrack: (trackId: string) => void;
  currentTrack?: Track;
  onPlayTrack: (track: Track) => void;
  isPlaying: boolean;
}

export function CleanGenerationInterface({
  tracks,
  activeGenerations,
  onGenerateTrack,
  onDeleteTrack,
  currentTrack,
  onPlayTrack,
  isPlaying
}: CleanGenerationInterfaceProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedService, setSelectedService] = useState<'suno' | 'mureka'>('suno');

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerateTrack(prompt.trim(), selectedService);
      setPrompt('');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Generation Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Генерация музыки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={selectedService === 'suno' ? 'default' : 'outline'}
              onClick={() => setSelectedService('suno')}
              size="sm"
            >
              Suno AI
            </Button>
            <Button
              variant={selectedService === 'mureka' ? 'default' : 'outline'}
              onClick={() => setSelectedService('mureka')}
              size="sm"
            >
              Mureka
            </Button>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите музыку, которую хотите создать..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <Button onClick={handleGenerate} disabled={!prompt.trim()}>
              Создать
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Generations */}
      {activeGenerations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Активные генерации</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeGenerations.map((gen) => (
                <div key={gen.taskId} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{gen.service === 'suno' ? 'Suno AI' : 'Mureka'}</span>
                      <span className="text-xs text-muted-foreground">{gen.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${gen.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track) => (
          <Card key={track.id} className={cn(
            "overflow-hidden transition-all duration-200 hover:shadow-md",
            currentTrack?.id === track.id && "ring-2 ring-primary"
          )}>
            <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Music className="h-12 w-12 text-primary/60" />
              </div>
              
              {/* Play Button */}
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-background/80 hover:bg-background"
                onClick={() => onPlayTrack(track)}
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
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-medium truncate mb-2">{track.title}</h3>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {new Date(track.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-1">
                  {track.audio_url && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => onDeleteTrack(track.id)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tracks.length === 0 && activeGenerations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Создайте первый трек</h3>
            <p className="text-muted-foreground">
              Опишите музыку, которую хотите создать, и мы сгенерируем её для вас
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}