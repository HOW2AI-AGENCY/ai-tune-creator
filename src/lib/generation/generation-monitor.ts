/**
 * Generation Monitor System
 * Централизованная система мониторинга и управления генерациями
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface GenerationStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  errorMessage?: string;
  progress?: number;
}

export interface GenerationMonitorState {
  id: string;
  service: 'suno' | 'mureka';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stages: GenerationStage[];
  currentStage?: string;
  overallProgress: number;
  title: string;
  subtitle?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

const GENERATION_STAGES = {
  VALIDATION: {
    id: 'validation',
    name: 'Проверка параметров',
    order: 1
  },
  QUEUE: {
    id: 'queue',
    name: 'Добавление в очередь',
    order: 2
  },
  GENERATION: {
    id: 'generation',
    name: 'Генерация музыки',
    order: 3
  },
  PROCESSING: {
    id: 'processing',
    name: 'Обработка результата',
    order: 4
  },
  SAVING: {
    id: 'saving',
    name: 'Сохранение',
    order: 5
  }
} as const;

export class GenerationMonitor {
  private states: Map<string, GenerationMonitorState> = new Map();
  private listeners: Map<string, Set<(state: GenerationMonitorState) => void>> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private syncInterval?: NodeJS.Timeout;

  constructor() {
    this.startCleanupTask();
    this.startSyncTask();
  }

  /**
   * Создать новую генерацию
   */
  create(id: string, service: 'suno' | 'mureka', metadata?: Record<string, any>): GenerationMonitorState {
    const stages: GenerationStage[] = Object.values(GENERATION_STAGES).map(stage => ({
      id: stage.id,
      name: stage.name,
      status: 'pending' as const,
      progress: 0
    }));

    const description = metadata?.input?.description || '';
    const state: GenerationMonitorState = {
      id,
      service,
      status: 'pending',
      stages,
      currentStage: GENERATION_STAGES.VALIDATION.id,
      overallProgress: 0,
      title: `Генерация ${service === 'suno' ? 'Suno AI' : 'Mureka'}`,
      subtitle: description.slice(0, 60) + (description.length > 60 ? '...' : ''),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata
    };

    this.states.set(id, state);
    this.notifyListeners(id, state);
    
    logger.info('Generation created', { id, service });
    return state;
  }

  /**
   * Обновить стадию генерации
   */
  updateStage(
    id: string, 
    stageId: string, 
    update: Partial<GenerationStage>
  ): void {
    const state = this.states.get(id);
    if (!state) {
      logger.warn('Generation not found for stage update', { id, stageId });
      return;
    }

    const stageIndex = state.stages.findIndex(s => s.id === stageId);
    if (stageIndex === -1) {
      logger.warn('Stage not found', { id, stageId });
      return;
    }

    // Обновляем стадию
    state.stages[stageIndex] = {
      ...state.stages[stageIndex],
      ...update,
      ...(update.status === 'running' ? { startTime: Date.now() } : {}),
      ...(update.status === 'completed' || update.status === 'error' ? { endTime: Date.now() } : {})
    };

    // Обновляем текущую стадию
    if (update.status === 'running') {
      state.currentStage = stageId;
    }

    // Рассчитываем общий прогресс
    const completedStages = state.stages.filter(s => s.status === 'completed').length;
    const totalStages = state.stages.length;
    state.overallProgress = Math.round((completedStages / totalStages) * 100);

    // Проверяем, завершены ли все стадии
    const allCompleted = state.stages.every(s => s.status === 'completed');
    const hasError = state.stages.some(s => s.status === 'error');

    if (allCompleted) {
      state.status = 'completed';
    } else if (hasError) {
      state.status = 'failed';
    } else if (state.stages.some(s => s.status === 'running')) {
      state.status = 'processing';
    }

    state.updatedAt = Date.now();
    this.states.set(id, state);
    this.notifyListeners(id, state);

    logger.debug('Stage updated', { id, stageId, status: update.status, progress: state.overallProgress });
  }

  /**
   * Установить ошибку для генерации
   */
  setError(id: string, stageId: string, errorMessage: string): void {
    this.updateStage(id, stageId, {
      status: 'error',
      errorMessage
    });

    const state = this.states.get(id);
    if (state) {
      state.status = 'failed';
      state.updatedAt = Date.now();
      this.states.set(id, state);
      this.notifyListeners(id, state);
    }

    logger.error('Generation error', { id, stageId, errorMessage });
  }

  /**
   * Завершить генерацию
   */
  complete(id: string): void {
    const state = this.states.get(id);
    if (!state) return;

    // Пометить все стадии как завершенные
    state.stages.forEach(stage => {
      if (stage.status !== 'error') {
        stage.status = 'completed';
        stage.progress = 100;
      }
    });

    state.status = 'completed';
    state.overallProgress = 100;
    state.updatedAt = Date.now();
    
    this.states.set(id, state);
    this.notifyListeners(id, state);

    logger.info('Generation completed', { id });
  }

  /**
   * Получить состояние генерации
   */
  get(id: string): GenerationMonitorState | undefined {
    return this.states.get(id);
  }

  /**
   * Получить все активные генерации
   */
  getActive(): GenerationMonitorState[] {
    return Array.from(this.states.values()).filter(
      s => s.status === 'pending' || s.status === 'processing'
    );
  }

  /**
   * Подписаться на обновления генерации
   */
  subscribe(id: string, callback: (state: GenerationMonitorState) => void): () => void {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(callback);

    // Возвращаем функцию отписки
    return () => {
      const listeners = this.listeners.get(id);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(id);
        }
      }
    };
  }

  /**
   * Уведомить слушателей об обновлении
   */
  private notifyListeners(id: string, state: GenerationMonitorState): void {
    const listeners = this.listeners.get(id);
    if (listeners) {
      listeners.forEach(callback => callback(state));
    }
  }

  /**
   * Очистить завершенные генерации (старше 1 часа)
   */
  private async cleanup(): Promise<void> {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, state] of this.states.entries()) {
      if (
        (state.status === 'completed' || state.status === 'failed') &&
        state.updatedAt < oneHourAgo
      ) {
        this.states.delete(id);
        this.listeners.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up old generations', { cleaned });
    }
  }

  /**
   * Синхронизировать с базой данных
   */
  private async syncWithDatabase(): Promise<void> {
    try {
      const activeStates = this.getActive();
      
      for (const state of activeStates) {
        // Проверяем актуальный статус в БД
        const { data, error } = await supabase
          .from('ai_generations')
          .select('status, completed_at, error_message')
          .eq('id', state.id)
          .single();

        if (error || !data) continue;

        // Обновляем локальное состояние если есть изменения в БД
        if (data.status === 'completed' && state.status !== 'completed') {
          this.complete(state.id);
        } else if (data.status === 'failed' && state.status !== 'failed') {
          this.setError(state.id, state.currentStage || 'generation', data.error_message || 'Unknown error');
        }
      }
    } catch (error) {
      logger.error('Database sync error', error);
    }
  }

  /**
   * Восстановить незавершенные генерации из БД
   */
  async recover(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .in('status', ['pending', 'processing'])
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Последние 24 часа

      if (error || !data || data.length === 0) return;

      for (const gen of data) {
        if (!this.states.has(gen.id)) {
          // Проверяем, что service валидный
          const service = gen.service === 'suno' || gen.service === 'mureka' ? gen.service : 'suno';
          const metadata = gen.metadata && typeof gen.metadata === 'object' ? gen.metadata as Record<string, any> : undefined;
          
          // Восстанавливаем состояние
          const state = this.create(gen.id, service, metadata);
          
          // Обновляем прогресс на основе времени создания
          const elapsed = Date.now() - new Date(gen.created_at).getTime();
          const estimatedProgress = Math.min(80, Math.floor(elapsed / 1000 / 60 * 10)); // ~10% в минуту
          
          // Активируем соответствующую стадию
          if (gen.status === 'processing') {
            this.updateStage(gen.id, GENERATION_STAGES.GENERATION.id, { 
              status: 'running', 
              progress: estimatedProgress 
            });
          }
        }
      }

      logger.info('Recovered generations', { count: data.length });
    } catch (error) {
      logger.error('Recovery error', error);
    }
  }

  /**
   * Запустить задачу очистки
   */
  private startCleanupTask(): void {
    // Очистка каждые 10 минут
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  /**
   * Запустить задачу синхронизации
   */
  private startSyncTask(): void {
    // Синхронизация каждые 30 секунд
    this.syncInterval = setInterval(() => {
      this.syncWithDatabase();
    }, 30 * 1000);
  }

  /**
   * Остановить все фоновые задачи
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Singleton instance
export const generationMonitor = new GenerationMonitor();

// Восстановить при загрузке
generationMonitor.recover();
