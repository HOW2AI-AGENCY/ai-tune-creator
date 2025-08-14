import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, HelpCircle, Settings } from "lucide-react";

interface ErrorHandlerProps {
  error: {
    type: 'network' | 'api' | 'validation' | 'unknown';
    message: string;
    details?: string;
    code?: string;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  onSupport?: () => void;
}

export function ErrorHandler({ error, onRetry, onDismiss, onSupport }: ErrorHandlerProps) {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <RefreshCw className="h-4 w-4" />;
      case 'api':
        return <Settings className="h-4 w-4" />;
      case 'validation':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Проблема с подключением';
      case 'api':
        return 'Ошибка AI сервиса';
      case 'validation':
        return 'Некорректные параметры';
      default:
        return 'Произошла ошибка';
    }
  };

  const getActionSuggestion = () => {
    switch (error.type) {
      case 'network':
        return 'Проверьте интернет-соединение и попробуйте еще раз.';
      case 'api':
        return 'Проблема с AI сервисом. Попробуйте другой сервис или повторите позже.';
      case 'validation':
        return 'Проверьте введенные данные и исправьте ошибки.';
      default:
        return 'Попробуйте повторить операцию или обратитесь в поддержку.';
    }
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        <div className="flex-1 space-y-2">
          <AlertTitle>{getErrorTitle()}</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{error.message}</div>
            {error.details && (
              <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                Подробности: {error.details}
              </div>
            )}
            {error.code && (
              <div className="text-xs text-muted-foreground">
                Код ошибки: {error.code}
              </div>
            )}
            <div className="text-sm">{getActionSuggestion()}</div>
          </AlertDescription>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Повторить
          </Button>
        )}
        {onSupport && (
          <Button size="sm" variant="outline" onClick={onSupport}>
            <HelpCircle className="h-3 w-3 mr-1" />
            Поддержка
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Закрыть
          </Button>
        )}
      </div>
    </Alert>
  );
}