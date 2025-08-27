import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color?: string;
          textColor?: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          setText: (text: string) => void;
          setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
        };
        SecondaryButton: {
          text: string;
          color?: string;
          textColor?: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          setText: (text: string) => void;
          setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        SettingsButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
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
          secondary_bg_color?: string;
          header_bg_color?: string;
          accent_text_color?: string;
          section_bg_color?: string;
          section_header_text_color?: string;
          subtitle_text_color?: string;
          destructive_text_color?: string;
        };
        headerColor: string;
        backgroundColor: string;
        isClosingConfirmationEnabled: boolean;
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            is_bot?: boolean;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            added_to_attachment_menu?: boolean;
            allows_write_to_pm?: boolean;
            photo_url?: string;
          };
          receiver?: any;
          chat?: any;
          chat_type?: string;
          chat_instance?: string;
          start_param?: string;
          can_send_after?: number;
          auth_date?: number;
          hash?: string;
        };
        version: string;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        safeAreaInsets: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        contentSafeAreaInsets: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
        sendData: (data: string) => void;
        switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
        showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text?: string }> }, callback?: (button_id: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        showScanQrPopup: (params: { text?: string }, callback?: (text: string) => boolean) => void;
        closeScanQrPopup: () => void;
        readTextFromClipboard: (callback?: (text: string) => void) => void;
        requestWriteAccess: (callback?: (granted: boolean) => void) => void;
        requestContact: (callback?: (granted: boolean) => void) => void;
        isVersionAtLeast: (version: string) => boolean;
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
    color?: string;
    textColor?: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (callback: () => void) => void;
    setText: (text: string) => void;
    setParams: (params: any) => void;
  };
  SecondaryButton: {
    text: string;
    color?: string;
    textColor?: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (callback: () => void) => void;
    setText: (text: string) => void;
    setParams: (params: any) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
  SettingsButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
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
  isFullscreen?: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  contentSafeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
  showPopup: (params: any, callback?: (button_id: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  openInvoice?: (url: string, callback?: (status: string) => void) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  isVersionAtLeast: (version: string) => boolean;
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

// Removed useTelegramAuth - consolidated into dedicated hook

export function useTelegramMainButton() {
  const { webApp } = useTelegramWebApp();

  const showMainButton = (text: string, onClick: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
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

export function useTelegramHaptics() {
  const { webApp } = useTelegramWebApp();

  const impactFeedback = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.impactOccurred(style);
    }
  };

  const notificationFeedback = (type: 'error' | 'success' | 'warning') => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.notificationOccurred(type);
    }
  };

  return {
    impactFeedback,
    notificationFeedback,
    isAvailable: !!webApp?.HapticFeedback
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
  const [isStable, setIsStable] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isInTelegram || !webApp) return;

    // Получаем актуальные данные viewport
    const updateViewportData = () => {
      const height = webApp.viewportHeight || window.innerHeight;
      setViewportHeight(height);
      setIsStable(webApp.viewportStableHeight ? height === webApp.viewportStableHeight : true);
      setIsExpanded(webApp.isExpanded || false);
      setIsFullscreen(webApp.isFullscreen || false);

      // Обновляем CSS переменные для динамического viewport
      const root = document.documentElement;
      root.style.setProperty('--tg-vh', `${height}px`);
      root.style.setProperty('--tg-viewport-height', `${height}px`);
      
      // Вычисляем безопасные отступы
      const safeAreaTop = isFullscreen ? 'env(safe-area-inset-top, 44px)' : '0px';
      const safeAreaBottom = webApp.MainButton?.isVisible ? '72px' : 'env(safe-area-inset-bottom, 0px)';
      
      root.style.setProperty('--telegram-safe-top', safeAreaTop);
      root.style.setProperty('--telegram-safe-bottom', safeAreaBottom);
      
      // Дополнительные отступы для нативных элементов Telegram
      const headerOffset = isFullscreen ? '0px' : '44px'; // Стандартная высота header Telegram
      const settingsOffset = isFullscreen ? '44px' : '0px'; // Отступ для кнопки настроек
      
      root.style.setProperty('--telegram-header-offset', headerOffset);
      root.style.setProperty('--telegram-settings-offset', settingsOffset);
    };

    // Начальная настройка
    updateViewportData();

    // Разворачиваем приложение на полный экран
    if (webApp.expand) {
      webApp.expand();
    }

    // Слушаем изменения viewport
    const handleViewportChanged = () => {
      updateViewportData();
    };

    // Добавляем обработчик изменений
    if (webApp.onEvent) {
      webApp.onEvent('viewportChanged', handleViewportChanged);
    }

    // Fallback для старых версий или браузера
    window.addEventListener('resize', updateViewportData);
    
    return () => {
      if (webApp.offEvent) {
        webApp.offEvent('viewportChanged', handleViewportChanged);
      }
      window.removeEventListener('resize', updateViewportData);
    };
  }, [isInTelegram, webApp]);

  return {
    isInTelegram,
    viewportHeight,
    isStable,
    isExpanded,
    isFullscreen,
    // Динамические безопасные отступы
    telegramSafeArea: isInTelegram ? 'telegram-safe-area' : '',
    // Стили для полноэкранного режима
    telegramFullscreen: isInTelegram ? 'telegram-fullscreen' : '',
    // Стили для адаптивной высоты
    telegramViewport: isInTelegram ? 'telegram-viewport' : ''
  };
}