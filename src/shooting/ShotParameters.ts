import * as THREE from 'three';
import type { ShotAnalysis } from './ShotAnalyzer';
import { ShotType } from './ShotAnalyzer';
import type { NormalizedSwipeData } from './SwipeNormalizer';
import { GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH } from '../config/Goal';
import { BALL_START_POSITION as BALL_START_POS } from '../config/Ball';
import { CURVE_AIM_CONFIG, SHOT_TARGET_CONFIG } from '../config/Shooting';

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
const TARGET_BOUNDS = {
  xMin: -GOAL_WIDTH / 2 - SHOT_TARGET_CONFIG.horizontalMargin,
  xMax: GOAL_WIDTH / 2 + SHOT_TARGET_CONFIG.horizontalMargin,
  yMin: 0 - SHOT_TARGET_CONFIG.verticalMarginBottom,
  yMax: GOAL_HEIGHT + SHOT_TARGET_CONFIG.verticalMarginTop,
  z: SHOT_TARGET_CONFIG.depth ?? GOAL_DEPTH
};

/**

 */
export function calculateShotParameters(
  normalized: NormalizedSwipeData,
  analysis: ShotAnalysis
): ShotParameters {

  const targetPosition = calculateTargetPosition(normalized, analysis);


  const direction = new THREE.Vector3()
    .subVectors(targetPosition, BALL_START_POSITION)
    .normalize();


  const aimTargetPosition = adjustAimTarget(targetPosition, analysis);


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
    analysis
  };
}

/**

 *


 */
function calculateTargetPosition(
  normalized: NormalizedSwipeData,
  analysis: ShotAnalysis
): THREE.Vector3 {



  const horizontalRatio = THREE.MathUtils.clamp(normalized.horizontalDistance / 200, -1, 1);
  const normalizedHorizontal = (horizontalRatio + 1) * 0.5; // -1~1 -> 0~1
  const targetX = THREE.MathUtils.lerp(TARGET_BOUNDS.xMin, TARGET_BOUNDS.xMax, normalizedHorizontal);


  const clampedHeightFactor = THREE.MathUtils.clamp(analysis.heightFactor, 0, 1);
  const targetY = THREE.MathUtils.lerp(TARGET_BOUNDS.yMin, TARGET_BOUNDS.yMax, clampedHeightFactor);


  const targetZ = TARGET_BOUNDS.z;

  return new THREE.Vector3(targetX, targetY, targetZ);
}

function adjustAimTarget(
  baseTarget: THREE.Vector3,
  analysis: ShotAnalysis
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

  const baseHorizontalLimit = GOAL_WIDTH / 2 + SHOT_TARGET_CONFIG.horizontalMargin;
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
