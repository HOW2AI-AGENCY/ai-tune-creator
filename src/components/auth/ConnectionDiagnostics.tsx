import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, Wifi } from "lucide-react";

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function ConnectionDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    const diagnostics: DiagnosticResult[] = [];

    // 1. Проверка интернет-соединения
    try {
      const response = await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        cache: 'no-cache'
      });
      diagnostics.push({
        name: 'Интернет-соединение',
        status: 'success',
        message: 'Подключение к интернету работает'
      });
    } catch (error) {
      diagnostics.push({
        name: 'Интернет-соединение',
        status: 'error',
        message: 'Нет подключения к интернету',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // 2. Проверка Supabase URL
    try {
      const url = 'https://zwbhlfhwymbmvioaikvs.supabase.co/rest/v1/';
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3YmhsZmh3eW1ibXZpb2Fpa3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjU3MTMsImV4cCI6MjA2OTMwMTcxM30.qyCcLcEzRQ7S2J1GUNpgO597BKn768Pmb-lOGjIC4bU',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        diagnostics.push({
          name: 'Supabase API',
          status: 'success',
          message: `Соединение с Supabase API успешно (${response.status})`
        });
      } else {
        diagnostics.push({
          name: 'Supabase API',
          status: 'error',
          message: `Ошибка Supabase API: ${response.status} ${response.statusText}`
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'Supabase API',
        status: 'error',
        message: 'Не удалось подключиться к Supabase API',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // 3. Проверка Supabase Auth
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        diagnostics.push({
          name: 'Supabase Auth',
          status: 'warning',
          message: 'Проблема с Supabase Auth',
          details: error.message
        });
      } else {
        diagnostics.push({
          name: 'Supabase Auth',
          status: 'success',
          message: data.session ? 'Пользователь авторизован' : 'Auth API доступен'
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'Supabase Auth',
        status: 'error',
        message: 'Ошибка Supabase Auth',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // 4. Проверка localStorage
    try {
      const testKey = 'supabase_test_' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      diagnostics.push({
        name: 'Local Storage',
        status: 'success',
        message: 'Local Storage работает нормально'
      });
    } catch (error) {
      diagnostics.push({
        name: 'Local Storage',
        status: 'error',
        message: 'Проблема с Local Storage',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // 5. Проверка CORS
    try {
      const response = await fetch('https://zwbhlfhwymbmvioaikvs.supabase.co/auth/v1/settings', {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3YmhsZmh3eW1ibXZpb2Fpa3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjU3MTMsImV4cCI6MjA2OTMwMTcxM30.qyCcLcEzRQ7S2J1GUNpgO597BKn768Pmb-lOGjIC4bU'
        }
      });
      
      if (response.ok) {
        diagnostics.push({
          name: 'CORS Policy',
          status: 'success',
          message: 'CORS настроен правильно'
        });
      } else {
        diagnostics.push({
          name: 'CORS Policy',
          status: 'warning',
          message: `CORS предупреждение: ${response.status}`
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('CORS')) {
        diagnostics.push({
          name: 'CORS Policy',
          status: 'error',
          message: 'Блокировка CORS',
          details: error.message
        });
      } else {
        diagnostics.push({
          name: 'CORS Policy',
          status: 'warning',
          message: 'Возможная проблема с CORS'
        });
      }
    }

    setResults(diagnostics);
    setIsRunning(false);

    const errorCount = diagnostics.filter(d => d.status === 'error').length;
    const warningCount = diagnostics.filter(d => d.status === 'warning').length;

    if (errorCount === 0 && warningCount === 0) {
      toast({
        title: "Диагностика завершена",
        description: "Все проверки прошли успешно!",
      });
    } else if (errorCount > 0) {
      toast({
        title: "Обнаружены проблемы",
        description: `${errorCount} ошибок, ${warningCount} предупреждений`,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-200">Успешно</Badge>;
      case 'error':
        return <Badge variant="destructive">Ошибка</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-yellow-200">Предупреждение</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Диагностика подключения
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent mr-2" />
              Выполняется диагностика...
            </>
          ) : (
            'Запустить диагностику'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Результаты проверки:</h4>
            {results.map((result, index) => (
              <Alert key={index} className="p-3">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{result.name}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    <AlertDescription className="mt-1">
                      {result.message}
                      {result.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            Подробности
                          </summary>
                          <code className="text-xs block mt-1 p-2 bg-muted rounded text-muted-foreground">
                            {result.details}
                          </code>
                        </details>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}