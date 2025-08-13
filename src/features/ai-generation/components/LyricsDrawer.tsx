import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Music, 
  Clock, 
  User, 
  FolderOpen,
  Copy,
  Download,
  X,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Track {
  id: string;
  title: string;
  lyrics?: string;
  description?: string;
  genre_tags?: string[];
  style_prompt?: string;
  duration?: number;
  created_at?: string;
  audio_url?: string;
  project?: {
    title: string;
    artist?: {
      name: string;
    };
  };
}

interface LyricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onPlay?: (track: Track) => void;
}

export function LyricsDrawer({ isOpen, onClose, track, onPlay }: LyricsDrawerProps) {
  const [parsedLyrics, setParsedLyrics] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (track?.lyrics) {
      // Парсим лирику из JSON формата в читаемый текст
      try {
        let lyricsText = track.lyrics;
        
        // Если это JSON объект
        if (lyricsText.startsWith('{')) {
          const lyricsObj = JSON.parse(lyricsText);
          lyricsText = lyricsObj.lyrics || lyricsObj.text || track.lyrics;
        }

        // Обрабатываем SUNO.AI теги для лучшего отображения
        const processedLyrics = lyricsText
          // Структурные теги
          .replace(/\[Intro\]/gi, '🎵 [Вступление]')
          .replace(/\[Verse\s*(\d*)\]/gi, '📝 [Куплет $1]')
          .replace(/\[Chorus\]/gi, '🎤 [Припев]')
          .replace(/\[Bridge\]/gi, '🌉 [Переход]')
          .replace(/\[Outro\]/gi, '🎵 [Завершение]')
          // Вокальные эффекты  
          .replace(/\{main_vox\}/gi, '🎙️')
          .replace(/\{backing_vox\}/gi, '🎶')
          .replace(/\{harmonies\}/gi, '🎵')
          // Динамические эффекты
          .replace(/\[!fade_in\]/gi, '↗️ [Нарастание]')
          .replace(/\[!build_up\]/gi, '⬆️ [Подъем]')
          .replace(/\[!drop\]/gi, '⬇️ [Спад]')
          .replace(/\[!reverb\]/gi, '🔊 [Реверб]')
          // Эмоциональные маркеры
          .replace(/\[Emotional\]/gi, '💫 [Эмоционально]')
          .replace(/\[Intense\]/gi, '🔥 [Интенсивно]')
          .replace(/\[Gentle\]/gi, '🌸 [Нежно]')
          // Убираем лишние переносы и добавляем структуру
          .replace(/\n\s*\n/g, '\n\n')
          .trim();

        setParsedLyrics(processedLyrics);
      } catch (error) {
        // Если не JSON, просто используем как есть
        setParsedLyrics(track.lyrics);
      }
    } else {
      setParsedLyrics("");
    }
  }, [track?.lyrics]);

  const copyToClipboard = async () => {
    if (parsedLyrics) {
      await navigator.clipboard.writeText(parsedLyrics);
      toast({
        title: "Скопировано",
        description: "Текст лирики скопирован в буфер обмена"
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[500px] p-0 overflow-hidden">
        {track && (
          <>
            <SheetHeader className="p-6 pb-4 bg-gradient-to-r from-background to-accent/20">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg font-bold truncate">
                    {track.title}
                  </SheetTitle>
                  <SheetDescription className="mt-1">
                    {track.project?.artist?.name && (
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" />
                        {track.project.artist.name}
                      </div>
                    )}
                    {track.project?.title && (
                      <div className="flex items-center gap-1 text-sm mt-1">
                        <FolderOpen className="h-3 w-3" />
                        {track.project.title}
                      </div>
                    )}
                  </SheetDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Действия */}
              <div className="flex gap-2 pt-2">
                {track.audio_url && onPlay && (
                  <Button 
                    size="sm" 
                    onClick={() => onPlay(track)}
                    className="flex-1"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Воспроизвести
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={copyToClipboard}
                  disabled={!parsedLyrics}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Копировать
                </Button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-6">
                {/* Информация о треке */}
                <Card className="mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Информация о треке
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {track.duration && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{formatDuration(track.duration)}</span>
                        </div>
                      )}
                      {track.created_at && (
                        <div className="text-muted-foreground">
                          {formatDate(track.created_at)}
                        </div>
                      )}
                    </div>

                    {track.genre_tags && track.genre_tags.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Жанры</p>
                        <div className="flex flex-wrap gap-1">
                          {track.genre_tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {track.description && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Описание</p>
                        <p className="text-sm">{track.description}</p>
                      </div>
                    )}

                    {track.style_prompt && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Стилевой промпт</p>
                        <p className="text-sm text-muted-foreground">{track.style_prompt}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Separator className="my-4" />

                {/* Лирика */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Лирика
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {parsedLyrics ? (
                      <div className="whitespace-pre-line text-sm leading-relaxed font-mono">
                        {parsedLyrics}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Лирика недоступна</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="h-6" /> {/* Отступ снизу */}
              </ScrollArea>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}