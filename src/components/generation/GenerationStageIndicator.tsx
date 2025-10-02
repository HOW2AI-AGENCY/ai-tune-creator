/**
 * Generation Stage Indicator Component
 * Отображает этапы генерации как на скриншоте Suno AI
 */

import { Check, X, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationStage } from '@/lib/generation/generation-monitor';

interface GenerationStageIndicatorProps {
  stages: GenerationStage[];
  currentStage?: string;
  className?: string;
}

export function GenerationStageIndicator({ 
  stages, 
  currentStage,
  className 
}: GenerationStageIndicatorProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {stages.map((stage, index) => {
        const isActive = stage.id === currentStage;
        const isCurrent = isActive && stage.status === 'running';
        
        return (
          <div
            key={stage.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              isCurrent && "bg-primary/5",
              stage.status === 'error' && "bg-destructive/5"
            )}
          >
            {/* Номер этапа */}
            <span className={cn(
              "flex-shrink-0 text-sm font-medium tabular-nums",
              stage.status === 'completed' && "text-emerald-500",
              stage.status === 'error' && "text-destructive",
              stage.status === 'running' && "text-primary",
              stage.status === 'pending' && "text-muted-foreground"
            )}>
              {index + 1}
            </span>

            {/* Иконка статуса */}
            <div className="flex-shrink-0">
              {stage.status === 'completed' && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              {stage.status === 'error' && (
                <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              {stage.status === 'running' && (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              )}
              {stage.status === 'pending' && (
                <Circle className="w-5 h-5 text-muted-foreground/30" />
              )}
            </div>

            {/* Название этапа */}
            <span className={cn(
              "flex-1 text-sm",
              stage.status === 'completed' && "text-foreground",
              stage.status === 'error' && "text-destructive",
              stage.status === 'running' && "text-foreground font-medium",
              stage.status === 'pending' && "text-muted-foreground"
            )}>
              {stage.name}
            </span>

            {/* Прогресс (если есть) */}
            {stage.progress !== undefined && stage.status === 'running' && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {stage.progress}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
