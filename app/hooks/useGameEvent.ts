// app/hooks/useGameEvent.ts
import { useEffect } from 'react';
import { gameEventBus } from '@/lib/gameEventBus';
import type { GameEvent } from '@/types/gameEvents';

/**

 *
 * @example
 * useGameEvent('SCORE_CHANGED', (event) => {
 *   setScore(event.score);
 * });
 */
export function useGameEvent<T extends GameEvent['type']>(
  type: T,
  handler: (event: Extract<GameEvent, { type: T }>) => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const wrappedHandler = (event: GameEvent) => {
      if (event.type === type) {
        handler(event as Extract<GameEvent, { type: T }>);
      }
    };

    const unsubscribe = gameEventBus.on(type, wrappedHandler);

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ...deps]);
}
