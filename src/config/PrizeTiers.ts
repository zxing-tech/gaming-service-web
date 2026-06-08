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
  // false for the "no prize" band (score 0) — used to suppress the token.
  hasPrize: boolean;
}

export const DEFAULT_PRIZE_TIER_ID: TierId = DEFAULT_TIER_ID;

// Mirrors the admin-configured reward inventory (Supabase reward_tiers) so the
// client-side placeholder/offline fallback matches what the backend awards:
//   score 0     -> No Prize
//   score 1-12  -> RM3 Voucher
//   score 13+   -> RM5 Voucher
// The backend (RewardService) is authoritative when a uuid is present; this is
// the fallback shown for offline/standalone play and as the initial placeholder.
export const PRIZE_TIER_CONFIGS: Record<TierId, PrizeTierConfig> = {
  1: {
    tierId: 1,
    tierName: 'Tier 1',
    minScore: 0,
    maxScore: 0,
    prizePoolLabel: 'No Prize',
    rewardOptions: [],
    topPrizePoints: 0,
    topPrizeCode: '',
    topPrizeLabel: 'No Prize',
  },
  2: {
    tierId: 2,
    tierName: 'Tier 2',
    minScore: 1,
    maxScore: 12,
    prizePoolLabel: 'RM3 Voucher',
    rewardOptions: [{ code: 'TR2_RM3', label: 'RM3 Voucher', weight: 1 }],
    topPrizePoints: 12,
    topPrizeCode: 'TR2_RM3',
    topPrizeLabel: 'RM3 Voucher',
  },
  3: {
    tierId: 3,
    tierName: 'Tier 3',
    minScore: 13,
    maxScore: null,
    prizePoolLabel: 'RM5 Voucher',
    rewardOptions: [{ code: 'TR3_RM5', label: 'RM5 Voucher', weight: 1 }],
    topPrizePoints: 13,
    topPrizeCode: 'TR3_RM5',
    topPrizeLabel: 'RM5 Voucher',
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
  if (finalScore >= 13) return PRIZE_TIER_CONFIGS[3];
  if (finalScore >= 1) return PRIZE_TIER_CONFIGS[2];
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
  const hasPrize = resolvedPicked.code !== '';
  return {
    tierId: config.tierId,
    tierName: config.tierName,
    prizePoolLabel: config.prizePoolLabel,
    topPrizeReached: hasPrize,
    topPrizePoints: config.topPrizePoints,
    topPrizeCode: resolvedPicked.code,
    topPrizeLabel: resolvedPicked.label,
    hasPrize,
  };
}
