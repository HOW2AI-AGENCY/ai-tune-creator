import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause,
  Download, 
  Music,
  Clock,
  Eye,
  Layers,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrackVariantCard } from "./TrackVariantCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Track {
  id: string;
  title: string;
  variant_number?: number;
  is_master_variant?: boolean;
  variant_group_id?: string;
  duration?: number;
  audio_url?: string;
  created_at?: string;
  metadata?: any;
  project?: {
    title: string;
    artist?: {
      name: string;
    };
  };
}

interface GroupedTrackCardProps {
  masterTrack: Track;
  variants: Track[];
  onTrackClick: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  currentPlayingTrack: Track | null;
  isPlaying: boolean;
  onDownload: (track: Track) => void;
  onSetMaster: (trackId: string) => void;
}

export function GroupedTrackCard({
  masterTrack,
  variants,
  onTrackClick,
  onPlayTrack,
  currentPlayingTrack,
  isPlaying,
  onDownload,
  onSetMaster
}: GroupedTrackCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCurrentTrackPlaying = currentPlayingTrack?.id === masterTrack.id && isPlaying;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover-lift overflow-hidden">
      <CardContent className="p-4">
        {/* Master Track Display */}
        <div className="flex items-start gap-4">
          {/* Play Button */}
          <Button
            size="icon"
            variant={isCurrentTrackPlaying ? "default" : "outline"}
            onClick={() => onPlayTrack(masterTrack)}
            className="shrink-0 h-12 w-12"
          >
            {isCurrentTrackPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-semibold text-base truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => onTrackClick(masterTrack)}
                >
                  {masterTrack.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {masterTrack.project?.artist?.name || 'Unknown Artist'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0">
                  <Layers className="h-3 w-3 mr-1" />
                  {variants.length} версий
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(masterTrack.duration)}
              </span>
              <span>{formatDate(masterTrack.created_at)}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDownload(masterTrack)}
              >
                <Download className="h-4 w-4 mr-2" />
                Скачать
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onTrackClick(masterTrack)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Детали
              </Button>

              {/* Variants Toggle */}
              {variants.length > 1 && (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Скрыть версии
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Показать версии
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>
          </div>
        </div>

        {/* Variants List */}
        {variants.length > 1 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="mt-4 space-y-2 pl-16">
              {variants
                .filter(v => v.id !== masterTrack.id)
                .map((variant) => (
                  <TrackVariantCard
                    key={variant.id}
                    variant={{
                      id: variant.id,
                      title: variant.title,
                      variant_number: variant.variant_number || 1,
                      is_master_variant: variant.is_master_variant || false,
                      audio_url: variant.audio_url,
                      duration: variant.duration,
                      created_at: variant.created_at
                    }}
                    isPlaying={isPlaying}
                    isCurrentlyPlaying={currentPlayingTrack?.id === variant.id}
                    onPlay={() => onPlayTrack(variant)}
                    onDownload={() => onDownload(variant)}
                    onSetMaster={() => onSetMaster(variant.id)}
                  />
                ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
