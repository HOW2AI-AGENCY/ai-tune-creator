/**
 * Simple Preloader - минимальный прелоадер без зависимостей
 */

interface SimplePreloaderProps {
  message?: string;
}

export const SimplePreloader = ({ message = "Загружается..." }: SimplePreloaderProps) => {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
};