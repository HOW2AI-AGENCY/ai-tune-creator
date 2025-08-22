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
      "pt-safe-top",
      "animate-fade-in",
      className
    )}>
      {/* Top Row - Navigation & Indicators */}
      <div className="flex items-center justify-between h-12 px-2">
        {/* Left - Back Button */}
        <div className="w-12 h-12 flex items-center justify-center">
          {showBack && !isInTelegram && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 tap-highlight"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Center - Status Indicators */}
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full transition-colors",
            isOnline ? "text-green-500" : "text-destructive"
          )}>
            {isOnline ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
          </div>

          {/* Notifications */}
          {showNotifications && notificationCount > 0 && (
            <Badge 
              variant="destructive"
              className="h-4 w-4 p-0 text-xs flex items-center justify-center"
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </Badge>
          )}
        </div>

        {/* Right - Menu/Settings */}
        <div className="w-12 h-12 flex items-center justify-center">
          {showMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 tap-highlight"
              onClick={onMenu}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 tap-highlight"
              onClick={onSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Row - Title & User Avatar */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-lg text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* User Avatar Placeholder */}
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ml-3">
          <div className="w-6 h-6 rounded-full bg-primary/20" />
        </div>
      </div>

      {/* Custom Content */}
      {children && (
        <div className="px-4 pb-3 border-t border-border/50 mt-2">
          {children}
        </div>
      )}
    </header>
  );
}