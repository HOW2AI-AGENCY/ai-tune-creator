/**
 * Safe Lazy Loader - надежная загрузка ленивых модулей с retry и timeout
 */

import { lazy, ComponentType } from 'react';
import { createComponentLogger } from '@/lib/debug/ConsoleManager';

const logger = createComponentLogger('SafeLazyLoader');

interface SafeLazyOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  fallbackComponent?: ComponentType<any>;
}

// Утилита для безопасной загрузки ленивых компонентов
export function safeLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: SafeLazyOptions = {}
) {
  const {
    retries = 2,
    retryDelay = 1000,
    timeout = 15000, // Увеличиваем timeout до 15 секунд
  } = options;

  const safeImportFn = () => {
    logger.debug('Starting lazy import with options:', { retries, timeout });
    
    return new Promise<{ default: T }>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        logger.error(`Lazy import timeout after ${timeout}ms`);
        reject(new Error(`Import timeout after ${timeout}ms`));
      }, timeout);

      const attemptImport = async (attempt: number): Promise<void> => {
        try {
          logger.debug(`Import attempt ${attempt + 1}/${retries + 1}`);
          const result = await importFn();
          clearTimeout(timeoutId);
          logger.debug('Import successful');
          resolve(result);
        } catch (error) {
          logger.warn(`Import attempt ${attempt + 1} failed:`, error);
          
          if (attempt < retries) {
            setTimeout(() => attemptImport(attempt + 1), retryDelay * Math.pow(2, attempt));
          } else {
            clearTimeout(timeoutId);
            logger.error('All import attempts failed');
            reject(error);
          }
        }
      };

      attemptImport(0);
    });
  };

  return lazy(safeImportFn);
}

// Предзагрузка тяжелых модулей
export function preloadModule(importFn: () => Promise<any>): Promise<void> {
  return importFn()
    .then(() => {
      logger.debug('Module preloaded successfully');
    })
    .catch((error) => {
      logger.warn('Failed to preload module:', error);
    });
}

// Пакетная предзагрузка
export async function preloadModules(importFns: Array<() => Promise<any>>): Promise<void> {
  const results = await Promise.allSettled(importFns.map(fn => preloadModule(fn)));
  
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    logger.warn(`Failed to preload ${failed}/${importFns.length} modules`);
  } else {
    logger.debug(`Successfully preloaded ${importFns.length} modules`);
  }
}