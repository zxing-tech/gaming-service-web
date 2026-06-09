import type { NormalizedSwipeData } from './SwipeNormalizer';

/**

 */
export const ShotType = {
  INVALID: 'INVALID',
  NORMAL: 'NORMAL',
  CURVE: 'CURVE'
} as const;

export type ShotType = typeof ShotType[keyof typeof ShotType];

/**

 */
export interface ShotAnalysis {
  type: ShotType;
  power: number;
  curveAmount: number;
  curveDirection: number;
  heightFactor: number;
}

/**

 */
const THRESHOLDS = {

  CURVE_DEVIATION: 0.28,
};

/**

 */
export function analyzeShotType(normalized: NormalizedSwipeData): ShotAnalysis {
  const { points, speed, angle, verticalDistance } = normalized;


  const angleDeg = angle * 180 / Math.PI;


  const power = calculatePower(speed);


  const curveAnalysis = analyzeCurvePattern(points);


  const heightFactor = calculateHeightFactor(points, verticalDistance);


  const type = determineShotType(angleDeg, speed, curveAnalysis.avgDeviation);

  return {
    type,
    power,
    curveAmount: curveAnalysis.amount,
    curveDirection: curveAnalysis.direction,
    heightFactor
  };
}

/**

 */
function calculatePower(speed: number): number {


  const minSpeed = 500;
  const maxSpeed = 2000;
  const normalized = (speed - minSpeed) / (maxSpeed - minSpeed);
  return Math.max(0, Math.min(1, normalized));
}

/**


 */
function calculateHeightFactor(
  _points: Array<{ x: number; y: number }>,
  verticalDistance: number
): number {

  const screenHeight = window.innerHeight;





  const heightRatio = (-verticalDistance / screenHeight) * 2.0;



  const heightFactor = Math.max(0, Math.min(1, heightRatio));

  return heightFactor;
}

/**

 */
function analyzeCurvePattern(points: Array<{ x: number; y: number }>) {



  const middlePoints = points.slice(1, 4);


  const deviations = middlePoints.map(p => Math.abs(p.y));
  const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;


  const avgY = middlePoints.reduce((sum, p) => sum + p.y, 0) / middlePoints.length;


  const curveAmount = Math.min(1, avgDeviation / 0.3);


  let curveDirection = 0;
  if (avgDeviation > THRESHOLDS.CURVE_DEVIATION) {
    curveDirection = avgY > 0 ? 1 : -1;
  }

  return {
    amount: curveAmount,
    direction: curveDirection,
    avgDeviation
  };
}

/**



 */
function determineShotType(
  angleDeg: number,
  _speed: number,
  curveDeviation: number
): ShotType {
  const { CURVE_DEVIATION } = THRESHOLDS;


  if (angleDeg >= 0 && angleDeg <= 180) {
    return ShotType.INVALID;
  }



  if (curveDeviation > CURVE_DEVIATION) {
    return ShotType.CURVE;
  }


  return ShotType.NORMAL;
}

/**

 */
export function debugShotAnalysis(analysis: ShotAnalysis): string {
  const curveDir = analysis.curveDirection === 1 ? 'Right' :
                   analysis.curveDirection === -1 ? 'Left' : 'None';

  return `
Shot Analysis:
  Type: ${analysis.type}
  Power: ${(analysis.power * 100).toFixed(0)}%
  Curve: ${(analysis.curveAmount * 100).toFixed(0)}% (${curveDir})
  Height Factor: ${(analysis.heightFactor * 100).toFixed(0)}%
  `.trim();
}
