import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  Music2, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { toast } from 'sonner';
import { AIGeneration } from '../hooks/useGenerationState';

interface GenerationTrackCardProps {
  generation: AIGeneration;
  onCheckStatus: (generationId: string) => void;
  onPlay?: (url: string) => void;
  onDownload?: (url: string, filename: string) => void;
  isRefreshing: boolean;
}

export function GenerationTrackCard({ 
  generation, 
  onCheckStatus, 
  onPlay, 
  onDownload,
  isRefreshing 
}: GenerationTrackCardProps) {
  const [progress, setProgress] = useState(generation.progress || 0);

  // Simulate progress for processing generations
  useEffect(() => {
    if (generation.status === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + Math.random() * 5, 85);
          return newProgress;
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [generation.status]);

  const getStatusConfig = () => {
    switch (generation.status) {
      case 'completed':
        return {
          color: 'bg-success/10 text-success border-success/20',
          icon: CheckCircle2,
          text: 'Завершено',
          description: 'Трек готов к воспроизведению'
        };
      case 'processing':
        return {
          color: 'bg-warning/10 text-warning border-warning/20',
          icon: Loader2,
          text: 'Обрабатывается',
          description: 'Генерация в процессе...'
        };
      case 'failed':
        return {
          color: 'bg-destructive/10 text-destructive border-destructive/20',
          icon: AlertCircle,
          text: 'Ошибка',
          description: generation.error_message || 'Произошла ошибка при генерации'
        };
      case 'pending':
        return {
          color: 'bg-muted/10 text-muted-foreground border-muted/20',
          icon: Clock,
          text: 'В очереди',
          description: 'Ожидание начала генерации'
        };
      default:
        return {
          color: 'bg-muted/10 text-muted-foreground border-muted/20',
          icon: Clock,
          text: generation.status,
          description: 'Неизвестный статус'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFilename = () => {
    const title = generation.title || 'track';
    const service = generation.service;
    const timestamp = new Date(generation.created_at).toISOString().slice(0, 10);
    return `${title}-${service}-${timestamp}.mp3`;
  };

  // Extract audio URL from different sources
  const getAudioUrl = () => {
    if (generation.result_url) return generation.result_url;
    
    // Check Mureka response
    if (generation.metadata?.mureka_response?.choices?.[0]?.url) {
      return generation.metadata.mureka_response.choices[0].url;
    }
    
    // Check Suno response  
    if (generation.metadata?.suno_track_data?.audio_url) {
      return generation.metadata.suno_track_data.audio_url;
    }
    
    return null;
  };

  const audioUrl = getAudioUrl();

  if (generation.status === 'completed' && audioUrl) {
    // Completed state - show as a regular track
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                {generation.title || 'Сгенерированный трек'}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className={statusConfig.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.text}
                </Badge>
                <Badge variant="outline">{generation.service}</Badge>
                {generation.duration && (
                  <span>{formatDuration(generation.duration)}</span>
                )}
                <span className="hidden md:inline">·</span>
                <span className="text-xs">
                  {new Date(generation.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              {generation.prompt && (
                <p className="text-sm text-muted-foreground truncate">
                  {generation.prompt}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPlay?.(audioUrl!)}
                className="flex items-center gap-2"
              >
                <Music2 className="h-4 w-4" />
                Играть
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload?.(audioUrl!, getFilename())}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Скачать
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }


  // Processing/Failed/Pending state
  return (
    <Card className={`shadow-card border ${statusConfig.color.includes('border') ? statusConfig.color : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${generation.status === 'processing' ? 'animate-spin' : ''}`} />
              {generation.title || 'Генерация трека'}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className={statusConfig.color}>
                {statusConfig.text}
              </Badge>
              <Badge variant="outline">{generation.service}</Badge>
              <span className="text-xs">
                {new Date(generation.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {generation.prompt && (
          <p className="text-sm text-muted-foreground">
            {generation.prompt}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{statusConfig.description}</span>
            {generation.status === 'processing' && (
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            )}
          </div>
          
          {generation.status === 'processing' && (
            <Progress value={progress} className="h-2" />
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            {generation.task_id && (
              <p className="text-xs text-muted-foreground font-mono">
                ID: {generation.task_id}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCheckStatus(generation.id)}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Проверить
            </Button>
            {generation.status === 'failed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: implement retry logic
                  toast.info('Повтор генерации пока не реализован');
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Повторить
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}