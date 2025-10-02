/**
 * Console Manager - централизованное управление логированием
 * Автоматическое отключение в production, группировка и фильтрация
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  component?: string;
}

class ConsoleManager {
  private static instance: ConsoleManager;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = import.meta.env.DEV;
  private enabledLevels: Set<LogLevel> = new Set(['error', 'warn']);

  private constructor() {
    // В development режиме включаем все уровни
    if (this.isDevelopment) {
      this.enabledLevels.add('info');
      this.enabledLevels.add('debug');
    }
  }

  static getInstance(): ConsoleManager {
    if (!ConsoleManager.instance) {
      ConsoleManager.instance = new ConsoleManager();
    }
    return ConsoleManager.instance;
  }

  private log(level: LogLevel, component: string, message: string, data?: any): void {
    if (!this.enabledLevels.has(level)) return;

    // Sanitize sensitive data before logging
    const sanitizedData = this.sanitizeData(data);

    const entry: LogEntry = {
      level,
      message,
      data: sanitizedData,
      timestamp: Date.now(),
      component
    };

    // Добавляем в внутренний лог
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Выводим в консоль только в development
    if (this.isDevelopment) {
      const formattedMessage = `[${component}] ${message}`;
      
      switch (level) {
        case 'debug':
          console.debug(formattedMessage, sanitizedData);
          break;
        case 'info':
          console.info(formattedMessage, sanitizedData);
          break;
        case 'warn':
          console.warn(formattedMessage, sanitizedData);
          break;
        case 'error':
          console.error(formattedMessage, sanitizedData);
          break;
      }
    }
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = [
      'password', 'token', 'key', 'secret', 'auth', 'authorization',
      'access_token', 'refresh_token', 'api_key', 'private_key',
      'telegram_id', 'telegram_username', 'telegram_first_name', 'telegram_last_name',
      'user_id', 'userid', 'email', 'phone', 'ip_address', 'user_agent',
      'session', 'cookie', 'apikey', 'accesstoken', 'refreshtoken'
    ];

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    const sanitizeRecursive = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeRecursive);
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeRecursive(value);
        } else if (typeof value === 'string' && value.length > 30 && /^[A-Za-z0-9_-]{30,}$/.test(value)) {
          // Likely a token/key based on pattern
          result[key] = '[REDACTED]';
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeRecursive(sanitized);
  }

  // Публичные методы для логирования
  debug(component: string, message: string, data?: any): void {
    this.log('debug', component, message, data);
  }

  info(component: string, message: string, data?: any): void {
    this.log('info', component, message, data);
  }

  warn(component: string, message: string, data?: any): void {
    this.log('warn', component, message, data);
  }

  error(component: string, message: string, data?: any): void {
    this.log('error', component, message, data);
  }

  // Группировка логов
  group(component: string, label: string): void {
    if (this.isDevelopment) {
      console.group(`[${component}] ${label}`);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  // Получение логов для отладки
  getLogs(component?: string, level?: LogLevel): LogEntry[] {
    return this.logs.filter(log => {
      if (component && log.component !== component) return false;
      if (level && log.level !== level) return false;
      return true;
    });
  }

  // Очистка логов
  clearLogs(): void {
    this.logs = [];
  }

  // Настройка уровней логирования
  setEnabledLevels(levels: LogLevel[]): void {
    this.enabledLevels = new Set(levels);
  }

  // Экспорт логов для отладки
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = ConsoleManager.getInstance();

// Создаем компонентные логгеры для удобства
export const createComponentLogger = (componentName: string) => ({
  debug: (message: string, data?: any) => logger.debug(componentName, message, data),
  info: (message: string, data?: any) => logger.info(componentName, message, data),
  warn: (message: string, data?: any) => logger.warn(componentName, message, data),
  error: (message: string, data?: any) => logger.error(componentName, message, data),
  group: (label: string) => logger.group(componentName, label),
  groupEnd: () => logger.groupEnd()
});