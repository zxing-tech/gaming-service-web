export interface UserDetail {
  // Number for a recorded score, or — once the player wins a code-backed reward —
  // the voucher code string we wrote back to Grab. Null/undefined = never played.
  c_score: number | string | null;
  c_merchant_code: string;
  // Reward this user already received (first-score-wins), recorded on a prior
  // session. Used to show their original prize on the game-over screen.
  lastReward?: { label: string; token: string | null; score: number | null } | null;
}

// Reward awarded by the backend from the admin-configured inventory.
export interface AwardedReward {
  tierId: string;
  tierName: string;
  label: string;
  valueText: string;
  tokenId: string;
  // Redeemable Grab URL for a code-backed voucher (null for synthetic tokens).
  giftLink?: string | null;
}

// Outcome of submitting a score. `resolved` = backend authoritatively decided
// the reward (a reward, or "no prize"). When false (Supabase unavailable), the
// game keeps its client-side fallback reward.
export interface ScoreOutcome {
  resolved: boolean;
  reward: AwardedReward | null;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export class BackendClient {
  static async getUser(uuid: string): Promise<UserDetail> {
    const res = await fetch(`${BASE_URL}/game-user/${encodeURIComponent(uuid)}`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`getUser failed (${res.status}): ${body}`);
    }
    return (await res.json()) as UserDetail;
  }

  // Submits the final score and returns the backend's reward outcome from the
  // admin inventory.
  static async updateScore(uuid: string, score: number): Promise<ScoreOutcome> {
    const res = await fetch(
      `${BASE_URL}/game-user/${encodeURIComponent(uuid)}/score`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`updateScore failed (${res.status}): ${body}`);
    }
    const data = (await res.json()) as {
      ok: boolean;
      reward?: AwardedReward | null;
      rewardResolved?: boolean;
    };
    return { resolved: data.rewardResolved ?? false, reward: data.reward ?? null };
  }
}
