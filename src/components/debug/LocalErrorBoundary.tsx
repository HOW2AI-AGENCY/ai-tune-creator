/**
 * Local Error Boundary - локальная граница ошибок для секций
 */

import React, { ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface LocalErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

interface LocalErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName: string;
  onRetry?: () => void;
  maxRetries?: number;
}

export class LocalErrorBoundary extends React.Component<
  LocalErrorBoundaryProps,
  LocalErrorBoundaryState
> {
  constructor(props: LocalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<LocalErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.sectionName}] Local error caught:`, error, errorInfo);
  }

  handleRetry = () => {
    const { maxRetries = 3, onRetry } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      console.log(`[${this.props.sectionName}] Retrying... (${retryCount + 1}/${maxRetries})`);
      
      this.setState({ 
        hasError: false, 
        error: undefined, 
        retryCount: retryCount + 1 
      });
      
      onRetry?.();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { maxRetries = 3 } = this.props;
      const { retryCount } = this.state;
      const canRetry = retryCount < maxRetries;

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-center space-y-3">
            <div className="flex items-center justify-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">
                Ошибка в {this.props.sectionName}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message || 'Произошла неожиданная ошибка'}
            </p>
            
            {canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleRetry}
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Повторить ({retryCount}/{maxRetries})
              </Button>
            )}
            
            {!canRetry && (
              <p className="text-xs text-destructive/70">
                Достигнуто максимальное количество попыток
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}