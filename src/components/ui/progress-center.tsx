/**
 * Progress Center Component
 * 
 * Fixed mini-panel showing all active AI generation tasks
 * Provides real-time progress updates and task management
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  ChevronUp, 
  ChevronDown, 
  Music, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  RotateCcw,
  Pause
} from 'lucide-react';
import { UnifiedTaskProgress, UnifiedTaskStatus } from '@/features/ai-generation/types/canonical';
import { cn } from '@/lib/utils';

interface ProgressCenterProps {
  activeGenerations: Map<string, UnifiedTaskProgress>;
  onCancel: (generationId: string) => void;
  onRetry: (generationId: string) => void;
  onClearCompleted: () => void;
  className?: string;
}

export function ProgressCenter({ 
  activeGenerations, 
  onCancel, 
  onRetry, 
  onClearCompleted,
  className 
}: ProgressCenterProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  const generations = Array.from(activeGenerations.values());
  const activeCount = generations.filter(g => 
    g.status !== 'completed' && g.status !== 'failed' && g.status !== 'cancelled'
  ).length;
  const completedCount = generations.filter(g => g.status === 'completed').length;
  const failedCount = generations.filter(g => g.status === 'failed').length;

  // Don't show if no generations
  if (generations.length === 0 || !isVisible) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]",
      className
    )}>
      <Card className="shadow-lg border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              Генерация треков
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeCount} активных
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? 
                  <ChevronDown className="h-3 w-3" /> : 
                  <ChevronUp className="h-3 w-3" />
                }
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Summary stats */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {activeCount > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                {activeCount} обрабатывается
              </span>
            )}
            {completedCount > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {completedCount} готово
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500" />
                {failedCount} ошибок
              </span>
            )}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 space-y-3 max-h-64 overflow-y-auto">
            {generations.map((generation) => (
              <GenerationCard
                key={generation.generationId}
                generation={generation}
                onCancel={onCancel}
                onRetry={onRetry}
              />
            ))}
            
            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-border/50">
              {completedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearCompleted}
                  className="text-xs"
                >
                  Очистить завершенные
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

interface GenerationCardProps {
  generation: UnifiedTaskProgress;
  onCancel: (generationId: string) => void;
  onRetry: (generationId: string) => void;
}

function GenerationCard({ generation, onCancel, onRetry }: GenerationCardProps) {
  const getStatusConfig = (status: UnifiedTaskStatus) => {
    switch (status) {
      case 'pending':
      case 'queued':
        return { 
          color: 'bg-yellow-500', 
          icon: Clock, 
          text: 'В очереди',
          variant: 'secondary' as const
        };
      case 'initializing':
      case 'generating':
      case 'processing':
        return { 
          color: 'bg-blue-500', 
          icon: Music, 
          text: 'Генерируется',
          variant: 'secondary' as const
        };
      case 'finalizing':
        return { 
          color: 'bg-blue-500', 
          icon: Music, 
          text: 'Финализация',
          variant: 'secondary' as const
        };
      case 'completed':
        return { 
          color: 'bg-green-500', 
          icon: CheckCircle2, 
          text: 'Готово',
          variant: 'default' as const
        };
      case 'failed':
        return { 
          color: 'bg-red-500', 
          icon: AlertCircle, 
          text: 'Ошибка',
          variant: 'destructive' as const
        };
      case 'timeout':
        return { 
          color: 'bg-orange-500', 
          icon: Clock, 
          text: 'Таймаут',
          variant: 'destructive' as const
        };
      case 'cancelled':
        return { 
          color: 'bg-gray-500', 
          icon: Pause, 
          text: 'Отменено',
          variant: 'outline' as const
        };
      default:
        return { 
          color: 'bg-gray-500', 
          icon: Clock, 
          text: 'Неизвестно',
          variant: 'outline' as const
        };
    }
  };

  const statusConfig = getStatusConfig(generation.status);
  const StatusIcon = statusConfig.icon;
  const isActive = generation.status !== 'completed' && 
                   generation.status !== 'failed' && 
                   generation.status !== 'cancelled';
  
  const currentStep = generation.steps.find(step => step.status === 'running');
  const eta = generation.estimatedCompletion ? 
    Math.max(0, Math.floor((generation.estimatedCompletion.getTime() - Date.now()) / 1000)) : 
    null;

  return (
    <div className="p-3 rounded-md border border-border/50 bg-background/50 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className={cn("w-3 h-3", {
              "animate-pulse": isActive,
              "text-yellow-600": generation.status === 'pending' || generation.status === 'queued',
              "text-blue-600": generation.status === 'generating' || generation.status === 'processing',
              "text-green-600": generation.status === 'completed',
              "text-red-600": generation.status === 'failed',
              "text-orange-600": generation.status === 'timeout'
            })} />
            <span className="text-xs font-medium truncate">
              {generation.title}
            </span>
            <Badge variant={statusConfig.variant} className="text-xs py-0">
              {statusConfig.text}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {generation.subtitle}
          </p>
          {currentStep && (
            <p className="text-xs text-primary">
              {currentStep.label}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-1">
          {generation.status === 'failed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(generation.generationId)}
              className="h-6 w-6 p-0"
              title="Повторить"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(generation.generationId)}
              className="h-6 w-6 p-0"
              title="Отменить"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="space-y-1">
          <Progress value={generation.overallProgress} className="h-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{generation.overallProgress}%</span>
            {eta && eta > 0 && (
              <span>~{eta}с</span>
            )}
          </div>
        </div>
      )}

      {/* Service badge */}
      <div className="flex justify-end">
        <Badge variant="outline" className="text-xs">
          {generation.service === 'suno' ? 'Suno AI' : 'Mureka'}
        </Badge>
      </div>
    </div>
  );
}