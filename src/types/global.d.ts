export {};

declare global {
  interface Window {
    debug?: (enabled?: boolean) => boolean;
    webkitAudioContext?: typeof AudioContext;
  }
}
