/**
 * Error Recovery System
 * Система восстановления после ошибок и retry логика
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

export interface ErrorContext {
  generationId: string;
  service: 'suno' | 'mureka';
  stage: string;
  attempt: number;
  error: Error;
  timestamp: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: [
    'RATE_LIMIT',
    'TIMEOUT',
    'NETWORK_ERROR',
    'SERVICE_UNAVAILABLE',
    'TEMPORARY_ERROR'
  ]
};

export class ErrorRecovery {
  private errorHistory: Map<string, ErrorContext[]> = new Map();
  private retryConfig: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Записать ошибку в историю
   */
  recordError(context: ErrorContext): void {
    const history = this.errorHistory.get(context.generationId) || [];
    history.push(context);
    this.errorHistory.set(context.generationId, history);

    logger.error('Error recorded', {
      generationId: context.generationId,
      stage: context.stage,
      attempt: context.attempt,
      error: context.error.message
    });
  }

  /**
   * Проверить, можно ли повторить попытку
   */
  canRetry(generationId: string, stage: string): boolean {
    const history = this.errorHistory.get(generationId) || [];
    const stageAttempts = history.filter(h => h.stage === stage);
    
    return stageAttempts.length < this.retryConfig.maxAttempts;
  }

  /**
   * Получить задержку для следующей попытки (экспоненциальная задержка)
   */
  getRetryDelay(generationId: string, stage: string): number {
    const history = this.errorHistory.get(generationId) || [];
    const stageAttempts = history.filter(h => h.stage === stage);
    const attempt = stageAttempts.length;

    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
      this.retryConfig.maxDelay
    );

    // Добавляем случайность (jitter) для предотвращения thundering herd
    const jitter = delay * Math.random() * 0.1;
    return Math.floor(delay + jitter);
  }

  /**
   * Проверить, является ли ошибка повторяемой
   */
  isRetryable(error: Error): boolean {
    const errorMessage = error.message.toUpperCase();
    return this.retryConfig.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Выполнить операцию с повторными попытками
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Omit<ErrorContext, 'attempt' | 'error' | 'timestamp'>
  ): Promise<T> {
    let lastError: Error | undefined;
    const maxAttempts = this.retryConfig.maxAttempts;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Записываем ошибку
        this.recordError({
          ...context,
          attempt,
          error: lastError,
          timestamp: Date.now()
        });

        // Проверяем, можно ли повторить
        if (!this.isRetryable(lastError) || attempt === maxAttempts - 1) {
          throw lastError;
        }

        // Ждем перед следующей попыткой
        const delay = this.getRetryDelay(context.generationId, context.stage);
        logger.info('Retrying operation', {
          generationId: context.generationId,
          stage: context.stage,
          attempt: attempt + 1,
          delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Очистить историю ошибок для генерации
   */
  clearHistory(generationId: string): void {
    this.errorHistory.delete(generationId);
  }

  /**
   * Получить статистику ошибок
   */
  getErrorStats(generationId: string): {
    totalErrors: number;
    byStage: Record<string, number>;
    lastError?: ErrorContext;
  } {
    const history = this.errorHistory.get(generationId) || [];
    const byStage: Record<string, number> = {};

    for (const error of history) {
      byStage[error.stage] = (byStage[error.stage] || 0) + 1;
    }

    return {
      totalErrors: history.length,
      byStage,
      lastError: history[history.length - 1]
    };
  }

  /**
   * Автоматическое восстановление застрявших генераций
   */
  async recoverStuckGenerations(): Promise<void> {
    try {
      // Найти генерации, которые застряли в processing > 30 минут
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data: stuckGens, error } = await supabase
        .from('ai_generations')
        .select('id, service, external_id')
        .eq('status', 'processing')
        .lt('created_at', thirtyMinutesAgo);

      if (error || !stuckGens || stuckGens.length === 0) {
        if (error) {
          logger.error('Failed to fetch stuck generations', error);
        }
        return;
      }

      logger.info('Found stuck generations', { count: stuckGens.length });

      for (const gen of stuckGens) {
        try {
          // Попытаться проверить актуальный статус
          const functionName = gen.service === 'suno' 
            ? 'get-suno-record-info' 
            : 'get-mureka-task-status';

          const { data: status, error: statusError } = await supabase.functions.invoke(functionName, {
            body: { 
              taskId: gen.external_id,
              generationId: gen.id
            }
          });

          if (statusError) {
            // Если не можем проверить статус, помечаем как failed
            await supabase
              .from('ai_generations')
              .update({
                status: 'failed',
                error_message: 'Generation timeout - exceeded 30 minutes',
                completed_at: new Date().toISOString()
              })
              .eq('id', gen.id);

            logger.warn('Marked stuck generation as failed', { id: gen.id });
          } else if (status?.status === 'completed') {
            // Если генерация завершена, обновляем статус
            logger.info('Recovered completed generation', { id: gen.id });
          }
        } catch (error) {
          logger.error('Error recovering generation', { id: gen.id, error });
        }
      }
    } catch (error) {
      logger.error('Error in recoverStuckGenerations', error);
    }
  }
}

// Singleton instance
export const errorRecovery = new ErrorRecovery();

// Запускаем периодическую проверку застрявших генераций
setInterval(() => {
  errorRecovery.recoverStuckGenerations();
}, 10 * 60 * 1000); // Каждые 10 минут
