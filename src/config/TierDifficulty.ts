import { KEEPER_MAX_CENTER_OFFSET_X } from './Obstacles';

export type TierId = 1 | 2 | 3;

export interface TierDifficultyConfig {
  tierId: TierId;
  tierName: string;
  difficultyName: 'Easy' | 'Intermediate' | 'Hard';
  unlockBestScore: number;
  difficultyAnchorScore: number;
  keeperPatrolSpeed: number;
  keeperPatrolRange: [number, number];
  additionalObstacleCount: number;
  shotResetMs: number;
  idleTimeoutMs: number;
  tierDurationMs: number;
  /**
   * Added to `SHOT_TARGET_CONFIG.horizontalMargin` (more negative = smaller aim area).
   * Does not change keeper or obstacle physics.
   */
  aimHorizontalMarginExtra: number;
  /** Added to `SHOT_TARGET_CONFIG.verticalMarginTop` (more negative = lower ceiling). */
  aimVerticalMarginTopExtra: number;
  /**
   * Added to `SHOT_TARGET_CONFIG.verticalMarginBottom` (more negative = less room below the bar).
   */
  aimVerticalMarginBottomExtra: number;
  /**
   * Multiplier on (maxTime − minTime) for ballistic flight timing; lower = pickier power-to-speed mapping.
   */
  ballisticTimeWindowScale: number;
}

export const DEFAULT_TIER_ID: TierId = 1;

const K = KEEPER_MAX_CENTER_OFFSET_X;

export const TIER_DIFFICULTY_CONFIGS: Record<TierId, TierDifficultyConfig> = {
  1: {
    tierId: 1,
    tierName: 'Medium',
    difficultyName: 'Intermediate',
    unlockBestScore: 0,
    difficultyAnchorScore: 1,
    keeperPatrolSpeed: 1.6,
    keeperPatrolRange: [-K * 0.92, K * 0.92],
    additionalObstacleCount: 0,
    shotResetMs: 2500,
    idleTimeoutMs: 60_000,
    tierDurationMs: 60_000,
    aimHorizontalMarginExtra: 0.12,
    aimVerticalMarginTopExtra: -0.14,
    aimVerticalMarginBottomExtra: -0.28,
    ballisticTimeWindowScale: 0.74,
  },
  2: {
    tierId: 2,
    tierName: 'Tier 2',
    difficultyName: 'Intermediate',
    unlockBestScore: 11,
    difficultyAnchorScore: 7,
    keeperPatrolSpeed: 1.6,
    keeperPatrolRange: [-K * 0.92, K * 0.92],
    additionalObstacleCount: 0,
    shotResetMs: 2500,
    idleTimeoutMs: 60_000,
    tierDurationMs: 60_000,
    aimHorizontalMarginExtra: -0.18,
    aimVerticalMarginTopExtra: -0.14,
    aimVerticalMarginBottomExtra: -0.28,
    ballisticTimeWindowScale: 0.74,
  },
  3: {
    tierId: 3,
    tierName: 'Tier 3',
    difficultyName: 'Hard',
    unlockBestScore: 20,
    difficultyAnchorScore: 10,
    keeperPatrolSpeed: 2.05,
    keeperPatrolRange: [-K, K],
    additionalObstacleCount: 0,
    shotResetMs: 2100,
    idleTimeoutMs: 50_000,
    tierDurationMs: 60_000,
    aimHorizontalMarginExtra: -0.32,
    aimVerticalMarginTopExtra: -0.24,
    aimVerticalMarginBottomExtra: -0.45,
    ballisticTimeWindowScale: 0.62,
  },
};

export function getTierConfig(tierId: TierId): TierDifficultyConfig {
  return TIER_DIFFICULTY_CONFIGS[tierId];
}

export function getUnlockedTierByBestScore(bestScore: number): TierId {
  if (bestScore >= TIER_DIFFICULTY_CONFIGS[3].unlockBestScore) return 3;
  if (bestScore >= TIER_DIFFICULTY_CONFIGS[2].unlockBestScore) return 2;
  return 1;
}

export function clampTierToUnlocked(requestedTier: TierId, unlockedTier: TierId): TierId {
  return requestedTier > unlockedTier ? unlockedTier : requestedTier;
}
