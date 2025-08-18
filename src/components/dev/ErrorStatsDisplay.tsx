import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ErrorTracker } from '@/lib/api-validation';

interface ErrorStatsDisplayProps {
  onClearErrors?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function ErrorStatsDisplay({ onClearErrors, onRefresh, className = "" }: ErrorStatsDisplayProps) {
  const errorStats = ErrorTracker.getErrorStats();
  const totalErrors = Object.values(errorStats).reduce((sum, count) => sum + count, 0);

  if (totalErrors === 0) {
    return (
      <Card className={`border-green-200 bg-green-50/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">No errors detected</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalErrors = Object.entries(errorStats).filter(([_, count]) => count >= 5);
  const hasCriticalErrors = criticalErrors.length > 0;

  return (
    <Card className={`${hasCriticalErrors ? 'border-red-200 bg-red-50/50' : 'border-yellow-200 bg-yellow-50/50'} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {hasCriticalErrors ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            Error Statistics
          </CardTitle>
          <div className="flex gap-1">
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {onClearErrors && totalErrors > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearErrors}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Total errors: {totalErrors}
        </div>
        
        <div className="space-y-1">
          {Object.entries(errorStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5) // Show top 5 errors
            .map(([operation, count]) => (
              <div key={operation} className="flex items-center justify-between text-xs">
                <span className="truncate max-w-[150px]" title={operation}>
                  {operation}
                </span>
                <Badge variant={count >= 5 ? "destructive" : "secondary"} className="text-xs px-1">
                  {count}
                </Badge>
              </div>
            ))}
        </div>

        {criticalErrors.length > 0 && (
          <div className="mt-2 p-2 bg-red-100 rounded-md">
            <div className="text-xs text-red-700 font-medium">
              Critical: {criticalErrors.length} operation(s) with 5+ errors
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Development-only error panel
export function DevErrorPanel() {
  if (!import.meta.env.DEV) return null;

  const handleClearErrors = () => {
    ErrorTracker.clearErrors();
    window.location.reload(); // Simple refresh for dev
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <ErrorStatsDisplay 
        onClearErrors={handleClearErrors}
        onRefresh={() => window.location.reload()}
        className="shadow-lg"
      />
    </div>
  );
}