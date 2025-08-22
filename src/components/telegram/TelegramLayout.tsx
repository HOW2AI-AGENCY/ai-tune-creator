import { ReactNode } from 'react';
import { useTelegramLayout, useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { cn } from '@/lib/utils';

interface TelegramLayoutProps {
  children: ReactNode;
  className?: string;
}

export function TelegramLayout({ children, className }: TelegramLayoutProps) {
  const { isInTelegram } = useTelegramWebApp();
  const { telegramSafeArea, telegramFullscreen, telegramViewport } = useTelegramLayout();

  if (!isInTelegram) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      'telegram-layout',
      telegramFullscreen,
      telegramViewport,
      telegramSafeArea,
      'w-full relative',
      className
    )}>
      {children}
    </div>
  );
}

interface TelegramContainerProps {
  children: ReactNode;
  className?: string;
}

export function TelegramContainer({ children, className }: TelegramContainerProps) {
  const { isInTelegram } = useTelegramWebApp();
  
  return (
    <div className={cn(
      'w-full',
      isInTelegram ? 'telegram-content-safe px-3 py-2' : 'container mx-auto px-4 py-6',
      className
    )}>
      {children}
    </div>
  );
}