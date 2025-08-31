import { useState, useEffect } from 'react';

interface TelegramTheme {
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color: string;
}

export const useTelegramTheme = () => {
  const [theme, setTheme] = useState<TelegramTheme | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if we're in Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tgTheme = window.Telegram.WebApp.themeParams;
      setTheme(tgTheme);
      setIsDark(tgTheme.bg_color?.startsWith('#1') || false);
    }
  }, []);

  const applyTheme = () => {
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty('--tg-bg-color', theme.bg_color);
    root.style.setProperty('--tg-text-color', theme.text_color);
    root.style.setProperty('--tg-hint-color', theme.hint_color);
    root.style.setProperty('--tg-link-color', theme.link_color);
    root.style.setProperty('--tg-button-color', theme.button_color);
    root.style.setProperty('--tg-button-text-color', theme.button_text_color);
    root.style.setProperty('--tg-secondary-bg-color', theme.secondary_bg_color);
  };

  return {
    theme,
    isDark,
    applyTheme,
    isAvailable: !!theme
  };
};