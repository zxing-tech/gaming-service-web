export type TierId = 1 | 2 | 3;

export interface TierDifficultyConfig {
  tierId: TierId;
  tierName: string;
  difficultyName: 'Easy' | 'Medium' | 'Hard';
  unlockBestScore: number;
  difficultyAnchorScore: number;
  keeperPatrolSpeed: number;
  keeperPatrolRange: [number, number];
  additionalObstacleCount: number;
  shotResetMs: number;
  idleTimeoutMs: number;
}

export const DEFAULT_TIER_ID: TierId = 1;

export const TIER_DIFFICULTY_CONFIGS: Record<TierId, TierDifficultyConfig> = {
  1: {
    tierId: 1,
    tierName: 'Tier 1',
    difficultyName: 'Easy',
    unlockBestScore: 0,
    difficultyAnchorScore: 1,
    keeperPatrolSpeed: 1.0,
    keeperPatrolRange: [-1.15, 1.15],
    additionalObstacleCount: 0,
    shotResetMs: 3000,
    idleTimeoutMs: 75_000,
  },
  2: {
    tierId: 2,
    tierName: 'Tier 2',
    difficultyName: 'Medium',
    unlockBestScore: 8,
    difficultyAnchorScore: 7,
    keeperPatrolSpeed: 1.8,
    keeperPatrolRange: [-1.45, 1.45],
    additionalObstacleCount: 1,
    shotResetMs: 2500,
    idleTimeoutMs: 60_000,
  },
  3: {
    tierId: 3,
    tierName: 'Tier 3',
    difficultyName: 'Hard',
    unlockBestScore: 18,
    difficultyAnchorScore: 10,
    keeperPatrolSpeed: 2.3,
    keeperPatrolRange: [-1.7, 1.7],
    additionalObstacleCount: 2,
    shotResetMs: 2100,
    idleTimeoutMs: 50_000,
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
