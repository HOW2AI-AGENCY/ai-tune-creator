/**
 * Simple Memory Manager
 * Basic memory cleanup without complexity
 */

export class SimpleMemoryManager {
  private static instance: SimpleMemoryManager;
  
  static getInstance(): SimpleMemoryManager {
    if (!SimpleMemoryManager.instance) {
      SimpleMemoryManager.instance = new SimpleMemoryManager();
    }
    return SimpleMemoryManager.instance;
  }

  cleanup() {
    // Basic cleanup if needed
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  getMemoryUsage(): number {
    if ('performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }
}

export const simpleMemoryManager = SimpleMemoryManager.getInstance();