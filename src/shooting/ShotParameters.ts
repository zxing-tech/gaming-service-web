import * as THREE from 'three';
import type { ShotAnalysis } from './ShotAnalyzer';
import { ShotType } from './ShotAnalyzer';
import type { NormalizedSwipeData } from './SwipeNormalizer';
import { getGoalConfigForViewport, GOAL_DEPTH } from '../config/Goal';
import { BALL_START_POSITION as BALL_START_POS } from '../config/Ball';
import { CURVE_AIM_CONFIG, SHOT_TARGET_CONFIG, SHOT_TIMING_CONFIG } from '../config/Shooting';
import { getTierConfig, type TierId } from '../config/TierDifficulty';

/**

 */
export interface ShotParameters {
  targetPosition: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number;
  aimTargetPosition: THREE.Vector3;
  aimDirection: THREE.Vector3;
  aimDistance: number;
  analysis: ShotAnalysis;
  ballisticTiming: { minTime: number; maxTime: number };
}

/**

 */
const BALL_START_POSITION = new THREE.Vector3(
  BALL_START_POS.x,
  BALL_START_POS.y,
  BALL_START_POS.z
);

/**

 */
function getShotTargetBounds(tierId: TierId) {
  const g = getGoalConfigForViewport();
  const tier = getTierConfig(tierId);
  const hMargin = SHOT_TARGET_CONFIG.horizontalMargin + tier.aimHorizontalMarginExtra;
  const vTop = SHOT_TARGET_CONFIG.verticalMarginTop + tier.aimVerticalMarginTopExtra;
  const vBottom =
    SHOT_TARGET_CONFIG.verticalMarginBottom + tier.aimVerticalMarginBottomExtra;
  return {
    xMin: -g.width / 2 - hMargin,
    xMax: g.width / 2 + hMargin,
    yMin: 0 - vBottom,
    yMax: g.height + vTop,
    z: SHOT_TARGET_CONFIG.depth ?? GOAL_DEPTH
  };
}

function resolveBallisticTiming(analysis: ShotAnalysis, tierId: TierId): { minTime: number; maxTime: number } {
  if (analysis.type === ShotType.INVALID) {
    const base = SHOT_TIMING_CONFIG.NORMAL;
    return { minTime: base.minTime, maxTime: base.maxTime };
  }
  const base =
    analysis.type === ShotType.CURVE ? SHOT_TIMING_CONFIG.CURVE : SHOT_TIMING_CONFIG.NORMAL;
  const scale = getTierConfig(tierId).ballisticTimeWindowScale;
  const mid = (base.minTime + base.maxTime) / 2;
  const span = (base.maxTime - base.minTime) * scale;
  return { minTime: mid - span / 2, maxTime: mid + span / 2 };
}

/**

 */
export function calculateShotParameters(
  normalized: NormalizedSwipeData,
  analysis: ShotAnalysis,
  tierId: TierId = 1
): ShotParameters {

  const targetPosition = calculateTargetPosition(normalized, analysis, tierId);


  const direction = new THREE.Vector3()
    .subVectors(targetPosition, BALL_START_POSITION)
    .normalize();


  const aimTargetPosition = adjustAimTarget(targetPosition, analysis, tierId);


  const aimDirection = new THREE.Vector3()
    .subVectors(aimTargetPosition, BALL_START_POSITION)
    .normalize();


  const distance = BALL_START_POSITION.distanceTo(targetPosition);
  const aimDistance = BALL_START_POSITION.distanceTo(aimTargetPosition);

  return {
    targetPosition,
    direction,
    distance,
    aimTargetPosition,
    aimDirection,
    aimDistance,
    analysis,
    ballisticTiming: resolveBallisticTiming(analysis, tierId)
  };
}

/**

 *


 */
function calculateTargetPosition(
  normalized: NormalizedSwipeData,
  analysis: ShotAnalysis,
  tierId: TierId
): THREE.Vector3 {
  const b = getShotTargetBounds(tierId);

  const horizontalRatio = THREE.MathUtils.clamp(normalized.horizontalDistance / 200, -1, 1);
  const normalizedHorizontal = (horizontalRatio + 1) * 0.5; // -1~1 -> 0~1
  const targetX = THREE.MathUtils.lerp(b.xMin, b.xMax, normalizedHorizontal);

  const clampedHeightFactor = THREE.MathUtils.clamp(analysis.heightFactor, 0, 1);
  const targetY = THREE.MathUtils.lerp(b.yMin, b.yMax, clampedHeightFactor);

  const targetZ = b.z;

  return new THREE.Vector3(targetX, targetY, targetZ);
}

function adjustAimTarget(
  baseTarget: THREE.Vector3,
  analysis: ShotAnalysis,
  tierId: TierId
): THREE.Vector3 {
  const adjusted = baseTarget.clone();

  if (analysis.type !== ShotType.CURVE || analysis.curveDirection === 0) {
    return adjusted;
  }

  const curveIntensity = THREE.MathUtils.clamp(analysis.curveAmount, 0, 1);
  const powerFactor = THREE.MathUtils.clamp(analysis.power, 0, 1);


  const outwardSign = analysis.curveDirection !== 0
    ? analysis.curveDirection
    : Math.sign(baseTarget.x) || 1;

  const horizontalOffset = CURVE_AIM_CONFIG.horizontalMax *
    curveIntensity *
    (0.55 + 0.45 * powerFactor);

  adjusted.x += outwardSign * horizontalOffset;


  if (Math.abs(adjusted.x) <= Math.abs(baseTarget.x)) {
    adjusted.x = baseTarget.x + outwardSign * (horizontalOffset + 0.15);
  }

  const g = getGoalConfigForViewport();
  const tier = getTierConfig(tierId);
  const hMargin = SHOT_TARGET_CONFIG.horizontalMargin + tier.aimHorizontalMarginExtra;
  const baseHorizontalLimit = g.width / 2 + hMargin;
  const maxAbsX = baseHorizontalLimit + CURVE_AIM_CONFIG.horizontalMargin;
  adjusted.x = THREE.MathUtils.clamp(adjusted.x, -maxAbsX, maxAbsX);


  return adjusted;
}

/**

 */
export function debugShotParameters(params: ShotParameters): string {
  const {
    targetPosition,
    direction,
    distance,
    aimTargetPosition,
    aimDirection,
    aimDistance
  } = params;

  return `
Shot Parameters:
  Target: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})
  Aim Target: (${aimTargetPosition.x.toFixed(2)}, ${aimTargetPosition.y.toFixed(2)}, ${aimTargetPosition.z.toFixed(2)})
  Direction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})
  Aim Direction: (${aimDirection.x.toFixed(2)}, ${aimDirection.y.toFixed(2)}, ${aimDirection.z.toFixed(2)})
  Distance: ${distance.toFixed(2)}m
  Aim Distance: ${aimDistance.toFixed(2)}m
  `.trim();
}
