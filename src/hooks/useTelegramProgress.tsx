import { useCallback, useEffect, useState } from 'react';
import { useTelegramMainButton, useTelegramHaptics } from './useTelegramWebApp';

interface ProgressStage {
  key: string;
  name: string;
  description: string;
  duration?: number;
}

const DEFAULT_STAGES: ProgressStage[] = [
  { 
    key: 'analyzing', 
    name: 'Analyzing', 
    description: 'Processing your request...',
    duration: 5000
  },
  { 
    key: 'generating', 
    name: 'Generating', 
    description: 'AI is composing your music...',
    duration: 30000
  },
  { 
    key: 'processing', 
    name: 'Processing', 
    description: 'Finalizing audio quality...',
    duration: 10000
  },
  { 
    key: 'completing', 
    name: 'Completing', 
    description: 'Almost ready...',
    duration: 5000
  }
];

interface UseTelegramProgressProps {
  stages?: ProgressStage[];
  onComplete?: () => void;
  onCancel?: () => void;
}

export function useTelegramProgress({ 
  stages = DEFAULT_STAGES, 
  onComplete, 
  onCancel 
}: UseTelegramProgressProps = {}) {
  const { showMainButton, hideMainButton } = useTelegramMainButton();
  const { notificationFeedback, impactFeedback } = useTelegramHaptics();

  const [isActive, setIsActive] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const currentStage = stages[currentStageIndex];

  const startProgress = useCallback(() => {
    setIsActive(true);
    setCurrentStageIndex(0);
    setProgress(0);
    setStartTime(Date.now());
    
    // Show cancel button
    showMainButton('Cancel', () => {
      setIsActive(false);
      hideMainButton();
      onCancel?.();
      impactFeedback?.('medium');
    });

    impactFeedback?.('light');
  }, [showMainButton, hideMainButton, onCancel, impactFeedback]);

  const completeProgress = useCallback(() => {
    setIsActive(false);
    setProgress(100);
    hideMainButton();
    
    notificationFeedback?.('success');
    onComplete?.();
  }, [hideMainButton, notificationFeedback, onComplete]);

  const failProgress = useCallback((error?: string) => {
    setIsActive(false);
    hideMainButton();
    
    notificationFeedback?.('error');
  }, [hideMainButton, notificationFeedback]);

  const updateProgress = useCallback((newProgress: number, stageIndex?: number) => {
    if (stageIndex !== undefined) {
      setCurrentStageIndex(stageIndex);
    }
    setProgress(Math.min(100, Math.max(0, newProgress)));
    
    // Progress updates will be handled by the progress overlay UI
  }, [isActive, currentStage]);

  // Auto-progress simulation when stages have durations
  useEffect(() => {
    if (!isActive || !startTime || !currentStage?.duration) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const stageStart = stages.slice(0, currentStageIndex).reduce((sum, stage) => sum + (stage.duration || 0), 0);
      const stageElapsed = elapsed - stageStart;
      const stageProgress = Math.min(100, (stageElapsed / currentStage.duration) * 100);
      
      // Calculate overall progress
      const completedStages = stages.slice(0, currentStageIndex).reduce((sum, stage) => sum + (stage.duration || 0), 0);
      const totalDuration = stages.reduce((sum, stage) => sum + (stage.duration || 0), 0);
      const overallProgress = ((completedStages + (stageElapsed / currentStage.duration) * currentStage.duration) / totalDuration) * 100;
      
      setProgress(overallProgress);

      // Move to next stage
      if (stageElapsed >= currentStage.duration) {
        if (currentStageIndex < stages.length - 1) {
          setCurrentStageIndex(prev => prev + 1);
          impactFeedback?.('light');
        } else {
          clearInterval(interval);
          completeProgress();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, startTime, currentStageIndex, currentStage, stages, impactFeedback, completeProgress]);

  const getEstimatedTimeRemaining = useCallback(() => {
    if (!isActive || !startTime || !currentStage?.duration) return null;

    const elapsed = Date.now() - startTime;
    const remaining = stages.slice(currentStageIndex).reduce((sum, stage) => sum + (stage.duration || 0), 0);
    const stageStart = stages.slice(0, currentStageIndex).reduce((sum, stage) => sum + (stage.duration || 0), 0);
    const stageElapsed = elapsed - stageStart;
    
    return Math.max(0, remaining - stageElapsed);
  }, [isActive, startTime, currentStageIndex, currentStage, stages]);

  return {
    isActive,
    currentStage,
    currentStageIndex,
    progress,
    startProgress,
    completeProgress,
    failProgress,
    updateProgress,
    estimatedTimeRemaining: getEstimatedTimeRemaining(),
    totalStages: stages.length
  };
}