import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface SyncProgressNotificationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function SyncProgressNotification({ 
  isVisible, 
  onComplete 
}: SyncProgressNotificationProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'syncing' | 'success' | 'error'>('syncing');
  const [currentStep, setCurrentStep] = useState('Подготовка синхронизации...');

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setStatus('syncing');
      setCurrentStep('Подготовка синхронизации...');
      return;
    }

    // Simulate sync progress
    const steps = [
      'Подключение к серверу...',
      'Загрузка треков...',
      'Проверка статусов генераций...',
      'Обновление метаданных...',
      'Синхронизация завершена!'
    ];

    let currentStepIndex = 0;
    let currentProgress = 0;

    const interval = setInterval(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStep(steps[currentStepIndex]);
        currentProgress += 20;
        setProgress(currentProgress);
        currentStepIndex++;
      } else {
        setCurrentStep(steps[steps.length - 1]);
        setProgress(100);
        setStatus('success');
        
        setTimeout(() => {
          onComplete?.();
        }, 1500);
        
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-2 z-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {status === 'syncing' && (
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle className="h-5 w-5 text-success" />
          )}
          {status === 'error' && (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">Синхронизация</span>
              <Badge variant={status === 'success' ? 'default' : 'secondary'}>
                {Math.round(progress)}%
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">{currentStep}</p>
        </div>
      </CardContent>
    </Card>
  );
}