import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Music2, 
  Calendar, 
  Clock, 
  User, 
  Folder,
  Download,
  Play,
  Eye,
  Settings
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  artist_name?: string;
  project_name?: string;
  duration?: number;
  created_at: string;
  audio_url?: string;
  lyrics?: string;
  metadata?: any;
  service?: string;
}

interface TrackDetailsDrawerProps {
  track: Track | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlay?: (url: string) => void;
  onDownload?: (url: string, filename: string) => void;
  onViewDetails?: (track: Track) => void;
}

export function TrackDetailsDrawer({ 
  track, 
  open, 
  onOpenChange,
  onPlay,
  onDownload,
  onViewDetails
}: TrackDetailsDrawerProps) {
  if (!track) return null;

  // Infer service from metadata if not explicitly set
  const getTrackService = () => {
    if (track.service) return track.service;
    if (track.metadata?.service) return track.metadata.service;
    
    // Infer from metadata fields
    if (track.metadata?.suno_track_id || track.metadata?.suno_track_data) {
      return 'suno';
    }
    if (track.metadata?.mureka_task_id || track.metadata?.mureka_response) {
      return 'mureka';
    }
    
    return 'unknown';
  };

  const service = getTrackService();

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Неизвестно';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getServiceBadgeColor = () => {
    switch (service) {
      case 'suno': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'mureka': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getFilename = () => {
    const title = track.title || 'track';
    const timestamp = new Date(track.created_at).toISOString().slice(0, 10);
    return `${title}-${service}-${timestamp}.mp3`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Детали трека
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Track Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{track.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={getServiceBadgeColor()}>
                  {service === 'suno' ? 'Suno AI' : 
                   service === 'mureka' ? 'Mureka AI' : 
                   'Неизвестный сервис'}
                </Badge>
                {track.artist_name && (
                  <Badge variant="secondary">
                    <User className="h-3 w-3 mr-1" />
                    {track.artist_name}
                  </Badge>
                )}
                {track.project_name && (
                  <Badge variant="secondary">
                    <Folder className="h-3 w-3 mr-1" />
                    {track.project_name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatDuration(track.duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(track.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {track.audio_url && (
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => onPlay?.(track.audio_url!)}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Играть
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload?.(track.audio_url!, getFilename())}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Скачать
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(track)}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            Открыть детали
          </Button>

          <Separator />

          {/* Lyrics */}
          {track.lyrics && (
            <div className="space-y-2">
              <h4 className="font-medium">Текст песни</h4>
              <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                {track.lyrics}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2">
            <h4 className="font-medium">Техническая информация</h4>
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <div>ID: {track.id}</div>
              <div>Сервис: {service}</div>
              {track.metadata?.model && (
                <div>Модель: {track.metadata.model}</div>
              )}
              {track.metadata?.generation_id && (
                <div>ID генерации: {track.metadata.generation_id}</div>
              )}
              {track.metadata?.suno_track_id && (
                <div>Suno Track ID: {track.metadata.suno_track_id}</div>
              )}
              {track.metadata?.mureka_task_id && (
                <div>Mureka Task ID: {track.metadata.mureka_task_id}</div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}