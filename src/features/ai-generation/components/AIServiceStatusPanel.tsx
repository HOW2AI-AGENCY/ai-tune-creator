import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap, Coins, AlertTriangle, CheckCircle, XCircle, Clock, Wrench } from "lucide-react";
import { useAIServiceStatus, ServiceStatus } from "@/hooks/useAIServiceStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIServiceStatusPanelProps {
  compact?: boolean;
}

export function AIServiceStatusPanel({ compact = false }: AIServiceStatusPanelProps) {
  const { services, isLoading, refreshStatuses } = useAIServiceStatus();

  // Дополнительная функция для исправления зависших треков
  const fixProcessingTracks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fix-processing-tracks');
      if (error) throw error;
      
      console.log('Fixed processing tracks:', data);
      toast.success(`Исправлено ${data.fixed_count} треков`);
    } catch (error) {
      console.error('Error fixing tracks:', error);
      toast.error('Ошибка исправления треков');
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-3 w-3 text-emerald-500" />;
      case 'offline':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'limited':
        return <AlertTriangle className="h-3 w-3 text-amber-500" />;
      case 'checking':
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
      default:
        return <XCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return 'default';
      case 'offline':
        return 'destructive';
      case 'limited':
        return 'secondary';
      case 'checking':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return 'Онлайн';
      case 'offline':
        return 'Оффлайн';
      case 'limited':
        return 'Ограничено';
      case 'checking':
        return 'Проверка...';
      default:
        return 'Неизвестно';
    }
  };

  const formatCredits = (remaining?: number, total?: number) => {
    if (remaining === undefined) return 'Неизвестно';
    if (total === undefined) return remaining.toString();
    return `${remaining} / ${total}`;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Статус сервисов</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatuses}
            disabled={isLoading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="space-y-1">
          {services.map((service) => (
            <div key={service.service} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <span className="text-sm font-medium capitalize">{service.service}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {service.creditsRemaining !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Coins className="h-3 w-3" />
                    <span>{service.creditsRemaining}</span>
                  </div>
                )}
                <Badge variant={getStatusColor(service.status)} className="text-xs">
                  {getStatusText(service.status)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Статус AI Сервисов
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={fixProcessingTracks}
              title="Исправить зависшие треки"
              className="h-7 w-7 p-0"
            >
              <Wrench className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStatuses}
              disabled={isLoading}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {services.map((service) => (
          <div key={service.service} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <span className="text-sm font-medium capitalize">{service.service === 'suno' ? 'Suno AI' : 'Mureka'}</span>
              </div>
              <Badge variant={getStatusColor(service.status)} className="text-xs">
                {getStatusText(service.status)}
              </Badge>
            </div>
            
            {service.status !== 'checking' && (
              <div className="ml-5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Кредиты:</span>
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-muted-foreground" />
                    <span>{formatCredits(service.creditsRemaining, service.creditsTotal)}</span>
                  </div>
                </div>
                
                {service.rateLimit && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Лимит запросов:</span>
                    <span>{service.rateLimit.remaining}</span>
                  </div>
                )}
                
                {service.error && (
                  <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                    {service.error}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Обновлено: {service.lastChecked.toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}