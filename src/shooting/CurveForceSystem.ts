import * as CANNON from 'cannon-es';
import { ShotType, type ShotAnalysis } from './ShotAnalyzer';
import { CURVE_FORCE_CONFIG } from '../config/Shooting';

/**

 */
interface CurveShotData {
  isActive: boolean;
  analysis: ShotAnalysis;
  startTime: number;
  elapsedTime: number;
}

/**


 */
export class CurveForceSystem {
  private curveShotData: CurveShotData | null = null;

  /**

   */
  startCurveShot(analysis: ShotAnalysis) {
    if (analysis.type !== ShotType.CURVE) {
      this.curveShotData = null;
      return;
    }

    this.curveShotData = {
      isActive: true,
      analysis,
      startTime: performance.now(),
      elapsedTime: 0
    };
  }

  /**

   */
  stopCurveShot() {
    this.curveShotData = null;
  }

  /**

   */
  update(deltaTime: number, ballBody: CANNON.Body) {
    if (!this.curveShotData || !this.curveShotData.isActive) {
      return;
    }

    this.curveShotData.elapsedTime += deltaTime;


    if (this.curveShotData.elapsedTime > 2.0) {
      this.stopCurveShot();
      return;
    }


    this.applyCurveForce(ballBody);
  }

  /**


   */
  private applyCurveForce(ballBody: CANNON.Body) {
    if (!this.curveShotData) return;

    const { analysis, elapsedTime } = this.curveShotData;


    if (analysis.curveDirection === 0) {
      return;
    }


    const { baseStrength, speedReference, speedMaxFactor, duration } = CURVE_FORCE_CONFIG;

    const speed = ballBody.velocity.length();
    const speedFactor = Math.min(speedReference > 0 ? speed / speedReference : 1, speedMaxFactor);
    const timeFactor = Math.max(0, 1 - elapsedTime / duration);
    const direction = analysis.curveDirection;
    const curveStrength = analysis.curveAmount * speedFactor * timeFactor * baseStrength;


    const lateralForce = direction * curveStrength * ballBody.mass;
    const force = new CANNON.Vec3(lateralForce, 0, 0);


    ballBody.applyForce(force, ballBody.position);
  }

  /**

   */
  isActive(): boolean {
    return this.curveShotData?.isActive ?? false;
  }
}
