/**

 *



 */

/**

 */
export const GameState = {

  INITIALIZING: 'INITIALIZING',


  IDLE: 'IDLE',


  AIMING: 'AIMING',


  SHOOTING: 'SHOOTING',


  SCORING: 'SCORING',


  FAILED: 'FAILED',


  PAUSED: 'PAUSED',


  GAME_OVER: 'GAME_OVER',
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

/**

 */
export class GameStateManager {
  private currentState: GameState = GameState.INITIALIZING;
  private previousState: GameState | null = null;
  private stateChangeListeners: Array<(newState: GameState, oldState: GameState) => void> = [];

  constructor(initialState: GameState = GameState.INITIALIZING) {
    this.currentState = initialState;
  }

  /**

   */
  getState(): GameState {
    return this.currentState;
  }

  /**

   */
  getPreviousState(): GameState | null {
    return this.previousState;
  }

  /**

   */
  setState(newState: GameState): void {
    if (this.currentState === newState) {
      return;
    }

    const oldState = this.currentState;
    this.previousState = oldState;
    this.currentState = newState;


    this.stateChangeListeners.forEach(listener => {
      listener(newState, oldState);
    });
  }

  /**

   */
  is(state: GameState): boolean {
    return this.currentState === state;
  }

  /**

   */
  isOneOf(...states: GameState[]): boolean {
    return states.includes(this.currentState);
  }

  /**

   */
  canShoot(): boolean {
    return this.isOneOf(GameState.IDLE, GameState.AIMING);
  }

  /**

   */
  isShotInProgress(): boolean {
    return this.isOneOf(GameState.SHOOTING, GameState.SCORING, GameState.FAILED);
  }

  /**

   */
  isPlaying(): boolean {
    return !this.isOneOf(GameState.PAUSED, GameState.GAME_OVER);
  }

  /**

   */
  onStateChange(listener: (newState: GameState, oldState: GameState) => void): void {
    this.stateChangeListeners.push(listener);
  }

  /**

   */
  offStateChange(listener: (newState: GameState, oldState: GameState) => void): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }

  /**

   */
  clearListeners(): void {
    this.stateChangeListeners = [];
  }

  /**

   */
  toString(): string {
    return `GameState: ${this.currentState}`;
  }
}
