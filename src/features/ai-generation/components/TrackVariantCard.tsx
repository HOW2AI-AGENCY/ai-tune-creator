import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackVariant {
  id: string;
  title: string;
  variant_number: number;
  is_master_variant: boolean;
  audio_url?: string;
  duration?: number;
  created_at?: string;
}

interface TrackVariantCardProps {
  variant: TrackVariant;
  isPlaying: boolean;
  isCurrentlyPlaying: boolean;
  onPlay: () => void;
  onDownload: () => void;
  onSetMaster: () => void;
  showSetMaster?: boolean;
}

export function TrackVariantCard({
  variant,
  isPlaying,
  isCurrentlyPlaying,
  onPlay,
  onDownload,
  onSetMaster,
  showSetMaster = true
}: TrackVariantCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        variant.is_master_variant && "border-primary/50 bg-primary/5"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Play Button */}
          <Button
            size="icon"
            variant={isCurrentlyPlaying ? "default" : "outline"}
            onClick={onPlay}
            className="shrink-0"
          >
            {isCurrentlyPlaying && isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Variant Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Вариант {variant.variant_number}
              </Badge>
              {variant.is_master_variant && (
                <Badge variant="default" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Главный
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {formatDuration(variant.duration)}
            </p>
          </div>

          {/* Actions */}
          <div className={cn(
            "flex items-center gap-2 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            {showSetMaster && !variant.is_master_variant && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSetMaster}
                title="Сделать главным вариантом"
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onDownload}
              title="Скачать"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
