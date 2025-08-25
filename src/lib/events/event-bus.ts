/**
 * @fileoverview Unified Event Bus for Application Events
 * @version 1.0.0
 * 
 * Provides a lightweight event system for decoupled communication
 * between components without prop drilling.
 */

export type AppEvent = 
  | 'tracks-updated'
  | 'track-deleted'
  | 'track-created'
  | 'generations-updated'
  | 'generation-started'
  | 'generation-completed'
  | 'generation-failed'
  | 'projects-updated'
  | 'artists-updated'
  | 'errors-updated'
  | 'play-track';

export type EventData = Record<string, any>;

class EventBus {
  private listeners: Map<AppEvent, Set<(data?: EventData) => void>> = new Map();

  /**
   * Subscribe to an event
   */
  on(event: AppEvent, callback: (data?: EventData) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an event
   */
  emit(event: AppEvent, data?: EventData) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  off(event: AppEvent) {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners
   */
  clear() {
    this.listeners.clear();
  }
}

// Global event bus instance
export const eventBus = new EventBus();

/**
 * React hook for subscribing to events
 */
import { useEffect } from 'react';

export function useEventListener(
  event: AppEvent, 
  callback: (data?: EventData) => void,
  deps: any[] = []
) {
  useEffect(() => {
    const unsubscribe = eventBus.on(event, callback);
    return unsubscribe;
  }, deps);
}