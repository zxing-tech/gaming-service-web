import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ShotType } from './ShotAnalyzer';
import type { ShotParameters } from './ShotParameters';
import { PHYSICS_GRAVITY } from '../physics/Constants';
import { BALL_START_POSITION } from '../config/Ball';

/**

 *


 */
export function calculateInitialVelocity(shotParams: ShotParameters): CANNON.Vec3 | null {
  const { analysis, targetPosition, aimTargetPosition } = shotParams;

  if (analysis.type === ShotType.INVALID) {
    return null;
  }

  const { minTime, maxTime } = shotParams.ballisticTiming;

  const startPos = new THREE.Vector3(BALL_START_POSITION.x, BALL_START_POSITION.y, BALL_START_POSITION.z);
  const ballisticTarget = analysis.type === ShotType.CURVE ? aimTargetPosition : targetPosition;
  const debugLabel = analysis.type === ShotType.CURVE ? 'CURVE (aimed)' : 'NORMAL';

  return calculateBallisticVelocity(
    ballisticTarget,
    startPos,
    analysis.power,
    {
      minTime: minTime ?? 0.3,
      maxTime: maxTime ?? 0.6
    },
    {
      label: debugLabel,
      displayedTarget: analysis.type === ShotType.CURVE ? targetPosition : null
    }
  );
}

/**


 */
function calculateBallisticVelocity(
  targetPosition: THREE.Vector3,
  startPosition: THREE.Vector3,
  power: number,
  config: { minTime: number; maxTime: number },
  debugContext?: { label?: string; displayedTarget: THREE.Vector3 | null }
): CANNON.Vec3 {



  const t = config.maxTime - (config.maxTime - config.minTime) * power;


  const dx = targetPosition.x - startPosition.x;
  const dy = targetPosition.y - startPosition.y;
  const dz = targetPosition.z - startPosition.z;



  // v0 = (displacement - 0.5 * g * t²) / t

  const vx = dx / t;
  const vy = (dy - 0.5 * PHYSICS_GRAVITY * t * t) / t;
  const vz = dz / t;


  const label = debugContext?.label ?? 'BALISTIC';
  console.log(`🎯 Trajectory calculation [${label}]:`);
  console.log('  Power:', power.toFixed(2));
  console.log('  Arrival time (t):', t.toFixed(3), 's');
  console.log('  Start:', `(${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)})`);
  console.log('  Target:', `(${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
  if (debugContext?.displayedTarget) {
    console.log('  Display Target:', `(${debugContext.displayedTarget.x.toFixed(2)}, ${debugContext.displayedTarget.y.toFixed(2)}, ${debugContext.displayedTarget.z.toFixed(2)})`);
  }
  console.log('  Displacement:', `(${dx.toFixed(2)}, ${dy.toFixed(2)}, ${dz.toFixed(2)})`);
  console.log('  Initial velocity:', `(${vx.toFixed(2)}, ${vy.toFixed(2)}, ${vz.toFixed(2)}) m/s`);
  console.log('  Speed:', Math.sqrt(vx*vx + vy*vy + vz*vz).toFixed(2), 'm/s');
  console.log('  Gravity:', PHYSICS_GRAVITY);

  return new CANNON.Vec3(vx, vy, vz);
}

/**

 */
export function debugVelocity(velocity: CANNON.Vec3 | null): string {
  if (!velocity) {
    return 'Velocity: INVALID (no shot)';
  }

  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

  return `
Initial Velocity:
  Vector: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)})
  Speed: ${speed.toFixed(2)} m/s
  `.trim();
}
