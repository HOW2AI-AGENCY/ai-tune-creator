import { useCallback } from 'react';
import { useTelegramWebApp } from './useTelegramWebApp';

export function useTelegramMainButton() {
  const { webApp } = useTelegramWebApp();

  const showMainButton = useCallback((text: string, onClick: () => void, options?: {
    color?: string;
    textColor?: string;
    isActive?: boolean;
  }) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      
      if (options) {
        webApp.MainButton.setParams({
          text,
          color: options.color,
          text_color: options.textColor,
          is_active: options.isActive !== false,
          is_visible: true
        });
      }
      
      webApp.MainButton.show();
      webApp.MainButton.enable();
    }
  }, [webApp]);

  const hideMainButton = useCallback(() => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide();
    }
  }, [webApp]);

  const updateMainButton = useCallback((text: string) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
    }
  }, [webApp]);

  const enableMainButton = useCallback(() => {
    if (webApp?.MainButton) {
      webApp.MainButton.enable();
    }
  }, [webApp]);

  const disableMainButton = useCallback(() => {
    if (webApp?.MainButton) {
      webApp.MainButton.disable();
    }
  }, [webApp]);

  return {
    showMainButton,
    hideMainButton,
    updateMainButton,
    enableMainButton,
    disableMainButton,
    isAvailable: !!webApp?.MainButton,
    isVisible: webApp?.MainButton?.isVisible || false
  };
}

export function useTelegramSecondaryButton() {
  const { webApp } = useTelegramWebApp();

  const showSecondaryButton = useCallback((text: string, onClick: () => void, options?: {
    color?: string;
    textColor?: string;
    isActive?: boolean;
  }) => {
    if (webApp?.SecondaryButton) {
      webApp.SecondaryButton.setText(text);
      webApp.SecondaryButton.onClick(onClick);
      
      if (options) {
        webApp.SecondaryButton.setParams({
          text,
          color: options.color,
          text_color: options.textColor,
          is_active: options.isActive !== false,
          is_visible: true
        });
      }
      
      webApp.SecondaryButton.show();
      webApp.SecondaryButton.enable();
    }
  }, [webApp]);

  const hideSecondaryButton = useCallback(() => {
    if (webApp?.SecondaryButton) {
      webApp.SecondaryButton.hide();
    }
  }, [webApp]);

  const updateSecondaryButton = useCallback((text: string) => {
    if (webApp?.SecondaryButton) {
      webApp.SecondaryButton.setText(text);
    }
  }, [webApp]);

  return {
    showSecondaryButton,
    hideSecondaryButton,
    updateSecondaryButton,
    isAvailable: !!webApp?.SecondaryButton,
    isVisible: webApp?.SecondaryButton?.isVisible || false
  };
}

export function useTelegramBackButton() {
  const { webApp } = useTelegramWebApp();

  const showBackButton = useCallback((onClick: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    }
  }, [webApp]);

  const hideBackButton = useCallback(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.hide();
    }
  }, [webApp]);

  return {
    showBackButton,
    hideBackButton,
    isAvailable: !!webApp?.BackButton,
    isVisible: webApp?.BackButton?.isVisible || false
  };
}

export function useTelegramSettingsButton() {
  const { webApp } = useTelegramWebApp();

  const showSettingsButton = useCallback((onClick: () => void) => {
    if (webApp?.SettingsButton) {
      webApp.SettingsButton.onClick(onClick);
      webApp.SettingsButton.show();
    }
  }, [webApp]);

  const hideSettingsButton = useCallback(() => {
    if (webApp?.SettingsButton) {
      webApp.SettingsButton.hide();
    }
  }, [webApp]);

  return {
    showSettingsButton,
    hideSettingsButton,
    isAvailable: !!webApp?.SettingsButton,
    isVisible: webApp?.SettingsButton?.isVisible || false
  };
}

export function useTelegramHaptics() {
  const { webApp } = useTelegramWebApp();

  const impactFeedback = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.impactOccurred(style);
    }
  }, [webApp]);

  const notificationFeedback = useCallback((type: 'error' | 'success' | 'warning') => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.notificationOccurred(type);
    }
  }, [webApp]);

  const selectionFeedback = useCallback(() => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.selectionChanged();
    }
  }, [webApp]);

  return {
    impactFeedback,
    notificationFeedback,
    selectionFeedback,
    isAvailable: !!webApp?.HapticFeedback
  };
}

export function useTelegramPopups() {
  const { webApp } = useTelegramWebApp();

  const showPopup = useCallback((params: {
    title?: string;
    message: string;
    buttons?: Array<{ id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text?: string }>;
  }, callback?: (button_id: string) => void) => {
    if (webApp?.showPopup) {
      webApp.showPopup(params, callback);
    }
  }, [webApp]);

  const showAlert = useCallback((message: string, callback?: () => void) => {
    if (webApp?.showAlert) {
      webApp.showAlert(message, callback);
    }
  }, [webApp]);

  const showConfirm = useCallback((message: string, callback?: (confirmed: boolean) => void) => {
    if (webApp?.showConfirm) {
      webApp.showConfirm(message, callback);
    }
  }, [webApp]);

  return {
    showPopup,
    showAlert,
    showConfirm,
    isAvailable: !!webApp?.showPopup
  };
}