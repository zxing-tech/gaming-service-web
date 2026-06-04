export interface GoalConfig {
  width: number;
  height: number;
  depth: number;
  postRadius: number;
}

export const GOAL_CONFIG: GoalConfig = {
  width: 5.8, // 7.32 for realistic
  height: 2.45, // 2.44 for realistic
  depth: -6, // -11 for realistic
  postRadius: 0.05 // 0.06 for realistic
};

export const GOAL_WIDTH = GOAL_CONFIG.width;
export const GOAL_HEIGHT = GOAL_CONFIG.height;
export const GOAL_DEPTH = GOAL_CONFIG.depth;
export const POST_RADIUS = GOAL_CONFIG.postRadius;

/**
 * Scales the goal opening with the **shorter** window side so portrait phones and
 * landscape both get a proportional frame. Shot targeting uses the same dimensions
 * via `getGoalConfigForViewport` in `ShotParameters`.
 */
export function getGoalConfigForViewport(): GoalConfig {
  if (typeof window === 'undefined') {
    return GOAL_CONFIG;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const shortSide = Math.min(w, h);
  const longSide = Math.max(w, h);
  const isLandscapePhone = w > h && shortSide < 520;

  /** Width scale: narrow phones ~0.74, large phones ~0.88, tablet ~0.95, desktop 1 */
  let widthScale: number;
  if (shortSide <= 340) {
    widthScale = 0.72;
  } else if (shortSide <= 390) {
    widthScale = 0.74 + ((shortSide - 340) / 50) * 0.06;
  } else if (shortSide <= 430) {
    widthScale = 0.8 + ((shortSide - 390) / 40) * 0.04;
  } else if (shortSide <= 480) {
    widthScale = 0.84 + ((shortSide - 430) / 50) * 0.04;
  } else if (shortSide <= 600) {
    widthScale = 0.88 + ((shortSide - 480) / 120) * 0.05;
  } else if (shortSide <= 768) {
    widthScale = 0.93 + ((shortSide - 600) / 168) * 0.04;
  } else if (shortSide <= 900) {
    widthScale = 0.97 + ((shortSide - 768) / 132) * 0.03;
  } else {
    widthScale = 1;
  }

  /** Height tracks width slightly so aspect stays natural */
  let heightScale = widthScale * 1.02 - 0.02;
  heightScale = Math.min(heightScale, 1);

  let postScale = 1;
  if (widthScale < 0.88) {
    postScale = 0.92 + (widthScale - 0.72) / (0.88 - 0.72) * 0.08;
  }

  if (isLandscapePhone && longSide < 900) {
    widthScale *= 0.94;
    heightScale *= 0.94;
  }

  return {
    width: GOAL_CONFIG.width * widthScale,
    height: GOAL_CONFIG.height * heightScale,
    depth: GOAL_CONFIG.depth,
    postRadius: GOAL_CONFIG.postRadius * postScale
  };
}

