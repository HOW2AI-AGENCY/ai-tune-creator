import { ReactNode, createContext, useContext } from 'react';
import { useTelegramSafeArea } from '@/hooks/useTelegramSafeArea';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';

interface TelegramSafeAreaContextValue {
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  hasMainButton: boolean;
  hasBackButton: boolean;
  hasSettingsButton: boolean;
  isFullscreen: boolean;
  effectiveBottom: number;
  isInTelegram: boolean;
}

const TelegramSafeAreaContext = createContext<TelegramSafeAreaContextValue | null>(null);

interface TelegramSafeAreaProviderProps {
  children: ReactNode;
}

export function TelegramSafeAreaProvider({ children }: TelegramSafeAreaProviderProps) {
  const { isInTelegram } = useTelegramWebApp();
  const safeAreaState = useTelegramSafeArea();

  const contextValue: TelegramSafeAreaContextValue = {
    ...safeAreaState,
    isInTelegram
  };

  return (
    <TelegramSafeAreaContext.Provider value={contextValue}>
      {children}
    </TelegramSafeAreaContext.Provider>
  );
}

export function useTelegramSafeAreaContext(): TelegramSafeAreaContextValue {
  const context = useContext(TelegramSafeAreaContext);
  if (!context) {
    throw new Error('useTelegramSafeAreaContext must be used within TelegramSafeAreaProvider');
  }
  return context;
}

// Convenience hook для получения CSS классов
export function useTelegramSafeAreaClasses() {
  const { isInTelegram, hasMainButton, isFullscreen } = useTelegramSafeAreaContext();
  
  if (!isInTelegram) return '';
  
  const classes = ['telegram-safe-area'];
  
  if (hasMainButton) {
    classes.push('telegram-with-main-button');
  } else {
    classes.push('telegram-no-main-button');
  }
  
  if (isFullscreen) {
    classes.push('telegram-fullscreen-mode');
  }
  
  return classes.join(' ');
}