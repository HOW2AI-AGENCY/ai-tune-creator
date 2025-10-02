import { useState, useEffect } from 'react';

interface TelegramWebApp {
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready(): void;
  close(): void;
  expand(): void;
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
    secondary_bg_color: string;
  };
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code: string;
      photo_url?: string;
    };
  };
  openTelegramLink(url: string): void;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    setText(text: string): void;
    onClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
}

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tgWebApp = window.Telegram.WebApp as TelegramWebApp;
      
      console.log('🔌 useTelegramWebApp hook initialized', {
        available: true,
        version: tgWebApp.version,
        user: tgWebApp.initDataUnsafe?.user,
        platform: tgWebApp.platform
      });
      
      setWebApp(tgWebApp);
      tgWebApp.ready();
      setIsReady(true);
    } else {
      console.log('🔌 useTelegramWebApp: SDK not available in window');
    }
  }, []);

  const showBackButton = (callback?: () => void) => {
    if (webApp?.BackButton) {
      if (callback) {
        webApp.BackButton.onClick(callback);
      }
      webApp.BackButton.show();
    }
  };

  const hideBackButton = () => {
    webApp?.BackButton?.hide();
  };

  const showMainButton = (text: string, callback?: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
      if (callback) {
        webApp.MainButton.onClick(callback);
      }
      webApp.MainButton.show();
    }
  };

  const hideMainButton = () => {
    webApp?.MainButton?.hide();
  };

  return {
    webApp,
    isReady,
    isAvailable: !!webApp,
    isInTelegram: !!webApp,
    user: webApp?.initDataUnsafe?.user,
    themeParams: webApp?.themeParams,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    expand: () => webApp?.expand(),
    close: () => webApp?.close(),
  };
};

export const useTelegramHaptics = () => {
  const { webApp } = useTelegramWebApp();
  
  const impactOccurred = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (webApp && 'HapticFeedback' in webApp) {
      (webApp as any).HapticFeedback.impactOccurred(style);
    }
  };

  const notificationOccurred = (type: 'error' | 'success' | 'warning' = 'success') => {
    if (webApp && 'HapticFeedback' in webApp) {
      (webApp as any).HapticFeedback.notificationOccurred(type);
    }
  };

  const selectionChanged = () => {
    if (webApp && 'HapticFeedback' in webApp) {
      (webApp as any).HapticFeedback.selectionChanged();
    }
  };

  return {
    impactOccurred,
    impactFeedback: impactOccurred,
    notificationOccurred,
    notificationFeedback: notificationOccurred,
    selectionChanged,
    isAvailable: !!webApp
  };
};