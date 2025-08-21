/**
 * @fileoverview Карточка трека для Mureka AI
 * Специализированный компонент для отображения Mureka треков
 * @version 1.0.0
 * @author Claude Code Assistant
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ScrollArea,
  ScrollBar 
} from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Play, 
  Pause, 
  Download, 
  Heart,
  Music,
  FileText,
  Clock,
  Calendar,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useTrackActions } from '@/hooks/useTrackActions';
import { formatDuration } from '@/lib/utils';

// ==========================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// ==========================================

interface MurekaTrack {
  id: string;
  title: string;
  lyrics: string;
  audio_url: string;
  instrumental_url?: string;
  duration: number;
  metadata: {
    mureka_song_id?: string;
    generation_id?: string;
    service: 'mureka';
    model?: string;
    created_at?: string;
    track_index?: number;
    [key: string]: any;
  };
  created_at?: string;
}

interface MurekaTrackCardProps {
  track: MurekaTrack;
  isPlaying?: boolean;
  onPlay?: (track: MurekaTrack) => void;
  onPause?: () => void;
  showLyrics?: boolean;
  className?: string;
}

// ==========================================
// ОСНОВНОЙ КОМПОНЕНТ
// ==========================================

export function MurekaTrackCard({
  track,
  isPlaying = false,
  onPlay,
  onPause,
  showLyrics = true,
  className = ''
}: MurekaTrackCardProps) {
  
  // ====================================
  // СОСТОЯНИЕ
  // ====================================
  
  const [showFullLyrics, setShowFullLyrics] = useState(false);
  
  // Хук для действий с треками
  const {
    likeTrack,
    unlikeTrack,
    isLiked,
    downloadMP3,
    deleteTrack,
    isLiking,
    isDeleting,
    isDownloading
  } = useTrackActions();
  
  // ====================================
  // ОБРАБОТЧИКИ
  // ====================================
  
  const handlePlayPause = () => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.(track);
    }
  };
  
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked(track.id)) {
      await unlikeTrack(track.id);
    } else {
      await likeTrack(track.id);
    }
  };
  
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await downloadMP3(track);
  };
  
  // ====================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ====================================
  
  const formatCreatedAt = (dateString?: string) => {
    if (!dateString) return 'Недавно';
    
    try {
      const date = new Date(dateString);
      return new Intl.RelativeTimeFormatter('ru', { numeric: 'auto' })
        .format(
          Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          'day'
        );
    } catch {
      return 'Недавно';
    }
  };
  
  const getPreviewLyrics = (lyrics: string, maxLength = 150) => {
    if (!lyrics || lyrics === '[Auto-generated lyrics]') {
      return 'Лирика генерируется автоматически';
    }
    
    if (lyrics.length <= maxLength) {
      return lyrics;
    }
    
    const truncated = lyrics.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.substring(0, lastSpace) + '...';
  };
  
  const liked = isLiked(track.id);
  
  // ====================================
  // РЕНДЕР
  // ====================================
  
  return (
    <Card className={`${className} hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-semibold text-lg leading-tight truncate">
              {track.title || 'Untitled Track'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                <Music className="h-3 w-3 mr-1" />
                Mureka AI
              </Badge>
              {track.metadata.model && (
                <Badge variant="outline" className="text-xs">
                  {track.metadata.model}
                </Badge>
              )}
              {track.metadata.track_index !== undefined && (
                <Badge variant="outline" className="text-xs">
                  #{track.metadata.track_index + 1}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Кнопка воспроизведения */}
          <Button
            variant="default"
            size="sm"
            onClick={handlePlayPause}
            className="shrink-0"
            disabled={!track.audio_url}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Информация о треке */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(track.duration)}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatCreatedAt(track.created_at || track.metadata.created_at)}
            </div>
          </div>
        </div>
        
        {/* Предварительный просмотр лирики */}
        {showLyrics && track.lyrics && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Лирика
                </Label>
                {track.lyrics.length > 150 && (
                  <Dialog open={showFullLyrics} onOpenChange={setShowFullLyrics}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Показать полностью
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>{track.title}</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[60vh] w-full">
                        <pre className="whitespace-pre-wrap text-sm font-mono p-4 bg-muted rounded">
                          {track.lyrics}
                        </pre>
                        <ScrollBar orientation="vertical" />
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <pre className="whitespace-pre-wrap font-mono">
                  {getPreviewLyrics(track.lyrics)}
                </pre>
              </div>
            </div>
          </>
        )}
        
        <Separator />
        
        {/* Действия с треком */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Лайк */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className={liked ? 'text-red-500 hover:text-red-600' : ''}
            >
              {isLiking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              )}
            </Button>
            
            {/* Скачивание */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading || !track.audio_url}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
            
            {/* Ссылка на инструментальную версию */}
            {track.instrumental_url && (
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a 
                  href={track.instrumental_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Инструментальная версия"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          
          {/* Дополнительная информация */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {track.metadata.mureka_song_id && (
              <span>ID: {track.metadata.mureka_song_id.slice(0, 8)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// ДОПОЛНИТЕЛЬНЫЕ КОМПОНЕНТЫ
// ==========================================

/**
 * Компонент Label для внутреннего использования
 */
function Label({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`text-sm font-medium ${className}`}>
      {children}
    </div>
  );
}