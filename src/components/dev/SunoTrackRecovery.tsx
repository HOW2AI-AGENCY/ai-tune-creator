import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface RecoveryResults {
  summary: {
    total_checked: number;
    recovered_generations: number;
    failed_recoveries: number;
    tracks_created: number;
    tracks_downloaded: number;
    errors_count: number;
  };
  errors: Array<{
    generation_id: string;
    external_id?: string;
    error: string;
  }>;
  timestamp: string;
}

export function SunoTrackRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [results, setResults] = useState<RecoveryResults | null>(null);
  const { toast } = useToast();

  const startRecovery = async () => {
    setIsRecovering(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('recover-suno-tracks', {
        body: {}
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Recovery failed');
      }

      setResults(data.data);
      
      toast({
        title: "Восстановление завершено",
        description: `Проверено: ${data.data.summary.total_checked}, восстановлено: ${data.data.summary.recovered_generations}`,
      });

    } catch (error: any) {
      console.error('Recovery error:', error);
      toast({
        title: "Ошибка восстановления",
        description: error.message || 'Произошла ошибка при восстановлении треков',
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Восстановление Suno треков
        </CardTitle>
        <CardDescription>
          Восстанавливает незагруженные треки из базы данных через Suno API
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={startRecovery}
            disabled={isRecovering}
            className="flex items-center gap-2"
          >
            {isRecovering ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isRecovering ? 'Восстанавливаем...' : 'Запустить восстановление'}
          </Button>
          
          {isRecovering && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Обработка...
            </Badge>
          )}
        </div>

        {results && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Восстановление завершено {new Date(results.timestamp).toLocaleString()}
              </AlertDescription>
            </Alert>

            {/* Статистика */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.summary.total_checked}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Проверено генераций
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.summary.recovered_generations}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Восстановлено
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {results.summary.tracks_created}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Создано треков
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {results.summary.tracks_downloaded}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Скачано
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.summary.failed_recoveries}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Неудачных попыток
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {results.summary.errors_count}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ошибок
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Детали ошибок */}
            {results.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Ошибки восстановления ({results.errors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription className="text-sm">
                          <div><strong>Generation ID:</strong> {error.generation_id}</div>
                          {error.external_id && (
                            <div><strong>External ID:</strong> {error.external_id}</div>
                          )}
                          <div><strong>Ошибка:</strong> {error.error}</div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Успешный результат */}
            {results.summary.recovered_generations > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Успешно восстановлено {results.summary.recovered_generations} генераций, 
                  создано {results.summary.tracks_created} треков, 
                  скачано {results.summary.tracks_downloaded} файлов.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Как это работает:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Ищет генерации Suno без результатов или треков</li>
              <li>• Запрашивает актуальную информацию через Suno API</li>
              <li>• Обновляет записи в базе данных</li>
              <li>• Создает треки для успешных генераций</li>
              <li>• Скачивает аудиофайлы в локальное хранилище</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}