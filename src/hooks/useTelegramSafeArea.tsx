import { useEffect, useState } from 'react';
import { useTelegramWebApp } from './useTelegramWebApp';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface TelegramSafeAreaState {
  safeArea: SafeAreaInsets;
  hasMainButton: boolean;
  hasBackButton: boolean;
  hasSettingsButton: boolean;
  isFullscreen: boolean;
  effectiveBottom: number;
}

export function useTelegramSafeArea(): TelegramSafeAreaState {
  const { isInTelegram, webApp } = useTelegramWebApp();
  const [safeArea, setSafeArea] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });
  const [hasMainButton, setHasMainButton] = useState(false);
  const [hasBackButton, setHasBackButton] = useState(false);
  const [hasSettingsButton, setHasSettingsButton] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isInTelegram || !webApp) return;

    const updateSafeArea = () => {
      // Получаем стандартные safe area insets
      const rootStyle = getComputedStyle(document.documentElement);
      const envTop = rootStyle.getPropertyValue('--mobile-safe-area-top') || '0px';
      const envBottom = rootStyle.getPropertyValue('--mobile-safe-area-bottom') || '0px';
      const envLeft = rootStyle.getPropertyValue('--mobile-safe-area-left') || '0px';
      const envRight = rootStyle.getPropertyValue('--mobile-safe-area-right') || '0px';

      // Конвертируем в числа (убираем 'px')
      const parseInset = (value: string) => {
        const num = parseFloat(value.replace('px', ''));
        return isNaN(num) ? 0 : num;
      };

      const baseSafeArea: SafeAreaInsets = {
        top: parseInset(envTop),
        bottom: parseInset(envBottom),
        left: parseInset(envLeft),
        right: parseInset(envRight)
      };

      // Определяем состояние Telegram UI элементов
      const mainButtonVisible = webApp.MainButton?.isVisible || false;
      const backButtonVisible = webApp.BackButton?.isVisible || false;
      const settingsButtonVisible = webApp.SettingsButton?.isVisible || false;
      const fullscreenMode = webApp.isFullscreen || false;

      setHasMainButton(mainButtonVisible);
      setHasBackButton(backButtonVisible);
      setHasSettingsButton(settingsButtonVisible);
      setIsFullscreen(fullscreenMode);

      // Корректируем safe area с учетом Telegram UI
      const adjustedSafeArea: SafeAreaInsets = {
        ...baseSafeArea,
        // В fullscreen режиме увеличиваем верхний отступ для статус бара
        top: fullscreenMode ? Math.max(baseSafeArea.top, 44) : baseSafeArea.top,
        // Если видна главная кнопка, увеличиваем нижний отступ
        bottom: mainButtonVisible ? Math.max(baseSafeArea.bottom, 72) : baseSafeArea.bottom
      };

      setSafeArea(adjustedSafeArea);

      // Обновляем CSS переменные
      const root = document.documentElement;
      root.style.setProperty('--telegram-safe-top', `${adjustedSafeArea.top}px`);
      root.style.setProperty('--telegram-safe-bottom', `${adjustedSafeArea.bottom}px`);
      root.style.setProperty('--telegram-safe-left', `${adjustedSafeArea.left}px`);
      root.style.setProperty('--telegram-safe-right', `${adjustedSafeArea.right}px`);

      // Обновляем класс на body для conditional styling
      document.body.classList.toggle('telegram-main-button-visible', mainButtonVisible);
      document.body.classList.toggle('telegram-fullscreen', fullscreenMode);
    };

    // Начальная настройка
    updateSafeArea();

    // Слушаем изменения состояния кнопок
    const handleMainButtonChanged = () => updateSafeArea();
    const handleBackButtonChanged = () => updateSafeArea();
    const handleViewportChanged = () => updateSafeArea();

    if (webApp.onEvent) {
      webApp.onEvent('mainButtonClicked', handleMainButtonChanged);
      webApp.onEvent('backButtonClicked', handleBackButtonChanged);
      webApp.onEvent('viewportChanged', handleViewportChanged);
    }

    // Наблюдаем за изменениями видимости кнопок через MutationObserver
    const observer = new MutationObserver(updateSafeArea);
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'],
      subtree: true 
    });

    return () => {
      if (webApp.offEvent) {
        webApp.offEvent('mainButtonClicked', handleMainButtonChanged);
        webApp.offEvent('backButtonClicked', handleBackButtonChanged);
        webApp.offEvent('viewportChanged', handleViewportChanged);
      }
      observer.disconnect();
    };
  }, [isInTelegram, webApp]);

  const effectiveBottom = hasMainButton ? 72 : safeArea.bottom;

  return {
    safeArea,
    hasMainButton,
    hasBackButton,
    hasSettingsButton,
    isFullscreen,
    effectiveBottom
  };
}