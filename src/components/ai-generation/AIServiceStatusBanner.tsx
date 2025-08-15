import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAIServiceStatus } from '@/hooks/useAIServiceStatus';
import { cn } from '@/lib/utils';

export function AIServiceStatusBanner() {
  const { services, isLoading, refreshStatuses } = useAIServiceStatus();

  const sunoStatus = services.find(s => s.service === 'suno');
  const murekaStatus = services.find(s => s.service === 'mureka');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'limited':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'limited':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'checking':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'limited':
        return 'Limited';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const hasIssues = services.some(s => s.status === 'offline' || s.status === 'limited');

  if (isLoading) {
    return (
      <Card className="p-3 border-dashed animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="h-8 bg-muted rounded w-20"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "p-3 transition-colors",
      hasIssues 
        ? "border-yellow-200 bg-yellow-50/50" 
        : "border-green-200 bg-green-50/50"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">AI Services:</span>
          
          {sunoStatus && (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs", getStatusColor(sunoStatus.status))}
              >
                {getStatusIcon(sunoStatus.status)}
                Suno: {getStatusText(sunoStatus.status)}
              </Badge>
              {sunoStatus.creditsRemaining !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {sunoStatus.creditsRemaining.toFixed(1)} credits
                </span>
              )}
            </div>
          )}

          {murekaStatus && (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs", getStatusColor(murekaStatus.status))}
              >
                {getStatusIcon(murekaStatus.status)}
                Mureka: {getStatusText(murekaStatus.status)}
              </Badge>
              {murekaStatus.creditsRemaining !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ${murekaStatus.creditsRemaining.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={refreshStatuses}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {hasIssues && (
        <div className="mt-2 text-xs text-yellow-700">
          ⚠️ Some AI services are experiencing issues. Generation may be limited.
        </div>
      )}
    </Card>
  );
}