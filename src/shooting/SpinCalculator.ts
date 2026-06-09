import * as CANNON from 'cannon-es';
import { ShotType } from './ShotAnalyzer';
import type { ShotParameters } from './ShotParameters';

/**

 */
const SPIN_CONFIG = {
  [ShotType.INVALID]: {
    enabled: false,
    spinStrength: 0
  },
  [ShotType.NORMAL]: {
    enabled: false,
    spinStrength: 0
  },
  [ShotType.CURVE]: {
    enabled: true,
    spinType: 'sidespin' as const,
    spinStrength: 20
  }
};

/**

 */
export function calculateAngularVelocity(
  shotParams: ShotParameters,
  _velocity: CANNON.Vec3
): CANNON.Vec3 {
  const { analysis } = shotParams;
  const config = SPIN_CONFIG[analysis.type];

  if (!config.enabled) {
    return new CANNON.Vec3(0, 0, 0);
  }

  const spinStrength = config.spinStrength;
  const angularVelocity = new CANNON.Vec3(0, 0, 0);

  if (!('spinType' in config)) {
    return angularVelocity;
  }

  // Only sidespin is used now (CURVE shot)
  if (config.spinType === 'sidespin') {



    const direction = analysis.curveDirection;
    const curveStrength = analysis.curveAmount;


    angularVelocity.y = direction * spinStrength * curveStrength;


    angularVelocity.x = spinStrength * 0.3;
  }

  return angularVelocity;
}

/**

 */
export function debugAngularVelocity(angularVelocity: CANNON.Vec3): string {
  const magnitude = Math.sqrt(
    angularVelocity.x ** 2 +
    angularVelocity.y ** 2 +
    angularVelocity.z ** 2
  );

  return `
Angular Velocity (Spin):
  Vector: (${angularVelocity.x.toFixed(2)}, ${angularVelocity.y.toFixed(2)}, ${angularVelocity.z.toFixed(2)})
  Magnitude: ${magnitude.toFixed(2)} rad/s
  `.trim();
}
