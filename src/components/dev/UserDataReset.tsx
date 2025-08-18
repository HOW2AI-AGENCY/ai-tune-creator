import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResetResults {
  summary: {
    total_deleted_generations: number;
    total_deleted_tracks: number;
    total_deleted_assets: number;
    total_deleted_versions: number;
    errors_count: number;
  };
  errors: any[];
  timestamp: string;
}

export const UserDataReset: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [results, setResults] = useState<ResetResults | null>(null);

  const handleReset = async () => {
    setIsResetting(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('reset-user-data', {
        body: {}
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setResults(data.data);
        toast.success('Данные пользователя успешно сброшены');
      } else {
        throw new Error(data.error || 'Неизвестная ошибка');
      }
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error(`Ошибка сброса: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Сброс данных пользователя
        </CardTitle>
        <CardDescription>
          Удаление всех зависших треков, неудачных генераций и очистка истории
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Внимание!</strong> Эта операция удалит:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Все зависшие генерации (pending, processing, failed)</li>
              <li>Треки без аудиофайлов</li>
              <li>Треки помеченные как удаленные</li>
              <li>Старые генерации без треков (старше 7 дней)</li>
              <li>Связанные активы и версии треков</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleReset}
          disabled={isResetting}
          variant="destructive"
          className="w-full"
        >
          {isResetting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Выполняется сброс...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Сбросить данные пользователя
            </>
          )}
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Badge variant="destructive" className="w-full justify-center">
                  Удалено генераций: {results.summary.total_deleted_generations}
                </Badge>
                <Badge variant="destructive" className="w-full justify-center">
                  Удалено треков: {results.summary.total_deleted_tracks}
                </Badge>
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="w-full justify-center">
                  Удалено активов: {results.summary.total_deleted_assets}
                </Badge>
                <Badge variant="outline" className="w-full justify-center">
                  Удалено версий: {results.summary.total_deleted_versions}
                </Badge>
              </div>
            </div>

            {results.summary.errors_count > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Предупреждения:</strong> {results.summary.errors_count} ошибок при выполнении операций.
                  <details className="mt-2">
                    <summary className="cursor-pointer">Показать детали</summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(results.errors, null, 2)}
                    </pre>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-muted-foreground">
              Операция выполнена: {new Date(results.timestamp).toLocaleString('ru-RU')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};