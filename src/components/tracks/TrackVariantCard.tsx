/**
 * @fileoverview Enhanced track button component with multiple variants support
 * @version 0.01.037
 * @author Claude Code Assistant
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Music, 
  PlayCircle, 
  Download, 
  Heart,
  MoreHorizontal,
  Trash2,
  Copy,
  ExternalLink 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { TrackActionButtons } from '@/components/tracks/TrackActionButtons';
import { useToast } from '@/hooks/use-toast';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  metadata?: {
    track_variant?: number;
    total_variants?: number;
    is_primary?: boolean;
    generation_id?: string;
    service?: string;
    suno_track_id?: string;
  };
}

interface TrackVariantCardProps {
  track: Track;
  onPlay?: (track: Track) => void;
  onSelect?: (track: Track) => void;
  isPlaying?: boolean;
  showVariantInfo?: boolean;
}

export function TrackVariantCard({ 
  track, 
  onPlay, 
  onSelect,
  isPlaying = false,
  showVariantInfo = true 
}: TrackVariantCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVariantBadge = () => {
    if (!showVariantInfo || !track.metadata?.track_variant) return null;
    
    const variantNum = track.metadata.track_variant;
    const totalVariants = track.metadata.total_variants || 1;
    const isPrimary = track.metadata.is_primary;
    
    if (totalVariants <= 1) return null;

    return (
      <Badge 
        variant={isPrimary ? "default" : "secondary"} 
        className="text-xs"
      >
        {isPrimary ? 'Основной' : `Вариант ${variantNum}`}
      </Badge>
    );
  };

  const getServiceBadge = () => {
    const service = track.metadata?.service;
    if (!service) return null;

    const colors = {
      suno: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      mureka: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    };

    return (
      <Badge 
        variant="outline" 
        className={`text-xs ${colors[service as keyof typeof colors] || ''}`}
      >
        {service.toUpperCase()}
      </Badge>
    );
  };

  const handleCopyTrackId = () => {
    if (track.metadata?.suno_track_id) {
      navigator.clipboard.writeText(track.metadata.suno_track_id);
      toast({
        title: "ID скопирован",
        description: "ID трека скопирован в буфер обмена",
      });
    }
  };

  const handleOpenExternal = () => {
    if (track.audio_url) {
      window.open(track.audio_url, '_blank');
    }
  };

  return (
    <div 
      className={`
        group relative p-4 border rounded-lg transition-all duration-200 cursor-pointer
        ${isPlaying ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'}
      `}
      onClick={() => onSelect?.(track)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <h3 className="font-medium text-sm line-clamp-1 text-foreground">
              {track.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {getServiceBadge()}
            {getVariantBadge()}
            {track.duration && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(track.duration)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Play Button */}
          {track.audio_url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.(track);
              }}
            >
              <PlayCircle className={`h-4 w-4 ${isPlaying ? 'text-primary' : ''}`} />
            </Button>
          )}

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {track.metadata?.total_variants && track.metadata.total_variants > 1 && (
                <>
                  <DropdownMenuLabel>
                    Вариант {track.metadata.track_variant} из {track.metadata.total_variants}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {track.audio_url && (
                <>
                  <DropdownMenuItem onClick={() => onPlay?.(track)}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {isPlaying ? 'Играет' : 'Воспроизвести'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenExternal}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Открыть ссылку
                  </DropdownMenuItem>
                </>
              )}
              
              {track.metadata?.suno_track_id && (
                <DropdownMenuItem onClick={handleCopyTrackId}>
                  <Copy className="h-4 w-4 mr-2" />
                  Копировать ID
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                <MoreHorizontal className="h-4 w-4 mr-2" />
                {isExpanded ? 'Свернуть' : 'Показать действия'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded Actions */}
      {isExpanded && (
        <div className="border-t pt-3 mt-3" onClick={(e) => e.stopPropagation()}>
          <TrackActionButtons
            track={track}
            variant="full"
            onPlay={() => onPlay?.(track)}
            isPlaying={isPlaying}
            showLabels={true}
            className="flex-wrap gap-2"
          />
        </div>
      )}

      {/* Playing Indicator */}
      {isPlaying && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs text-primary">Играет</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook для работы с вариантами треков
export function useTrackVariants(generationId?: string) {
  const [variants, setVariants] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [primaryTrack, setPrimaryTrack] = useState<Track | null>(null);

  const loadVariants = async () => {
    if (!generationId) return;
    
    setLoading(true);
    try {
      // TODO: Загрузить все варианты трека по generation_id
      // const { data, error } = await supabase
      //   .from('tracks')
      //   .select('*')
      //   .eq('metadata->>generation_id', generationId)
      //   .order('metadata->>track_variant', { ascending: true });
      
      // if (!error && data) {
      //   setVariants(data);
      //   setPrimaryTrack(data.find(t => t.metadata?.is_primary) || data[0]);
      // }
    } catch (error) {
      console.error('Error loading track variants:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    variants,
    primaryTrack,
    loading,
    loadVariants,
  };
}