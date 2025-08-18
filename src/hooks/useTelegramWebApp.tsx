import { useEffect, useState } from 'react';

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        version: string;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
      };
    };
  }
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  initData: string;
  initDataUnsafe: Record<string, any>;
  version: string;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
}

export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isInTelegram, setIsInTelegram] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      setWebApp(tg);
      setIsInTelegram(true);
      
      // Инициализация Telegram Web App
      tg.ready();
      tg.expand();
      
      // Применение темы Telegram
      if (tg.themeParams) {
        const root = document.documentElement;
        if (tg.themeParams.bg_color) {
          root.style.setProperty('--tg-bg-color', tg.themeParams.bg_color);
        }
        if (tg.themeParams.text_color) {
          root.style.setProperty('--tg-text-color', tg.themeParams.text_color);
        }
        if (tg.themeParams.button_color) {
          root.style.setProperty('--tg-button-color', tg.themeParams.button_color);
        }
      }
    } else {
      // Проверка по User Agent для случаев, когда API недоступно
      const userAgent = navigator.userAgent || navigator.vendor;
      setIsInTelegram(userAgent.includes('Telegram'));
    }
  }, []);

  return {
    webApp,
    isInTelegram,
    user: webApp?.initDataUnsafe?.user,
    colorScheme: webApp?.colorScheme || 'light',
    platform: webApp?.platform || 'unknown'
  };
}

export function useTelegramAuth() {
  const { webApp, isInTelegram } = useTelegramWebApp();
  const [authData, setAuthData] = useState<any>(null);

  useEffect(() => {
    if (webApp && webApp.initData) {
      // Получаем данные аутентификации из Telegram
      const initData = webApp.initDataUnsafe;
      setAuthData({
        telegramId: initData.user?.id,
        firstName: initData.user?.first_name,
        lastName: initData.user?.last_name,
        username: initData.user?.username,
        languageCode: initData.user?.language_code,
        initData: webApp.initData // Для валидации на бэкенде
      });
    }
  }, [webApp]);

  return {
    authData,
    isInTelegram,
    isAuthenticated: !!authData
  };
}

export function useTelegramMainButton() {
  const { webApp } = useTelegramWebApp();

  const showMainButton = (text: string, onClick: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.text = text;
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    }
  };

  const hideMainButton = () => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide();
    }
  };

  return {
    showMainButton,
    hideMainButton,
    isAvailable: !!webApp?.MainButton
  };
}

export function useTelegramBackButton() {
  const { webApp } = useTelegramWebApp();

  const showBackButton = (onClick: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    }
  };

  const hideBackButton = () => {
    if (webApp?.BackButton) {
      webApp.BackButton.hide();
    }
  };

  return {
    showBackButton,
    hideBackButton,
    isAvailable: !!webApp?.BackButton
  };
}

// Утилита для закрытия Telegram Mini App
export function closeTelegramApp() {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.close();
  }
}

// Хук для адаптации интерфейса под Telegram
export function useTelegramLayout() {
  const { isInTelegram, webApp } = useTelegramWebApp();
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    if (isInTelegram && webApp) {
      // Отслеживание изменений viewport
      const updateViewport = () => {
        setViewportHeight(webApp.viewportHeight || window.innerHeight);
      };

      updateViewport();
      window.addEventListener('resize', updateViewport);
      
      return () => window.removeEventListener('resize', updateViewport);
    }
  }, [isInTelegram, webApp]);

  return {
    isInTelegram,
    viewportHeight,
    // Дополнительные отступы для Telegram UI
    telegramSafeArea: isInTelegram ? 'pt-12 pb-4' : '',
    // Стили для полноэкранного режима в Telegram
    telegramFullscreen: isInTelegram ? 'min-h-screen overflow-hidden' : ''
  };
}