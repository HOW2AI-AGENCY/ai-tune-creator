/**
 * Request Deduplicator - предотвращение дублирования запросов
 * Решает проблему множественных одинаковых API запросов
 */

import { createComponentLogger } from '@/lib/debug/ConsoleManager';

const logger = createComponentLogger('RequestDeduplicator');

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private static instance: RequestDeduplicator;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestTimeout = 5000; // 5 секунд

  private constructor() {
    // Очистка устаревших запросов каждые 30 секунд
    setInterval(() => {
      this.cleanupExpiredRequests();
    }, 30000);
  }

  static getInstance(): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator();
    }
    return RequestDeduplicator.instance;
  }

  /**
   * Выполняет запрос с дедупликацией
   * Если такой же запрос уже выполняется, возвращает существующий Promise
   */
  async execute<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    const existing = this.pendingRequests.get(key);
    
    // Если запрос уже выполняется и не устарел
    if (existing && (Date.now() - existing.timestamp) < this.requestTimeout) {
      logger.debug('Reusing existing request for key:', key);
      return existing.promise;
    }

    // Создаем новый запрос
    logger.debug('Creating new request for key:', key);
    const promise = requestFn().finally(() => {
      // Удаляем запрос после завершения
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  /**
   * Принудительно отменяет все запросы для ключа
   */
  cancel(key: string): void {
    if (this.pendingRequests.has(key)) {
      logger.debug('Cancelling request for key:', key);
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Очищает все ожидающие запросы
   */
  clear(): void {
    logger.debug('Clearing all pending requests');
    this.pendingRequests.clear();
  }

  /**
   * Очищает устаревшие запросы
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.requestTimeout) {
        this.pendingRequests.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired requests`);
    }
  }

  /**
   * Получает статистику активных запросов
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.pendingRequests.keys())
    };
  }
}

export const requestDeduplicator = RequestDeduplicator.getInstance();

/**
 * Хелпер для дедупликации запросов к Supabase
 */
export function deduplicateSupabaseRequest<T>(
  operation: string,
  params: Record<string, any> = {}
): (requestFn: () => Promise<T>) => Promise<T> {
  return (requestFn: () => Promise<T>) => {
    const key = `supabase:${operation}:${JSON.stringify(params)}`;
    return requestDeduplicator.execute(key, requestFn);
  };
}