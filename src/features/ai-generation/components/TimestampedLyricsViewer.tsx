import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Play, Pause, RotateCcw, Download } from 'lucide-react';

interface AlignedWord {
  word: string;
  success: boolean;
  start_s: number;
  end_s: number;
  p_align: number;
}

interface TimestampedLyricsData {
  alignedWords: AlignedWord[];
  waveformData: number[];
  hootCer: number;
  isStreamed: boolean;
}

interface TimestampedLyricsViewerProps {
  taskId: string;
  audioId?: string;
  musicIndex?: number;
  audioUrl?: string;
  title?: string;
  className?: string;
}

export function TimestampedLyricsViewer({
  taskId,
  audioId,
  musicIndex,
  audioUrl,
  title,
  className
}: TimestampedLyricsViewerProps) {
  const [lyricsData, setLyricsData] = useState<TimestampedLyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // TODO: Добавить поддержку внешних аудио плееров для синхронизации
  // TODO: Реализовать экспорт в различные форматы (SRT, VTT, LRC)
  // TODO: Добавить возможность редактирования временных меток
  
  const fetchTimestampedLyrics = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-suno-timestamped-lyrics', {
        body: {
          taskId,
          audioId,
          musicIndex
        }
      });

      if (error) {
        console.error('Error fetching timestamped lyrics:', error);
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить временные метки лирики",
          variant: "destructive"
        });
        return;
      }

      if (data?.success && data?.data) {
        setLyricsData(data.data);
        toast({
          title: "Лирика загружена",
          description: `Загружено ${data.data.alignedWords.length} меток с точностью ${(data.data.hootCer * 100).toFixed(1)}%`
        });
      } else {
        throw new Error(data?.error || 'Неизвестная ошибка при загрузке лирики');
      }
    } catch (error) {
      console.error('Failed to fetch timestamped lyrics:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось загрузить лирику с временными метками",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Обновление активного слова при воспроизведении
  useEffect(() => {
    if (!lyricsData || !isPlaying) return;

    const interval = setInterval(() => {
      if (audioRef.current) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        
        // Найти активное слово
        const activeIndex = lyricsData.alignedWords.findIndex((word, index) => {
          const nextWord = lyricsData.alignedWords[index + 1];
          return time >= word.start_s && (!nextWord || time < nextWord.start_s);
        });
        
        setActiveWordIndex(activeIndex);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [lyricsData, isPlaying]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setActiveWordIndex(-1);
    }
  };

  const jumpToWord = (wordIndex: number) => {
    if (!audioRef.current || !lyricsData) return;
    
    const word = lyricsData.alignedWords[wordIndex];
    if (word) {
      audioRef.current.currentTime = word.start_s;
      setCurrentTime(word.start_s);
      setActiveWordIndex(wordIndex);
    }
  };

  const exportLyrics = (format: 'srt' | 'vtt' | 'lrc') => {
    if (!lyricsData) return;
    
    let content = '';
    
    switch (format) {
      case 'srt':
        content = lyricsData.alignedWords.map((word, index) => {
          const start = formatTimeForSRT(word.start_s);
          const end = formatTimeForSRT(word.end_s);
          return `${index + 1}\n${start} --> ${end}\n${word.word}\n`;
        }).join('\n');
        break;
      case 'vtt':
        content = 'WEBVTT\n\n' + lyricsData.alignedWords.map(word => {
          const start = formatTimeForVTT(word.start_s);
          const end = formatTimeForVTT(word.end_s);
          return `${start} --> ${end}\n${word.word}\n`;
        }).join('\n');
        break;
      case 'lrc':
        content = lyricsData.alignedWords.map(word => {
          const time = formatTimeForLRC(word.start_s);
          return `[${time}]${word.word}`;
        }).join('\n');
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'lyrics'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimeForSRT = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const formatTimeForVTT = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.padStart(6, '0')}`;
  };

  const formatTimeForLRC = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${minutes.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
  };

  return (
    <Card className={`p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Синхронизированная лирика</h3>
          {lyricsData && (
            <Badge variant="secondary">
              Точность: {(lyricsData.hootCer * 100).toFixed(1)}%
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {lyricsData && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportLyrics('srt')}
                className="gap-1"
              >
                <Download className="w-3 h-3" />
                SRT
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportLyrics('lrc')}
                className="gap-1"
              >
                <Download className="w-3 h-3" />
                LRC
              </Button>
            </>
          )}
          
          <Button
            onClick={fetchTimestampedLyrics}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? 'Загрузка...' : 'Загрузить лирику'}
          </Button>
        </div>
      </div>

      {audioUrl && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayPause}
            className="gap-1"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="gap-1"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          
          <div className="flex-1 text-sm text-muted-foreground">
            Время: {currentTime.toFixed(1)}s
          </div>
          
          <audio
            ref={audioRef}
            src={audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
            preload="metadata"
          />
        </div>
      )}

      {lyricsData && (
        <ScrollArea className="h-96">
          <div className="space-y-1">
            {lyricsData.alignedWords.map((word, index) => (
              <div
                key={index}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  index === activeWordIndex
                    ? 'bg-primary text-primary-foreground'
                    : word.success
                    ? 'hover:bg-muted'
                    : 'bg-destructive/10 text-destructive'
                }`}
                onClick={() => jumpToWord(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">
                    {word.word}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{word.start_s.toFixed(2)}s - {word.end_s.toFixed(2)}s</span>
                    {!word.success && (
                      <Badge variant="destructive" className="text-xs">
                        Низкая точность
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {!lyricsData && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Нажмите "Загрузить лирику" для получения синхронизированной лирики</p>
          <p className="text-sm mt-1">
            Требуется taskId: <code className="bg-muted px-1 rounded">{taskId}</code>
          </p>
        </div>
      )}
    </Card>
  );
}