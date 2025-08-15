import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Music2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackSkeletonProps {
  progress?: number;
  title?: string;
  subtitle?: string;
  status?: 'preparing' | 'generating' | 'processing' | 'saving' | 'completed' | 'error';
  animated?: boolean;
  className?: string;
  steps?: Array<{
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
  }>;
}

export function TrackSkeleton({ 
  progress = 0, 
  title = "Генерируем трек...",
  subtitle,
  status = 'preparing',
  animated = true,
  className,
  steps = []
}: TrackSkeletonProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'preparing':
        return {
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          icon: Loader2,
          text: 'Подготовка'
        };
      case 'generating':
        return {
          color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
          icon: Loader2,
          text: 'Генерация'
        };
      case 'processing':
        return {
          color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
          icon: Loader2,
          text: 'Обработка'
        };
      case 'saving':
        return {
          color: 'bg-green-500/10 text-green-600 border-green-500/20',
          icon: Loader2,
          text: 'Сохранение'
        };
      case 'completed':
        return {
          color: 'bg-success/10 text-success border-success/20',
          icon: CheckCircle2,
          text: 'Готово'
        };
      case 'error':
        return {
          color: 'bg-destructive/10 text-destructive border-destructive/20',
          icon: AlertCircle,
          text: 'Ошибка'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={cn(
      "shadow-card border transition-all duration-300",
      animated && "animate-fade-in",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Music2 className="h-4 w-4 text-muted-foreground" />
              <div className="text-base font-semibold">
                {title}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={statusConfig.color}>
                <StatusIcon className={cn(
                  "h-3 w-3 mr-1",
                  status !== 'completed' && status !== 'error' && "animate-spin"
                )} />
                {statusConfig.text}
              </Badge>
              
              {subtitle && (
                <span className="text-sm text-muted-foreground">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-medium text-muted-foreground">
              {progress}%
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress 
            value={progress} 
            className={cn(
              "h-2 transition-all duration-500",
              animated && "animate-pulse"
            )} 
          />
        </div>

        {/* Steps visualization */}
        {steps.length > 0 && (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3 text-sm">
                <div className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-xs",
                  step.status === 'done' && "bg-success text-success-foreground",
                  step.status === 'running' && "bg-primary text-primary-foreground animate-pulse",
                  step.status === 'error' && "bg-destructive text-destructive-foreground",
                  step.status === 'pending' && "bg-muted text-muted-foreground"
                )}>
                  {step.status === 'done' && '✓'}
                  {step.status === 'running' && (
                    <Loader2 className="h-2 w-2 animate-spin" />
                  )}
                  {step.status === 'error' && '✗'}
                  {step.status === 'pending' && (index + 1)}
                </div>
                <span className={cn(
                  "transition-colors",
                  step.status === 'done' && "text-success",
                  step.status === 'running' && "text-primary font-medium",
                  step.status === 'error' && "text-destructive",
                  step.status === 'pending' && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Shimmer content placeholder */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}