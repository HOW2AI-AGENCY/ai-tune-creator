import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Search, 
  Bell, 
  Menu,
  MoreVertical,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTelegramWebApp, useTelegramBackButton } from '@/hooks/useTelegramWebApp';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showSearch?: boolean;
  onSearch?: () => void;
  showNotifications?: boolean;
  notificationCount?: number;
  onNotifications?: () => void;
  showMenu?: boolean;
  onMenu?: () => void;
  isOnline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  showSearch = false,
  onSearch,
  showNotifications = false,
  notificationCount = 0,
  onNotifications,
  showMenu = false,
  onMenu,
  isOnline = true,
  className,
  children
}: MobileHeaderProps) {
  const { isInTelegram } = useTelegramWebApp();
  const { showBackButton, hideBackButton } = useTelegramBackButton();

  useEffect(() => {
    if (isInTelegram && showBack && onBack) {
      showBackButton(onBack);
      return () => hideBackButton();
    }
  }, [isInTelegram, showBack, onBack, showBackButton, hideBackButton]);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      "border-b border-border/20",
      "pt-safe-top",
      className
    )}>
      {/* Единый компактный ряд */}
      <div className="flex items-center justify-between h-11 px-4">
        {/* Left - Back Button */}
        <div className="w-10 flex items-center justify-start">
          {showBack && !isInTelegram && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-tg-link hover:bg-tg-button/10 tap-highlight"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Center - Title */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          <h1 className="font-medium text-base text-tg-text truncate max-w-full">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-tg-hint truncate max-w-full">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right - Actions & Status */}
        <div className="w-10 flex items-center justify-end gap-1">
          {/* Connection Status */}
          {isOnline !== undefined && (
            <div className={cn(
              "flex items-center justify-center w-5 h-5",
              isOnline ? "text-success" : "text-destructive"
            )}>
              {isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
            </div>
          )}

          {/* Menu/Search Button */}
          {(showMenu || showSearch) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-tg-link hover:bg-tg-button/10 tap-highlight"
              onClick={showMenu ? onMenu : onSearch}
            >
              {showMenu ? <Menu className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
          )}

          {/* Notifications Badge */}
          {showNotifications && notificationCount > 0 && (
            <Badge 
              variant="destructive"
              className="h-4 w-4 p-0 text-[10px] flex items-center justify-center absolute top-1 right-1"
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Custom Content */}
      {children && (
        <div className="px-4 pb-2 border-t border-border/20">
          {children}
        </div>
      )}
    </header>
  );
}