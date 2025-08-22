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
      "sticky top-0 z-40 w-full bg-card/95 backdrop-blur-md border-b border-border",
      "safe-area-inset",
      "animate-fade-in",
      className
    )}>
      <div className={cn("flex items-center justify-between mobile-header-height px-4")}>
        {/* Left Section */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBack && !isInTelegram && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 tap-highlight"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className={cn(
              "font-semibold text-foreground truncate",
              subtitle ? "text-base leading-tight" : "text-lg"
            )}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1">
          {/* Connection Status */}
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
            isOnline ? "text-green-500" : "text-destructive"
          )}>
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
          </div>

          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 tap-highlight"
              onClick={onSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {showNotifications && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative tap-highlight"
              onClick={onNotifications}
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center animate-bounce-in"
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              )}
            </Button>
          )}

          {showMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 tap-highlight"
              onClick={onMenu}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Custom Content */}
      {children && (
        <div className="px-4 pb-3 border-t border-border/50">
          {children}
        </div>
      )}
    </header>
  );
}