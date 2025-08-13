import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Music, Clock, Hash, Mic, FileText, Palette, Tags } from "lucide-react";

interface Track {
  id: string;
  title: string;
  track_number?: number;
  duration?: number | null;
  lyrics?: string | null;
  description?: string | null;
  genre_tags?: string[] | null;
  style_prompt?: string | null;
  current_version?: number;
  created_at?: string;
  updated_at?: string;
  audio_url?: string | null;
  metadata?: any;
}

interface TrackDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
}

export function TrackDetailsDialog({ open, onOpenChange, track }: TrackDetailsDialogProps) {
  if (!track) return null;

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {track.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(90vh-120px)]">
          {/* Left Column - Track Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hash className="h-4 w-4" />
                  Основная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Номер трека</p>
                    <p>{track.track_number || 'Не указан'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Версия</p>
                    <p>v{track.current_version || 1}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Длительность</p>
                    <p>{track.duration ? formatDuration(track.duration) : 'Не указана'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Статус</p>
                    <Badge variant={track.audio_url ? "default" : "secondary"}>
                      {track.audio_url ? "Готов" : "В работе"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {track.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Описание
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{track.description}</p>
                </CardContent>
              </Card>
            )}

            {track.genre_tags && track.genre_tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tags className="h-4 w-4" />
                    Жанры
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {track.genre_tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {track.style_prompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Palette className="h-4 w-4" />
                    Промпт стиля
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {track.style_prompt}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  История
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <span className="font-medium text-muted-foreground">Создан:</span>
                  <span className="ml-2">
                    {track.created_at ? new Date(track.created_at).toLocaleString('ru-RU') : 'Неизвестно'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Обновлен:</span>
                  <span className="ml-2">
                    {track.updated_at ? new Date(track.updated_at).toLocaleString('ru-RU') : 'Неизвестно'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Количество редактирований:</span>
                  <span className="ml-2">{track.metadata?.edit_count || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Lyrics */}
          <div className="flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mic className="h-4 w-4" />
                  Текст песни
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <Separator />
                <ScrollArea className="flex-1 p-4">
                  {track.lyrics ? (
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono">
                      {track.lyrics}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Текст песни не добавлен
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}