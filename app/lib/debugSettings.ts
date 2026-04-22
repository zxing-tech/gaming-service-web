/**

 *




 */

type DebugModeToggler = (enabled?: boolean) => boolean;

class DebugSettings {
  private debugModeToggler: DebugModeToggler | null = null;

  /**

   */
  registerDebugToggler(toggler: DebugModeToggler): void {
    this.debugModeToggler = toggler;
  }

  /**

   */
  toggleDebugMode(enabled?: boolean): boolean {
    if (!this.debugModeToggler) {
      console.warn('⚠️ Debug toggle function is not registered.');
      return false;
    }
    return this.debugModeToggler(enabled);
  }
}


export const debugSettings = new DebugSettings();


declare global {
  interface Window {
    toggleDebug: (enabled?: boolean) => boolean;
  }
}

// SSR safety: only add to window in client environment
if (typeof window !== 'undefined') {
  window.toggleDebug = (enabled?: boolean) => {
    const newState = debugSettings.toggleDebugMode(enabled);
    console.log(`🐛 Debug mode ${newState ? 'ON' : 'OFF'}`);
    return newState;
  };
}
