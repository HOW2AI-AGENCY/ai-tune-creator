/**
 * Global Error Handler - диагностический оверлей для отладки белого экрана
 */

import { useEffect, useState } from 'react';

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  type: 'error' | 'unhandledrejection' | 'boot';
}

export const GlobalErrorHandler = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    // Проверяем debug режим
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === '1' || localStorage.getItem('debug') === '1';
    setIsDebugMode(debugMode);

    if (!debugMode) return;

    // Читаем ошибки из localStorage если есть
    const savedErrors = localStorage.getItem('debug-errors');
    if (savedErrors) {
      try {
        setErrors(JSON.parse(savedErrors));
      } catch (e) {
        console.warn('Failed to parse saved errors');
      }
    }

    const addError = (error: Omit<ErrorInfo, 'timestamp'>) => {
      const errorInfo: ErrorInfo = {
        ...error,
        timestamp: Date.now()
      };
      
      setErrors(prev => {
        const updated = [...prev, errorInfo].slice(-10); // Храним последние 10
        localStorage.setItem('debug-errors', JSON.stringify(updated));
        return updated;
      });
    };

    // Global error handler
    const handleError = (event: ErrorEvent) => {
      addError({
        type: 'error',
        message: event.message || 'Unknown error',
        stack: event.error?.stack || event.filename + ':' + event.lineno
      });
    };

    // Unhandled promise rejection handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      addError({
        type: 'unhandledrejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || 'No stack trace'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!isDebugMode || errors.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] bg-red-600 text-white p-2 text-xs overflow-auto max-h-48">
      <div className="flex justify-between items-center mb-2">
        <strong>🐛 DEBUG: Обнаружены ошибки ({errors.length})</strong>
        <button 
          onClick={() => {
            setErrors([]);
            localStorage.removeItem('debug-errors');
          }}
          className="bg-red-800 px-2 py-1 rounded text-xs"
        >
          Очистить
        </button>
      </div>
      
      {errors.map((error, index) => (
        <div key={index} className="mb-2 p-2 bg-red-700 rounded">
          <div className="flex justify-between">
            <span className="font-mono text-yellow-200">[{error.type}]</span>
            <span className="text-red-200">{new Date(error.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="mt-1">{error.message}</div>
          {error.stack && (
            <details className="mt-1">
              <summary className="cursor-pointer text-red-200">Stack trace</summary>
              <pre className="mt-1 text-xs bg-red-800 p-1 rounded overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
};