import * as THREE from 'three';
import type { ShotAnalysis } from './ShotAnalyzer';
import { ShotType } from './ShotAnalyzer';
import type { NormalizedSwipeData } from './SwipeNormalizer';
import { getGoalConfigForViewport, GOAL_DEPTH, POST_RADIUS } from '../config/Goal';
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
  const g = getGoalConfigForViewport();

  const horizontalRatio = THREE.MathUtils.clamp(normalized.horizontalDistance / 200, -1, 1);
  const normalizedHorizontal = (horizontalRatio + 1) * 0.5; // -1~1 -> 0~1
  const baseTargetX = THREE.MathUtils.lerp(b.xMin, b.xMax, normalizedHorizontal);

  const clampedHeightFactor = THREE.MathUtils.clamp(analysis.heightFactor, 0, 1);
  const baseTargetY = THREE.MathUtils.lerp(b.yMin, b.yMax, clampedHeightFactor);

  const targetZ = b.z;
  const { targetX, targetY } = applyTierAccuracyToTarget(
    baseTargetX,
    baseTargetY,
    normalized,
    g.width,
    g.height,
    tierId
  );

  return new THREE.Vector3(targetX, targetY, targetZ);
}

function applyTierAccuracyToTarget(
  baseTargetX: number,
  baseTargetY: number,
  normalized: NormalizedSwipeData,
  goalWidth: number,
  goalHeight: number,
  tierId: TierId
): { targetX: number; targetY: number } {
  const accuracyByTier: Record<TierId, number> = {
    1: 1.0,   // Easy: 100% accurate
    2: 0.5,   // Intermediate: 50% accurate
    3: 0.25,  // Hard: 25% accurate
  };
  const postHitChanceByTier: Record<TierId, number> = {
    1: 0,
    2: 0.35,
    3: 0.45,
  };
  const overKickFactor = THREE.MathUtils.clamp(
    (Math.abs(normalized.verticalDistance) - 170) / 110,
    0,
    1
  );

  // Easy mode: keep normal accuracy, but allow occasional post hit on over-kicks.
  if (tierId === 1 && overKickFactor > 0 && Math.random() < 0.22 * overKickFactor) {
    const topPost = Math.random() < 0.45;
    if (topPost) {
      const x = THREE.MathUtils.randFloat(-goalWidth * 0.28, goalWidth * 0.28);
      const y = goalHeight - POST_RADIUS * THREE.MathUtils.randFloat(0.05, 0.45);
      return { targetX: x, targetY: y };
    }
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (goalWidth / 2 - POST_RADIUS * 0.2);
    const y = THREE.MathUtils.randFloat(goalHeight * 0.35, goalHeight - 0.28);
    return { targetX: x, targetY: y };
  }

  const accuracy = accuracyByTier[tierId];
  if (Math.random() <= accuracy) {
    return { targetX: baseTargetX, targetY: baseTargetY };
  }

  // Miss side follows swipe direction; near center swipes randomize side.
  const side = Math.abs(normalized.horizontalDistance) < 12
    ? (Math.random() < 0.5 ? -1 : 1)
    : (Math.sign(normalized.horizontalDistance) as -1 | 1);

  const shouldHitPost = Math.random() < postHitChanceByTier[tierId];
  if (shouldHitPost) {
    // Intermediate/Hard: side-post + top-post outcomes.
    const topPostChance = tierId === 3 ? 0.4 : 0.28;
    const hitTopPost = Math.random() < topPostChance;
    if (hitTopPost) {
      const x = side * THREE.MathUtils.randFloat(goalWidth * 0.14, goalWidth * 0.34);
      const y = goalHeight - POST_RADIUS * THREE.MathUtils.randFloat(0.05, 0.5);
      return { targetX: x, targetY: y };
    }
    const x = side * (goalWidth / 2 - POST_RADIUS * 0.2);
    const y = THREE.MathUtils.randFloat(
      Math.max(0.42, goalHeight * 0.25),
      Math.max(0.8, goalHeight - 0.35)
    );
    return { targetX: x, targetY: y };
  }

  // Wide miss outside post on chosen side.
  const x = side * (goalWidth / 2 + THREE.MathUtils.randFloat(0.45, 1.05));
  const y = THREE.MathUtils.clamp(
    baseTargetY + THREE.MathUtils.randFloatSpread(goalHeight * 0.2),
    Math.max(0.2, goalHeight * 0.12),
    Math.max(0.5, goalHeight - 0.2)
  );
  return { targetX: x, targetY: y };
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
