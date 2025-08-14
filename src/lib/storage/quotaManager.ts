/**
 * Storage Quota Manager
 * Handles localStorage quota exceeded errors
 */

export class QuotaManager {
  private static instance: QuotaManager;

  private constructor() {}

  static getInstance(): QuotaManager {
    if (!QuotaManager.instance) {
      QuotaManager.instance = new QuotaManager();
    }
    return QuotaManager.instance;
  }

  /**
   * Clear localStorage with priority preservation
   */
  clearStorage(preserveKeys: string[] = ['auth', 'user']): void {
    try {
      const preservedData: Record<string, string> = {};
      
      // Preserve important data
      preserveKeys.forEach(key => {
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey?.includes(key)) {
            preservedData[storageKey] = localStorage.getItem(storageKey) || '';
          }
        }
      });

      // Clear all localStorage
      localStorage.clear();

      // Restore preserved data
      Object.entries(preservedData).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('[QuotaManager] Failed to restore preserved data:', key);
        }
      });

      console.log('[QuotaManager] Storage cleared successfully');
    } catch (error) {
      console.error('[QuotaManager] Failed to clear storage:', error);
    }
  }

  /**
   * Get storage usage info
   */
  getStorageInfo(): { used: number; available: number; total: number } {
    let used = 0;
    
    try {
      // Estimate used storage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          used += key.length + value.length;
        }
      }
    } catch (error) {
      console.warn('[QuotaManager] Failed to calculate storage usage');
    }

    // Rough estimates for localStorage limits
    const total = 5 * 1024 * 1024; // 5MB typical limit
    const available = Math.max(0, total - used);

    return { used, available, total };
  }

  /**
   * Check if storage is near quota
   */
  isNearQuota(threshold = 0.9): boolean {
    const info = this.getStorageInfo();
    return info.used / info.total > threshold;
  }

  /**
   * Safe localStorage setItem with quota handling
   */
  safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[QuotaManager] Quota exceeded, clearing cache...');
        this.clearStorage(['auth', 'user', 'supabase']);
        
        // Retry once after clearing
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.error('[QuotaManager] Failed to set item after clearing:', retryError);
          return false;
        }
      }
      console.error('[QuotaManager] Failed to set localStorage item:', error);
      return false;
    }
  }

  /**
   * Monitor and handle quota exceeded errors globally
   */
  initGlobalErrorHandler(): void {
    window.addEventListener('error', (event) => {
      if (event.error?.message?.includes('quota') || 
          event.error?.message?.includes('QuotaExceededError')) {
        console.warn('[QuotaManager] Global quota error detected, clearing storage...');
        this.clearStorage();
      }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('quota') || 
          event.reason?.message?.includes('QuotaExceededError')) {
        console.warn('[QuotaManager] Promise quota error detected, clearing storage...');
        this.clearStorage();
        event.preventDefault(); // Prevent console error
      }
    });
  }
}

// Global instance
export const quotaManager = QuotaManager.getInstance();

// Initialize global error handling
quotaManager.initGlobalErrorHandler();