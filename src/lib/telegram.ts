// Telegram Mini App Integration Script
// Должен быть добавлен в index.html

export const TELEGRAM_WEB_APP_SCRIPT = `
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script>
  // Инициализация Telegram Mini App
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    
    // Готовность приложения
    tg.ready();
    
    // Расширение до полного экрана
    tg.expand();
    
    // Включение закрытия подтверждения
    tg.enableClosingConfirmation();
    
    // Применение темы Telegram
    if (tg.colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    
    // Настройка цветов интерфейса
    if (tg.themeParams) {
      const root = document.documentElement.style;
      
      if (tg.themeParams.bg_color) {
        root.setProperty('--tg-bg-color', tg.themeParams.bg_color);
      }
      if (tg.themeParams.text_color) {
        root.setProperty('--tg-text-color', tg.themeParams.text_color);
      }
      if (tg.themeParams.button_color) {
        root.setProperty('--tg-button-color', tg.themeParams.button_color);
      }
      if (tg.themeParams.button_text_color) {
        root.setProperty('--tg-button-text-color', tg.themeParams.button_text_color);
      }
      if (tg.themeParams.secondary_bg_color) {
        root.setProperty('--tg-secondary-bg-color', tg.themeParams.secondary_bg_color);
      }
    }
    
    // Отключение контекстного меню на долгое нажатие
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });
    
    // Отключение выделения текста
    document.addEventListener('selectstart', function(e) {
      e.preventDefault();
    });
    
    // Viewport adjustments
    function adjustViewport() {
      const vh = tg.viewportHeight * 0.01;
      document.documentElement.style.setProperty('--tg-vh', vh + 'px');
    }
    
    adjustViewport();
    
    // Обработка изменений viewport
    tg.onEvent('viewportChanged', adjustViewport);
  }
</script>
`;

// Конфигурация для интеграции с Telegram Bot
export const TELEGRAM_BOT_CONFIG = {
  // Webhook URL для обработки команд от бота
  webhookUrl: process.env.REACT_APP_TELEGRAM_WEBHOOK_URL || '',
  
  // Команды бота
  commands: [
    { command: 'start', description: 'Запустить AI Tune Creator' },
    { command: 'help', description: 'Получить помощь' },
    { command: 'generate', description: 'Создать музыку с ИИ' },
    { command: 'library', description: 'Открыть библиотеку треков' },
    { command: 'profile', description: 'Настройки профиля' }
  ],
  
  // Inline клавиатура для бота
  inlineKeyboard: [
    [
      { text: '🎵 Создать музыку', web_app: { url: '/generate' } },
      { text: '📚 Библиотека', web_app: { url: '/tracks' } }
    ],
    [
      { text: '🎨 Проекты', web_app: { url: '/projects' } },
      { text: '👤 Артисты', web_app: { url: '/artists' } }
    ],
    [
      { text: '⚙️ Настройки', web_app: { url: '/settings' } }
    ]
  ]
};

// Утилиты для работы с Telegram Bot API
export function sendToTelegramBot(method: string, data: any) {
  const botToken = process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('Telegram Bot Token not configured');
    return;
  }
  
  return fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// Отправка уведомления пользователю через бота
export function sendNotificationToUser(userId: number, message: string) {
  return sendToTelegramBot('sendMessage', {
    chat_id: userId,
    text: message,
    parse_mode: 'HTML'
  });
}

// Отправка трека пользователю
export function sendTrackToUser(userId: number, trackUrl: string, trackTitle: string) {
  return sendToTelegramBot('sendAudio', {
    chat_id: userId,
    audio: trackUrl,
    title: trackTitle,
    caption: `🎵 Ваш трек "${trackTitle}" готов!`
  });
}