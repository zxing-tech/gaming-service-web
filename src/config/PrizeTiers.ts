import { DEFAULT_TIER_ID, type TierId } from './TierDifficulty';

export interface PrizeTierConfig {
  tierId: TierId;
  tierName: string;
  minScore: number;
  maxScore: number | null;
  prizePoolLabel: string;
  rewardOptions: readonly {
    code: string;
    label: string;
    weight: number;
  }[];
  topPrizePoints: number;
  topPrizeCode: string;
  topPrizeLabel: string;
}

export interface PrizeAwardResult {
  tierId: TierId;
  tierName: string;
  prizePoolLabel: string;
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
    minScore: 0,
    maxScore: 10,
    prizePoolLabel: '10 GrabCoins',
    rewardOptions: [
      { code: 'TR1_10_GRABCOINS', label: '10 GrabCoins', weight: 1 }
    ],
    topPrizePoints: 10,
    topPrizeCode: 'TR1_10_GRABCOINS',
    topPrizeLabel: '10 GrabCoins',
  },
  2: {
    tierId: 2,
    tierName: 'Tier 2',
    minScore: 11,
    maxScore: 19,
    prizePoolLabel: '50 GrabCoins or RM5 GrabFood voucher',
    rewardOptions: [
      // Show GrabCoins most of the time; voucher remains randomized and occasional.
      { code: 'TR2_50_GRABCOINS', label: '50 GrabCoins', weight: 8 },
      { code: 'TR2_RM5_GRABFOOD', label: 'RM5 GrabFood Voucher', weight: 2 }
    ],
    topPrizePoints: 19,
    topPrizeCode: 'TR2_50_GRABCOINS',
    topPrizeLabel: '50 GrabCoins',
  },
  3: {
    tierId: 3,
    tierName: 'Tier 3',
    minScore: 20,
    maxScore: null,
    prizePoolLabel: '100 GrabCoins or RM15 GrabFood voucher',
    rewardOptions: [
      // Show GrabCoins most of the time; voucher remains randomized and occasional.
      { code: 'TR3_100_GRABCOINS', label: '100 GrabCoins', weight: 8 },
      { code: 'TR3_RM15_GRABFOOD', label: 'RM15 GrabFood Voucher', weight: 2 }
    ],
    topPrizePoints: 20,
    topPrizeCode: 'TR3_100_GRABCOINS',
    topPrizeLabel: '100 GrabCoins',
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

export function resolvePrizeTierByScore(finalScore: number): PrizeTierConfig {
  if (finalScore >= 20) return PRIZE_TIER_CONFIGS[3];
  if (finalScore >= 11) return PRIZE_TIER_CONFIGS[2];
  return PRIZE_TIER_CONFIGS[1];
}

export function buildPrizeAwardResult(
  inputTier: TierId | number | undefined | null,
  finalScore: number
): PrizeAwardResult {
  const config = resolvePrizeTierByScore(finalScore) ?? resolvePrizeTierConfig(inputTier);
  const options = config.rewardOptions;
  const totalWeight = options.reduce((sum, option) => sum + Math.max(0, option.weight), 0);
  let picked = options[0];
  if (totalWeight > 0) {
    let roll = Math.random() * totalWeight;
    for (const option of options) {
      roll -= Math.max(0, option.weight);
      if (roll <= 0) {
        picked = option;
        break;
      }
    }
  }
  const resolvedPicked = picked ?? {
    code: config.topPrizeCode,
    label: config.topPrizeLabel
  };
  return {
    tierId: config.tierId,
    tierName: config.tierName,
    prizePoolLabel: config.prizePoolLabel,
    topPrizeReached: true,
    topPrizePoints: config.topPrizePoints,
    topPrizeCode: resolvedPicked.code,
    topPrizeLabel: resolvedPicked.label,
  };
}
