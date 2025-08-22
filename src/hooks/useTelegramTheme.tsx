import { useEffect } from 'react';
import { useTelegramWebApp } from './useTelegramWebApp';

export function useTelegramTheme() {
  const { webApp, isInTelegram, colorScheme } = useTelegramWebApp();

  useEffect(() => {
    if (!isInTelegram || !webApp?.themeParams) return;

    const themeParams = webApp.themeParams;
    const root = document.documentElement;

    // Map Telegram colors to CSS variables
    const colorMappings = {
      '--telegram-bg': themeParams.bg_color || '#ffffff',
      '--telegram-text': themeParams.text_color || '#000000',
      '--telegram-hint': themeParams.hint_color || '#708499',
      '--telegram-link': themeParams.link_color || '#2481cc',
      '--telegram-button': themeParams.button_color || '#2481cc',
      '--telegram-button-text': themeParams.button_text_color || '#ffffff',
      '--telegram-secondary-bg': themeParams.secondary_bg_color || '#f1f1f1',
      '--telegram-header-bg': themeParams.header_bg_color || '#527da3',
      '--telegram-accent': themeParams.accent_text_color || '#2481cc',
      '--telegram-section-bg': themeParams.section_bg_color || '#ffffff',
      '--telegram-section-header': themeParams.section_header_text_color || '#708499',
      '--telegram-subtitle': themeParams.subtitle_text_color || '#708499',
      '--telegram-destructive': themeParams.destructive_text_color || '#d14a4a',
    };

    // Apply colors to CSS variables
    Object.entries(colorMappings).forEach(([property, value]) => {
      if (value) {
        root.style.setProperty(property, value);
      }
    });

    // Convert hex to HSL for better integration with our design system
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Apply HSL versions for better integration
    if (themeParams.bg_color) {
      root.style.setProperty('--background', hexToHsl(themeParams.bg_color));
    }
    if (themeParams.text_color) {
      root.style.setProperty('--foreground', hexToHsl(themeParams.text_color));
    }
    if (themeParams.button_color) {
      root.style.setProperty('--primary', hexToHsl(themeParams.button_color));
    }
    if (themeParams.secondary_bg_color) {
      root.style.setProperty('--secondary', hexToHsl(themeParams.secondary_bg_color));
    }

    // Apply theme class to body
    document.body.classList.toggle('telegram-theme', true);
    document.body.classList.toggle('telegram-dark', colorScheme === 'dark');
    document.body.classList.toggle('telegram-light', colorScheme === 'light');

  }, [isInTelegram, webApp, colorScheme]);

  return {
    isInTelegram,
    colorScheme,
    themeParams: webApp?.themeParams
  };
}