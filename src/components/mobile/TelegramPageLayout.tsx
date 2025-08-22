import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTelegramSafeAreaContext } from '@/components/layout/TelegramSafeAreaProvider';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';

interface TelegramPageLayoutProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
  fullscreen?: boolean;
  scrollable?: boolean;
}

export function TelegramPageLayout({ 
  children, 
  className,
  showHeader = true,
  showBottomNav = true,
  fullscreen = false,
  scrollable = true
}: TelegramPageLayoutProps) {
  const { isInTelegram } = useTelegramWebApp();
  const { 
    safeArea, 
    hasMainButton, 
    isFullscreen,
    effectiveBottom 
  } = useTelegramSafeAreaContext();

  if (!isInTelegram) {
    return (
      <div className={cn("min-h-screen", className)}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "telegram-page-layout relative w-full",
        fullscreen || isFullscreen ? "h-screen overflow-hidden" : "min-h-screen",
        "bg-[--tg-bg] text-[--tg-text]",
        className
      )}
      style={{
        paddingTop: showHeader ? `${safeArea.top}px` : '0px',
        paddingBottom: showBottomNav ? `${effectiveBottom}px` : '0px',
        paddingLeft: `${safeArea.left}px`,
        paddingRight: `${safeArea.right}px`,
      }}
    >
      {/* Main Content */}
      <main 
        className={cn(
          "telegram-content relative z-10",
          fullscreen ? "h-full" : "min-h-full",
          scrollable ? "overflow-y-auto scrollbar-hide" : "overflow-hidden"
        )}
      >
        {children}
      </main>

      {/* Telegram Main Button Indicator */}
      {hasMainButton && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
          style={{ height: `${effectiveBottom}px` }}
        >
          <div className="absolute inset-0 bg-[--tg-button]/5 border-t border-[--tg-button]/20" />
        </div>
      )}
    </div>
  );
}

interface TelegramSectionProps {
  children: ReactNode;
  className?: string;
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
}

export function TelegramSection({ 
  children, 
  className,
  spacing = "md",
  padding = "md"
}: TelegramSectionProps) {
  const spacingClasses = {
    none: "",
    sm: "space-y-2",
    md: "space-y-4",
    lg: "space-y-6",
    xl: "space-y-8"
  };

  const paddingClasses = {
    none: "",
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
    xl: "p-8"
  };

  return (
    <section className={cn(
      "telegram-section",
      spacingClasses[spacing],
      paddingClasses[padding],
      className
    )}>
      {children}
    </section>
  );
}