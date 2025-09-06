/**
 * Boot Logger - логирование этапов загрузки приложения
 */

export class BootLogger {
  private static logs: { step: string; timestamp: number; data?: any }[] = [];

  static log(step: string, data?: any) {
    const timestamp = Date.now();
    this.logs.push({ step, timestamp, data });
    
    // Логируем в консоль
    console.log(`[BOOT] ${step}`, data || '');
    
    // Сохраняем в localStorage для диагностики
    try {
      localStorage.setItem('boot-logs', JSON.stringify(this.logs.slice(-20)));
    } catch (e) {
      console.warn('Failed to save boot logs to localStorage');
    }
  }

  static getLogs() {
    return [...this.logs];
  }

  static getLogsFromStorage() {
    try {
      const saved = localStorage.getItem('boot-logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  static clear() {
    this.logs = [];
    localStorage.removeItem('boot-logs');
  }
}

// Export instance для удобства
export const bootLogger = BootLogger;