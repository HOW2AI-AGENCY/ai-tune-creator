import { ReactNode } from 'react';
import { useTelegramLayout, useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { cn } from '@/lib/utils';

interface TelegramLayoutProps {
  children: ReactNode;
  className?: string;
}

export function TelegramLayout({ children, className }: TelegramLayoutProps) {
  const { isInTelegram } = useTelegramWebApp();
  const { telegramSafeArea, telegramFullscreen } = useTelegramLayout();

  if (!isInTelegram) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      'telegram-layout',
      telegramFullscreen,
      telegramSafeArea,
      'w-full',
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
      isInTelegram ? 'px-2 py-1' : 'container mx-auto px-4 py-6',
      className
    )}>
      {children}
    </div>
  );
}