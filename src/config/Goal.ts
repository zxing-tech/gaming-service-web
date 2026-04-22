export interface GoalConfig {
  width: number;
  height: number;
  depth: number;
  postRadius: number;
}

export const GOAL_CONFIG: GoalConfig = {
  width: 3.3, // 7.32 for realistic
  height: 2.0, // 2.44 for realistic
  depth: -6, // -11 for realistic
  postRadius: 0.04 // 0.06 for realistic
};

export const GOAL_WIDTH = GOAL_CONFIG.width;
export const GOAL_HEIGHT = GOAL_CONFIG.height;
export const GOAL_DEPTH = GOAL_CONFIG.depth;
export const POST_RADIUS = GOAL_CONFIG.postRadius;

