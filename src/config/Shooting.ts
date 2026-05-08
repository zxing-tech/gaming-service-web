/**





 */

export interface CurveAimConfig {
  horizontalMax: number;
  horizontalMargin: number;
}

export const CURVE_AIM_CONFIG: CurveAimConfig = {
  horizontalMax: 0.9,
  horizontalMargin: 1.
};

export interface ShotTimingConfig {
  minTime: number;
  maxTime: number;
}

export interface ShotTimingConfigMap {
  NORMAL: ShotTimingConfig;
  CURVE: ShotTimingConfig;
}

export const SHOT_TIMING_CONFIG: ShotTimingConfigMap = {
  NORMAL: {
    minTime: 0.3,
    maxTime: 0.6
  },
  CURVE: {
    minTime: 0.35,
    maxTime: 0.7
  }
};

export interface ShotTargetConfig {
  horizontalMargin: number;
  verticalMarginTop: number;
  verticalMarginBottom: number;
  depth: number | null;
}

export const SHOT_TARGET_CONFIG: ShotTargetConfig = {
  horizontalMargin: -0.32,
  verticalMarginTop: -0.28,
  verticalMarginBottom: 0.82,
  depth: null
};

export interface CurveForceConfig {
  baseStrength: number;
  speedReference: number;
  speedMaxFactor: number;
  duration: number;
}

export const CURVE_FORCE_CONFIG: CurveForceConfig = {
  baseStrength: 18.0,
  speedReference: 15,
  speedMaxFactor: 2.0,
  duration: 0.7
};
