/**
 * Memory Manager - управление памятью и очистка ресурсов
 * Предотвращает утечки памяти и оптимизирует использование ресурсов
 */

interface MemoryEntry {
  data: any;
  size: number;
  timestamp: number;
  accessCount: number;
}

class MemoryManager {
  private static instance: MemoryManager;
  private allocatedMemory = new Map<string, MemoryEntry>();
  private maxMemoryMB = 50; // Максимальный размер кеша в МБ
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startPeriodicCleanup();
    this.setupMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  // Выделение памяти с учетом лимитов
  allocate(key: string, data: any): boolean {
    try {
      const size = this.calculateSize(data);
      const currentMemory = this.getTotalMemoryUsage();
      
      if (currentMemory + size > this.maxMemoryMB * 1024 * 1024) {
        this.cleanup();
        
        // Повторная проверка после очистки
        if (this.getTotalMemoryUsage() + size > this.maxMemoryMB * 1024 * 1024) {
          console.warn('[MemoryManager] Insufficient memory for allocation:', key);
          return false;
        }
      }

      this.allocatedMemory.set(key, {
        data,
        size,
        timestamp: Date.now(),
        accessCount: 0
      });

      return true;
    } catch (error) {
      console.error('[MemoryManager] Allocation failed:', error);
      return false;
    }
  }

  // Получение данных из памяти
  get(key: string): any | null {
    const entry = this.allocatedMemory.get(key);
    if (!entry) return null;

    entry.accessCount++;
    entry.timestamp = Date.now(); // Обновляем время последнего доступа
    return entry.data;
  }

  // Освобождение памяти
  free(key: string): boolean {
    return this.allocatedMemory.delete(key);
  }

  // Вычисление размера объекта в байтах (примерное)
  private calculateSize(obj: any): number {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      // Fallback для объектов, которые не могут быть сериализованы
      return 1024; // Примерный размер
    }
  }

  // Получение общего использования памяти
  private getTotalMemoryUsage(): number {
    let total = 0;
    for (const entry of this.allocatedMemory.values()) {
      total += entry.size;
    }
    return total;
  }

  // Очистка памяти по алгоритму LRU
  private cleanup(): void {
    const entries = Array.from(this.allocatedMemory.entries());
    
    // Сортируем по времени последнего доступа и частоте использования
    entries.sort(([,a], [,b]) => {
      const scoreA = a.timestamp + (a.accessCount * 10000);
      const scoreB = b.timestamp + (b.accessCount * 10000);
      return scoreA - scoreB;
    });

    // Удаляем 30% наименее используемых записей
    const toRemove = Math.ceil(entries.length * 0.3);
    for (let i = 0; i < toRemove; i++) {
      this.allocatedMemory.delete(entries[i][0]);
    }

    console.log(`[MemoryManager] Cleaned up ${toRemove} entries`);
  }

  // Периодическая очистка устаревших данных
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 минут

      for (const [key, entry] of this.allocatedMemory.entries()) {
        if (now - entry.timestamp > maxAge) {
          this.allocatedMemory.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Проверяем каждые 5 минут
  }

  // Мониторинг использования памяти
  private setupMemoryMonitoring(): void {
    if ('performance' in window && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize / 1024 / 1024; // МБ
        
        if (usage > 100) { // Если больше 100МБ
          console.warn('[MemoryManager] High memory usage detected:', usage.toFixed(2), 'MB');
          this.cleanup();
        }
      }, 30000); // Проверяем каждые 30 секунд
    }
  }

  // Получение статистики памяти
  getMemoryStats() {
    const totalMemory = this.getTotalMemoryUsage();
    return {
      totalAllocated: (totalMemory / 1024 / 1024).toFixed(2) + ' MB',
      entriesCount: this.allocatedMemory.size,
      maxMemoryMB: this.maxMemoryMB,
      utilizationPercent: ((totalMemory / (this.maxMemoryMB * 1024 * 1024)) * 100).toFixed(1)
    };
  }

  // Принудительная очистка всей памяти
  forceCleanup(): void {
    this.allocatedMemory.clear();
    console.log('[MemoryManager] Force cleanup completed');
  }

  // Деструктор
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.allocatedMemory.clear();
  }
}

export const memoryManager = MemoryManager.getInstance();