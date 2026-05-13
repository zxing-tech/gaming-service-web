/**

 */

export const GAME_CONFIG = {
  /**

   */
  session: {

    totalLives: 3,

    topPrizePoints: 10,

    idleTimeoutMs: 60_000,

    standardDifficultyScore: 1,
  },

  /**

   */
  bounceSound: {

    minVerticalSpeed: 0.45,

    cooldownMs: 120,
  },

  /**

   */
  timing: {

    shotResetMs: 2500,

    touchGuideDelayMs: 1000,
  },

  /**

   */
  gameOver: {

    maxFailsAllowed: 2,
  },

  /**

   */
  physics: {

    timeStep: 1 / 120,

    substeps: 5,
  },
} as const;
