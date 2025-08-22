import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useTelegramProgress } from '@/hooks/useTelegramProgress';
import { useTelegramTheme } from '@/hooks/useTelegramTheme';
import { useTelegramHaptics } from '@/hooks/useTelegramWebApp';
import { useTranslation } from '@/hooks/useTranslation';
import { Wand2, Music, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TelegramGenerationProgressProps {
  isActive: boolean;
  onCancel?: () => void;
  onComplete?: () => void;
  className?: string;
}

const MUSIC_GENERATION_STAGES = [
  {
    key: 'analyzing',
    name: 'Analyzing prompt',
    description: 'Understanding your creative vision...',
    duration: 3000,
    icon: '🔍'
  },
  {
    key: 'composing',
    name: 'Composing melody',
    description: 'AI is creating the musical structure...',
    duration: 25000,
    icon: '🎼'
  },
  {
    key: 'vocals',
    name: 'Adding vocals',
    description: 'Generating vocal performance...',
    duration: 15000,
    icon: '🎤'
  },
  {
    key: 'mixing',
    name: 'Mixing & mastering',
    description: 'Perfecting audio quality...',
    duration: 7000,
    icon: '🎚️'
  }
];

export function TelegramGenerationProgress({
  isActive,
  onCancel,
  onComplete,
  className
}: TelegramGenerationProgressProps) {
  const { t } = useTranslation();
  const { isInTelegram } = useTelegramTheme();
  const { impactFeedback, notificationFeedback } = useTelegramHaptics();

  const {
    isActive: progressActive,
    currentStage,
    progress,
    startProgress,
    completeProgress,
    estimatedTimeRemaining,
    totalStages,
    currentStageIndex
  } = useTelegramProgress({
    stages: MUSIC_GENERATION_STAGES,
    onComplete: () => {
      notificationFeedback?.('success');
      onComplete?.();
    },
    onCancel: () => {
      impactFeedback?.('medium');
      onCancel?.();
    }
  });

  // Start progress when component becomes active
  useEffect(() => {
    if (isActive && !progressActive) {
      startProgress();
    } else if (!isActive && progressActive) {
      completeProgress();
    }
  }, [isActive, progressActive, startProgress, completeProgress]);

  if (!isActive && !progressActive) {
    return null;
  }

  const formatTimeRemaining = (ms: number | null) => {
    if (!ms) return null;
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const timeRemaining = formatTimeRemaining(estimatedTimeRemaining);

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/95 backdrop-blur-sm",
      "flex items-center justify-center p-4",
      isInTelegram && "pt-safe-area-inset-top pb-safe-area-inset-bottom",
      className
    )}>
      <Card className="w-full max-w-sm mx-auto">
        <div className="p-6 text-center space-y-6">
          {/* Main Animation */}
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div 
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary transition-transform duration-300"
                style={{
                  transform: `rotate(${(progress / 100) * 360}deg)`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wand2 className="h-6 w-6 text-primary animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Info */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Creating your music...</h2>
            {currentStage && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span className="text-lg">{MUSIC_GENERATION_STAGES[currentStageIndex]?.icon}</span>
                  <span>{currentStage.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentStage.description}
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="w-full h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {currentStageIndex + 1} of {totalStages}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            {timeRemaining && (
              <p className="text-xs text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                ~{timeRemaining} remaining
              </p>
            )}
          </div>

          {/* Stage Indicators */}
          <div className="flex justify-center gap-2">
            {MUSIC_GENERATION_STAGES.map((stage, index) => (
              <div
                key={stage.key}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index < currentStageIndex && "bg-primary",
                  index === currentStageIndex && "bg-primary animate-pulse",
                  index > currentStageIndex && "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Cancel Button (only for non-Telegram or as backup) */}
          {!isInTelegram && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="mt-4"
            >
              Cancel Generation
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}