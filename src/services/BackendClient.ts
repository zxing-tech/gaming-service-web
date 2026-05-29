export interface UserDetail {
  c_score: number | null;
  c_merchant_code: string;
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

  static async updateScore(uuid: string, score: number): Promise<void> {
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
  }
}
