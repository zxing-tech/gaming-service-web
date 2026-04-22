// app/lib/gameEventBus.ts
import type { GameEvent } from '@/types/gameEvents';

type EventHandler = (event: GameEvent) => void;

class GameEventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  private debug = process.env.NODE_ENV === 'development';

  /**

   */
  emit(event: GameEvent) {
    if (this.debug) {
      console.log(`[Event] ${event.type}`, event);
    }

    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[Event Error] ${event.type}:`, error);
        }
      });
    }
  }

  /**

   */
  on(type: GameEvent['type'], handler: EventHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    if (this.debug) {
      console.log(`[Event Subscribe] ${type}, listeners: ${this.listeners.get(type)!.size}`);
    }


    return () => this.off(type, handler);
  }

  /**

   */
  off(type: GameEvent['type'], handler: EventHandler) {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.delete(handler);

      if (this.debug) {
        console.log(`[Event Unsubscribe] ${type}, remaining: ${handlers.size}`);
      }
    }
  }

  /**

   */
  removeAllListeners(type?: GameEvent['type']) {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  /**

   */
  getListenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  /**

   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }
}

export const gameEventBus = new GameEventBus();


if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).gameEventBus = gameEventBus;
}
