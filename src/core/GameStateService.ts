/**

 *


 */

import {
  DEFAULT_TIER_ID,
  clampTierToUnlocked,
  getUnlockedTierByBestScore,
  type TierId
} from '../config/TierDifficulty';

/**

 */
const STORAGE_KEYS = {

  MUSIC_ENABLED: 'snapshoot.audio.musicEnabled',
  SFX_ENABLED: 'snapshoot.audio.sfxEnabled',
  MASTER_VOLUME: 'snapshoot.audio.masterVolume',


  BEST_SCORE: 'snapshoot.bestScore',
  SELECTED_TIER: 'snapshoot.selectedTier',


  BALL_THEME: 'snapshoot.theme.ball',
} as const;

/**

 */
export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  masterVolume: number;
}

/**

 */
export class GameStateService {
  private static instance: GameStateService | null = null;

  private constructor() {
    // private constructor for singleton
  }

  /**

   */
  static getInstance(): GameStateService {
    if (!GameStateService.instance) {
      GameStateService.instance = new GameStateService();
    }
    return GameStateService.instance;
  }

  /**

   */
  private getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to read localStorage key: ${key}`, error);
      return null;
    }
  }

  /**

   */
  private setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to write localStorage key: ${key}`, error);
    }
  }



  /**

   */
  getMusicEnabled(): boolean {
    const value = this.getItem(STORAGE_KEYS.MUSIC_ENABLED);
    return value === null ? false : value === 'true';
  }

  /**

   */
  setMusicEnabled(enabled: boolean): void {
    this.setItem(STORAGE_KEYS.MUSIC_ENABLED, String(enabled));
  }

  /**

   */
  getSfxEnabled(): boolean {
    const value = this.getItem(STORAGE_KEYS.SFX_ENABLED);
    return value === null ? true : value === 'true';
  }

  /**

   */
  setSfxEnabled(enabled: boolean): void {
    this.setItem(STORAGE_KEYS.SFX_ENABLED, String(enabled));
  }

  /**

   */
  getMasterVolume(): number {
    const value = this.getItem(STORAGE_KEYS.MASTER_VOLUME);
    if (value === null) return 0.5;

    const volume = Number(value);
    return isNaN(volume) ? 0.5 : Math.max(0, Math.min(1, volume));
  }

  /**

   */
  setMasterVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.setItem(STORAGE_KEYS.MASTER_VOLUME, String(clampedVolume));
  }

  /**

   */
  getAudioSettings(): AudioSettings {
    return {
      musicEnabled: this.getMusicEnabled(),
      sfxEnabled: this.getSfxEnabled(),
      masterVolume: this.getMasterVolume(),
    };
  }

  /**

   */
  setAudioSettings(settings: AudioSettings): void {
    this.setMusicEnabled(settings.musicEnabled);
    this.setSfxEnabled(settings.sfxEnabled);
    this.setMasterVolume(settings.masterVolume);
  }



  /**

   */
  getBestScore(): number {
    const value = this.getItem(STORAGE_KEYS.BEST_SCORE);
    if (value === null) return 0;

    const score = Number(value);
    return isNaN(score) ? 0 : Math.max(0, score);
  }

  /**

   */
  updateBestScore(score: number): boolean {
    const currentBest = this.getBestScore();
    if (score > currentBest) {
      this.setItem(STORAGE_KEYS.BEST_SCORE, String(score));
      return true;
    }
    return false;
  }

  /**

   */
  setBestScore(score: number): void {
    this.setItem(STORAGE_KEYS.BEST_SCORE, String(Math.max(0, score)));
  }

  /**

   */
  getUnlockedTier(): TierId {
    return getUnlockedTierByBestScore(this.getBestScore());
  }

  /**

   */
  getSelectedTier(): TierId {
    const value = this.getItem(STORAGE_KEYS.SELECTED_TIER);
    if (value === null) return DEFAULT_TIER_ID;
    const parsed = Number(value);
    if (parsed === 1 || parsed === 2 || parsed === 3) {
      return parsed;
    }
    return DEFAULT_TIER_ID;
  }

  /**

   */
  setSelectedTier(tierId: TierId): TierId {
    const unlockedTier = this.getUnlockedTier();
    const clamped = clampTierToUnlocked(tierId, unlockedTier);
    this.setItem(STORAGE_KEYS.SELECTED_TIER, String(clamped));
    return clamped;
  }

  /**

   */
  getEffectiveTier(): TierId {
    const selectedTier = this.getSelectedTier();
    const unlockedTier = this.getUnlockedTier();
    return clampTierToUnlocked(selectedTier, unlockedTier);
  }



  /**

   */
  getBallTheme(): string | null {
    return this.getItem(STORAGE_KEYS.BALL_THEME);
  }

  /**

   */
  setBallTheme(themeName: string): void {
    this.setItem(STORAGE_KEYS.BALL_THEME, themeName);
  }

  /**



   */
  isThemeUnlocked(unlockScore: number): boolean {
    const bestScore = this.getBestScore();
    return bestScore >= unlockScore;
  }



  /**

   */
  clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear localStorage', error);
    }
  }

  /**

   */
  debugPrint(): void {
    console.group('GameStateService - Current State');
    console.log('Audio Settings:', this.getAudioSettings());
    console.log('Best Score:', this.getBestScore());
    console.log('Ball Theme:', this.getBallTheme());
    console.groupEnd();
  }
}

/**

 */
export const gameStateService = GameStateService.getInstance();
