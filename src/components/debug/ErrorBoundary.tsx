import React, { ErrorInfo } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global UI Error caught by ErrorBoundary:", error, errorInfo);
    console.error("Component stack:", errorInfo.componentStack);
    console.error("Error boundary stack:", error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg w-full text-center space-y-4">
            <h1 className="text-2xl font-bold">Произошла ошибка интерфейса</h1>
            <p className="text-muted-foreground">Перезагрузите страницу или вернитесь на главную.</p>
            <div className="text-xs text-muted-foreground/80 break-words bg-muted p-3 rounded">
              <strong>Ошибка:</strong> {this.state.error?.message}<br/>
              <strong>Стек:</strong> {this.state.error?.stack}
            </div>
            <button
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent/50 transition-colors"
              onClick={() => (window.location.href = "/")}
            >
              На главную
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactNode;
  }
}
