// app/types/gameEvents.ts
export type GameEvent =

  | { type: 'SCORE_CHANGED'; score: number }
  | { type: 'BEST_SCORE_UPDATED'; bestScore: number }
  | { type: 'LIVES_CHANGED'; livesRemaining: number; totalLives: number }


  | { type: 'GAME_STARTED' }
  | { type: 'GAME_PAUSED' }
  | { type: 'GAME_RESUMED' }
  | { type: 'GAME_OVER'; score: number; isNewRecord: boolean }
  | { type: 'RESTART_GAME' }
  | { type: 'CONTINUE_GIVE_UP' }
  | { type: 'CONTINUE_GAME_SUCCESS' }


  | { type: 'GOAL_SCORED'; score: number }
  | { type: 'GOAL_MISSED' }


  | { type: 'SHOW_TOUCH_GUIDE'; show: boolean }
  | { type: 'SHOW_PAUSE_MODAL'; show: boolean }
  | {
    type: 'SHOW_GAME_OVER_MODAL';
    score: number;
    points?: number;
    tokenId?: string;
    redeemedReward?: string;
  }
  | {
    type: 'PRIZE_AWARDED';
    score: number;
    tierId: 1 | 2 | 3;
    tierName: string;
    prizePoolLabel?: string;
    topPrizeReached: boolean;
    topPrizePoints: number;
    topPrizeCode: string;
    topPrizeLabel: string;
  }
  | { type: 'SHOW_CONTINUE_MODAL'; failCount: number }
  | { type: 'SHOW_TOAST'; message: string; toastType?: 'info' | 'success' | 'error' }


  | { type: 'LOADING_PROGRESS'; progress: number }
  | { type: 'LOADING_COMPLETE' }
  | { type: 'LOADING_ITEM_COMPLETE'; itemId: string }


  | { type: 'PLAY_SOUND'; soundId: string }
  | { type: 'MUSIC_ENABLED_CHANGED'; enabled: boolean }
  | { type: 'SFX_ENABLED_CHANGED'; enabled: boolean }
  | { type: 'MASTER_VOLUME_CHANGED'; volume: number }
  | { type: 'UNLOCK_AUDIO' }


  | { type: 'SHOT_INFO_UPDATED'; data: ShotInfo }
  | { type: 'TIER_CHANGED'; tierId: 1 | 2 | 3; difficultyName: 'Easy' | 'Intermediate' | 'Hard' }
  | {
    type: 'TIER_TIMER_UPDATED';
    tierId: 1 | 2 | 3;
    remainingMs: number;
    totalMs: number;
  }
  | { type: 'DEBUG_MODE_CHANGED'; enabled: boolean }
  | { type: 'CINEMATIC_CAMERA_CHANGED'; active: boolean }


  | { type: 'THEME_CHANGED'; themeName: string }


  | { type: 'FRIEND_SCORE_CHALLENGE'; score: number };

export interface ShotInfo {
  type: string;
  power: number;
  curveAmount: number;
  curveDirection: number;
  heightFactor: number;
  speed: number;
  targetPosition: { x: number; y: number };
}
