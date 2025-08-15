import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, RefreshCw } from "lucide-react";
import { AIGeneration, useGenerationState } from '../hooks/useGenerationState';
import { GenerationTrackCard } from './GenerationTrackCard';
import { TrackSkeleton } from "@/components/ui/track-skeleton";
import { useTrackGenerationWithProgress } from '../hooks/useTrackGenerationWithProgress';

interface GenerationFeedProps {
  onPlay?: (url: string) => void;
  onDownload?: (url: string, filename: string) => void;
}

export function GenerationFeed({ onPlay, onDownload }: GenerationFeedProps) {
  const { 
    generations, 
    isLoading, 
    isRefreshing, 
    loadGenerations, 
    checkGenerationStatus, 
    syncTracks 
  } = useGenerationState();
  
  const { ongoingGenerations } = useTrackGenerationWithProgress();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground mb-4 animate-spin" />
        <p className="text-muted-foreground">Загрузка генераций...</p>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="text-center py-12">
        <Music2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Пока нет генераций</h3>
        <p className="text-muted-foreground mb-6">Создайте первый трек с помощью формы слева</p>
        <Button 
          variant="outline" 
          onClick={syncTracks}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Синхронизировать треки
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Генерации ({generations.length})</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadGenerations}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={syncTracks}
            disabled={isRefreshing}
          >
            Синхронизировать
          </Button>
        </div>
      </div>

      {/* Show ongoing generations first */}
      {ongoingGenerations.map((generation) => (
        <TrackSkeleton
          key={generation.taskId}
          progress={generation.progress}
          title={generation.title}
          subtitle={generation.subtitle}
          status={generation.status}
          steps={generation.steps}
          animated={true}
        />
      ))}
      
      {/* Show completed generations */}
      {generations.map((generation) => (
        <GenerationTrackCard
          key={generation.id}
          generation={generation}
          onCheckStatus={checkGenerationStatus}
          onPlay={onPlay}
          onDownload={onDownload}
          isRefreshing={isRefreshing}
        />
      ))}
    </div>
  );
}
