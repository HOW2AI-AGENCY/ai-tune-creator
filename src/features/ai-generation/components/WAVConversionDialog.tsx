/**
 * @fileoverview WAV Conversion Dialog for Suno tracks
 * @version 0.01.036
 * @author Claude Code Assistant
 * 
 * TODO: Implement additional WAV conversion features:
 * - Quality selection (16-bit, 24-bit, 32-bit)
 * - Sample rate options (44.1kHz, 48kHz, 96kHz)
 * - Batch conversion for multiple tracks
 * - Progress tracking with real-time updates
 * - Integration with Suno API documentation requirements
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Music, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useTrackActions } from '@/hooks/useTrackActions';
import { toast } from 'sonner';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  metadata?: any;
}

interface WAVConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track;
}

interface ConversionStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  wavUrl?: string;
  error?: string;
}

export function WAVConversionDialog({ 
  open, 
  onOpenChange, 
  track 
}: WAVConversionDialogProps) {
  const { convertToWAV, getWAVConversionStatus, isConverting } = useTrackActions();
  
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus>({
    status: 'pending'
  });
  const [isChecking, setIsChecking] = useState(false);

  // Check if track supports WAV conversion
  const isSupported = track.metadata?.service === 'suno' && track.metadata?.external_id;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentTaskId(null);
      setConversionStatus({ status: 'pending' });
    }
  }, [open]);

  // Poll conversion status
  useEffect(() => {
    if (!currentTaskId || conversionStatus.status === 'completed' || conversionStatus.status === 'failed') {
      return;
    }

    const pollStatus = async () => {
      try {
        setIsChecking(true);
        const statusData = await getWAVConversionStatus(currentTaskId);
        
        if (statusData.completed) {
          setConversionStatus({
            status: 'completed',
            progress: 100,
            wavUrl: statusData.wavUrl,
          });
          
          toast.success('WAV конвертация завершена!');
        } else if (statusData.failed) {
          setConversionStatus({
            status: 'failed',
            error: statusData.error || 'Конвертация не удалась',
          });
          
          toast.error('Ошибка конвертации WAV');
        } else {
          // Still processing
          setConversionStatus({
            status: 'processing',
            progress: statusData.progress || 50,
          });
        }
      } catch (error: any) {
        console.error('Error checking WAV status:', error);
        setConversionStatus({
          status: 'failed',
          error: error.message || 'Ошибка проверки статуса',
        });
      } finally {
        setIsChecking(false);
      }
    };

    const interval = setInterval(pollStatus, 3000); // Check every 3 seconds
    pollStatus(); // Initial check

    return () => clearInterval(interval);
  }, [currentTaskId, conversionStatus.status, getWAVConversionStatus]);

  const handleStartConversion = async () => {
    try {
      const taskId = await convertToWAV(track);
      setCurrentTaskId(taskId);
      setConversionStatus({ status: 'processing', progress: 0 });
    } catch (error: any) {
      setConversionStatus({
        status: 'failed',
        error: error.message || 'Не удалось начать конвертацию',
      });
    }
  };

  const handleDownloadWAV = () => {
    if (conversionStatus.wavUrl) {
      window.open(conversionStatus.wavUrl, '_blank', 'noopener,noreferrer');
      toast.success('Загрузка WAV файла начата');
    }
  };

  const handleRetry = () => {
    setCurrentTaskId(null);
    setConversionStatus({ status: 'pending' });
  };

  const getStatusIcon = () => {
    switch (conversionStatus.status) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Music className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (conversionStatus.status) {
      case 'processing':
        return 'Конвертируется в WAV...';
      case 'completed':
        return 'WAV файл готов!';
      case 'failed':
        return 'Ошибка конвертации';
      default:
        return 'Готов к конвертации';
    }
  };

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              WAV Конвертация
            </DialogTitle>
            <DialogDescription>
              Конвертация недоступна для этого трека
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium text-muted-foreground">
                  WAV конвертация доступна только для треков Suno
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Этот трек был создан через {track.metadata?.service || 'другой'} сервис
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            WAV Конвертация
          </DialogTitle>
          <DialogDescription>
            Конвертировать трек в высококачественный WAV формат
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Track Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Трек</h4>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Music className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">{track.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {track.metadata?.service || 'Suno'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ID: {track.metadata?.external_id?.slice(-8)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="text-sm font-medium">{getStatusText()}</p>
                {conversionStatus.error && (
                  <p className="text-xs text-red-500 mt-1">{conversionStatus.error}</p>
                )}
              </div>
              {isChecking && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Progress Bar */}
            {conversionStatus.status === 'processing' && (
              <div className="space-y-2">
                <Progress 
                  value={conversionStatus.progress || 0} 
                  className="h-2"
                />
                <p className="text-xs text-center text-muted-foreground">
                  {conversionStatus.progress || 0}% завершено
                </p>
              </div>
            )}

            {/* WAV File Info */}
            {conversionStatus.status === 'completed' && conversionStatus.wavUrl && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">WAV файл готов к загрузке</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Высокое качество • 44.1kHz • 16-bit
                </p>
              </div>
            )}
          </div>

          {/* TODO: Add quality options in future */}
          {conversionStatus.status === 'pending' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Параметры конвертации</h4>
              <div className="text-sm text-muted-foreground">
                <p>• Формат: WAV (без сжатия)</p>
                <p>• Качество: 44.1kHz, 16-bit</p>
                <p>• Время конвертации: ~30-60 секунд</p>
              </div>
              {/* TODO: Add quality selector component */}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center gap-2">
          {conversionStatus.status === 'pending' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button 
                onClick={handleStartConversion} 
                disabled={isConverting}
                className="flex items-center gap-2"
              >
                {isConverting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Music className="h-4 w-4" />
                )}
                Конвертировать
              </Button>
            </>
          )}

          {conversionStatus.status === 'processing' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Свернуть
            </Button>
          )}

          {conversionStatus.status === 'completed' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Закрыть
              </Button>
              <Button onClick={handleDownloadWAV} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Скачать WAV
              </Button>
            </>
          )}

          {conversionStatus.status === 'failed' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Закрыть
              </Button>
              <Button onClick={handleRetry} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Попробовать снова
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}