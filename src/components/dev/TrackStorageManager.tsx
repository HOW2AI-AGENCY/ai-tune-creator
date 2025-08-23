import React, { useEffect } from 'react';
import { useTrackStorage } from '@/hooks/useTrackStorage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CloudDownload, CheckCircle2, AlertCircle, Loader2, ListChecks, RefreshCw, Clock, AlertTriangle } from 'lucide-react';

export function TrackStorageManager() {
  const { loading, status, getStorageStatus, syncTracksToStorage } = useTrackStorage();

  // Load status on mount
  useEffect(() => {
    getStorageStatus();
  }, [getStorageStatus]);

  const handleSync = async () => {
    await syncTracksToStorage();
  };

  const handleRefresh = async () => {
    await getStorageStatus();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudDownload className="h-5 w-5" />
          Синхронизация аудио с хранилищем
        </CardTitle>
        <CardDescription>
          Автоматически находит завершённые генерации без локального файла и загружает их в безопасное хранилище (track-audio/userId/service/taskId/*).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold">{status.total}</div>
              <div className="text-xs text-muted-foreground">Всего треков</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded-lg">
              <div className="text-lg font-semibold text-yellow-700">{status.pending}</div>
              <div className="text-xs text-yellow-600">К загрузке</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-700">{status.downloading}</div>
              <div className="text-xs text-blue-600">Загружаются</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-700">{status.completed}</div>
              <div className="text-xs text-green-600">Готово</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <div className="text-lg font-semibold text-red-700">{status.failed}</div>
              <div className="text-xs text-red-600">Ошибки</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button 
            onClick={handleSync} 
            disabled={loading || (status?.pending === 0)} 
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListChecks className="h-4 w-4" />
            )}
            {loading ? 'Синхронизируем…' : `Синхронизировать ${status?.pending || 0} треков`}
          </Button>

          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить статус
          </Button>
        </div>

        {/* Status Alerts */}
        {status?.pending === 0 && status?.total > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Все треки успешно синхронизированы с хранилищем.
            </AlertDescription>
          </Alert>
        )}

        {status?.failed > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {status.failed} треков не удалось загрузить. Проверьте логи или повторите попытку.
            </AlertDescription>
          </Alert>
        )}

        {status?.downloading > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {status.downloading} треков в процессе загрузки. Подождите завершения или обновите статус.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
