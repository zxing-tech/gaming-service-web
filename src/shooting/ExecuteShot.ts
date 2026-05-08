import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { normalizeSwipeData } from './SwipeNormalizer';
import { analyzeShotType, ShotType } from './ShotAnalyzer';
import { calculateShotParameters } from './ShotParameters';
import { calculateInitialVelocity } from './VelocityCalculator';
import { calculateAngularVelocity } from './SpinCalculator';
import type { TierId } from '../config/TierDifficulty';

/**

 */
export interface ShotResult {

  velocity: CANNON.Vec3;

  angularVelocity: CANNON.Vec3;

  shotType: ShotType;

  targetPosition: THREE.Vector3;

  aimTargetPosition: THREE.Vector3;

  debugInfo: {
    normalized: any;
    analysis: any;
    shotParams: any;
  };
}

/**

 *
 * Pipeline:





 *


 */
export function executeShot(swipeData: any, tierId: TierId = 1): ShotResult {
  // Step 1: Normalize swipe

  const normalized = normalizeSwipeData(swipeData);

  // Step 2: Analyze shot type

  const analysis = analyzeShotType(normalized);

  // Step 3: Calculate shot parameters

  const shotParams = calculateShotParameters(normalized, analysis, tierId);

  // Step 4: Calculate initial velocity

  const velocity = calculateInitialVelocity(shotParams);


  const safeVelocity =
    velocity ?? new CANNON.Vec3(0, 0, 0);

  // Step 5: Calculate spin (CURVE shots only)

  const angularVelocity = calculateAngularVelocity(shotParams, safeVelocity);

  return {
    velocity: safeVelocity,
    angularVelocity,
    shotType: analysis.type,
    targetPosition: shotParams.targetPosition,
    aimTargetPosition: shotParams.aimTargetPosition,
    debugInfo: {
      normalized,
      analysis,
      shotParams
    }
  };
}
