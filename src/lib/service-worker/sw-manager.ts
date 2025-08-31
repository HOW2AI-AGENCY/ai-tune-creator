/**
 * Service Worker Manager
 * Handles service worker registration, updates, and caching strategies
 */

import { Workbox } from 'workbox-window';

interface UpdateAvailableEvent {
  isUpdate: boolean;
  registration: ServiceWorkerRegistration;
}

class ServiceWorkerManager {
  private wb: Workbox | null = null;
  private isRegistered = false;
  private updateAvailable = false;
  private refreshing = false;

  /**
   * Initialize service worker
   */
  public async init(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers are not supported in this browser');
      return;
    }

    if (process.env.NODE_ENV !== 'production' && !import.meta.env.DEV) {
      console.log('Service worker disabled in development');
      return;
    }

    try {
      this.wb = new Workbox('/sw.js');
      await this.setupEventListeners();
      await this.register();
    } catch (error) {
      console.error('Failed to initialize service worker:', error);
    }
  }

  /**
   * Setup service worker event listeners
   */
  private async setupEventListeners(): Promise<void> {
    if (!this.wb) return;

    // Service worker installed for the first time
    this.wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        console.log('Service worker updated');
        this.showUpdateNotification();
      } else {
        console.log('Service worker installed');
        this.showInstallNotification();
      }
    });

    // Service worker is waiting to take control
    this.wb.addEventListener('waiting', (event) => {
      console.log('Service worker is waiting');
      this.updateAvailable = true;
      this.showUpdateAvailableNotification();
    });

    // Service worker has taken control
    this.wb.addEventListener('controlling', (event) => {
      console.log('Service worker is controlling');
      if (this.refreshing) return;
      this.refreshing = true;
      window.location.reload();
    });

    // Service worker activated
    this.wb.addEventListener('activated', (event) => {
      if (event.isUpdate) {
        console.log('Service worker activated after update');
      } else {
        console.log('Service worker activated');
      }
    });

    // Listen for cache updates
    this.wb.addEventListener('message', (event) => {
      if (event.data.type === 'CACHE_UPDATED') {
        const { updatedURL } = event.data.payload;
        console.log(`Cache updated for: ${updatedURL}`);
        
        // Emit custom event for cache updates
        window.dispatchEvent(new CustomEvent('sw-cache-updated', {
          detail: { url: updatedURL }
        }));
      }
    });
  }

  /**
   * Register service worker
   */
  private async register(): Promise<void> {
    if (!this.wb) return;

    try {
      await this.wb.register();
      this.isRegistered = true;
      console.log('Service worker registered successfully');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  /**
   * Update service worker
   */
  public async update(): Promise<void> {
    if (!this.wb || !this.isRegistered) {
      console.warn('Service worker not available for update');
      return;
    }

    try {
      await this.wb.update();
      console.log('Service worker update triggered');
    } catch (error) {
      console.error('Service worker update failed:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  public async skipWaiting(): Promise<void> {
    if (!this.wb) return;

    this.wb.messageSkipWaiting();
    console.log('Skip waiting sent to service worker');
  }

  /**
   * Show install notification
   */
  private showInstallNotification(): void {
    // Show a subtle notification that the app is ready for offline use
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('sw-installed'));
    }
  }

  /**
   * Show update notification
   */
  private showUpdateNotification(): void {
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    }
  }

  /**
   * Show update available notification
   */
  private showUpdateAvailableNotification(): void {
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    }
  }

  /**
   * Get cache status
   */
  public async getCacheStatus(): Promise<{
    caches: { name: string; size: number }[];
    totalSize: number;
  }> {
    if (!('caches' in window)) {
      return { caches: [], totalSize: 0 };
    }

    try {
      const cacheNames = await caches.keys();
      const cacheInfo = [];
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const size = keys.length;
        cacheInfo.push({ name: cacheName, size });
        totalSize += size;
      }

      return { caches: cacheInfo, totalSize };
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return { caches: [], totalSize: 0 };
    }
  }

  /**
   * Clear specific cache
   */
  public async clearCache(cacheName: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const deleted = await caches.delete(cacheName);
      console.log(`Cache ${cacheName} ${deleted ? 'cleared' : 'not found'}`);
      return deleted;
    } catch (error) {
      console.error(`Failed to clear cache ${cacheName}:`, error);
      return false;
    }
  }

  /**
   * Clear all caches
   */
  public async clearAllCaches(): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  }

  /**
   * Preload critical resources
   */
  public async preloadCriticalResources(): Promise<void> {
    if (!this.wb) return;

    const criticalUrls = [
      '/',
      '/generate',
      '/tracks',
      '/projects',
      '/artists',
    ];

    try {
      // Send message to service worker to preload resources
      this.wb.messageSW({
        type: 'PRELOAD_URLS',
        urls: criticalUrls,
      });

      console.log('Critical resources preload requested');
    } catch (error) {
      console.error('Failed to preload critical resources:', error);
    }
  }

  /**
   * Get service worker status
   */
  public getStatus(): {
    isRegistered: boolean;
    updateAvailable: boolean;
    isSupported: boolean;
  } {
    return {
      isRegistered: this.isRegistered,
      updateAvailable: this.updateAvailable,
      isSupported: 'serviceWorker' in navigator,
    };
  }
}

export const serviceWorkerManager = new ServiceWorkerManager();