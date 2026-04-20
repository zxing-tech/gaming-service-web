import { DEFAULT_TIER_ID, type TierId } from './TierDifficulty';

export interface PrizeTierConfig {
  tierId: TierId;
  tierName: string;
  topPrizePoints: number;
  topPrizeCode: string;
  topPrizeLabel: string;
}

export interface PrizeAwardResult {
  tierId: TierId;
  tierName: string;
  topPrizeReached: boolean;
  topPrizePoints: number;
  topPrizeCode: string;
  topPrizeLabel: string;
}

export const DEFAULT_PRIZE_TIER_ID: TierId = DEFAULT_TIER_ID;

export const PRIZE_TIER_CONFIGS: Record<TierId, PrizeTierConfig> = {
  1: {
    tierId: 1,
    tierName: 'Tier 1',
    topPrizePoints: 8,
    topPrizeCode: 'T1_TOP',
    topPrizeLabel: 'Tier 1 Top Prize',
  },
  2: {
    tierId: 2,
    tierName: 'Tier 2',
    topPrizePoints: 10,
    topPrizeCode: 'T2_TOP',
    topPrizeLabel: 'Tier 2 Top Prize',
  },
  3: {
    tierId: 3,
    tierName: 'Tier 3',
    topPrizePoints: 12,
    topPrizeCode: 'T3_TOP',
    topPrizeLabel: 'Tier 3 Top Prize',
  },
};

function isTierId(value: unknown): value is TierId {
  return value === 1 || value === 2 || value === 3;
}

export function getPrizeTierConfig(tierId: TierId): PrizeTierConfig {
  return PRIZE_TIER_CONFIGS[tierId];
}

/**
 * Resolves a valid prize tier configuration with default fallback.
 */
export function resolvePrizeTierConfig(inputTier: TierId | number | undefined | null): PrizeTierConfig {
  if (isTierId(inputTier)) {
    return PRIZE_TIER_CONFIGS[inputTier];
  }
  return PRIZE_TIER_CONFIGS[DEFAULT_PRIZE_TIER_ID];
}

export function buildPrizeAwardResult(
  inputTier: TierId | number | undefined | null,
  finalScore: number
): PrizeAwardResult {
  const config = resolvePrizeTierConfig(inputTier);
  return {
    tierId: config.tierId,
    tierName: config.tierName,
    topPrizeReached: finalScore >= config.topPrizePoints,
    topPrizePoints: config.topPrizePoints,
    topPrizeCode: config.topPrizeCode,
    topPrizeLabel: config.topPrizeLabel,
  };
}
