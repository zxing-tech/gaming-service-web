/**

 *





 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Ball } from './Ball';
import { BALL_START_POSITION, BALL_PHYSICS } from '../../config/Ball';

/**

 */
export class BallController {
  private readonly ball: Ball;
  private readonly ballInitialMass: number;
  private isBallGravityEnabled = false;


  private readonly tempBallPosition = new THREE.Vector3();

  constructor(ball: Ball) {
    this.ball = ball;
    this.ballInitialMass = ball.body.mass;
  }

  /**

   */
  getBall(): Ball {
    return this.ball;
  }

  /**

   */
  isGravityEnabled(): boolean {
    return this.isBallGravityEnabled;
  }

  /**


   */
  copyPositionToTemp(): THREE.Vector3 {
    this.tempBallPosition.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );
    return this.tempBallPosition;
  }

  /**

   */
  prepareBallForShot(): void {
    this.setBallGravityEnabled(true);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);
    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.syncBallKinematicFrames();
  }

  /**

   */
  resetBall(): void {
    this.setBallGravityEnabled(false);

    this.ball.body.position.set(
      BALL_START_POSITION.x,
      BALL_START_POSITION.y,
      BALL_START_POSITION.z
    );


    const tempEuler = new THREE.Euler(
      BALL_PHYSICS.startRotation.x,
      BALL_PHYSICS.startRotation.y,
      BALL_PHYSICS.startRotation.z,
      'XYZ'
    );
    const tempQuat = new THREE.Quaternion().setFromEuler(tempEuler);
    this.ball.body.quaternion.set(tempQuat.x, tempQuat.y, tempQuat.z, tempQuat.w);

    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);
    this.syncBallKinematicFrames();

    this.ball.syncVisuals();
  }

  /**

   */
  resetBallOnly(): void {
    this.setBallGravityEnabled(false);

    this.ball.body.position.set(
      BALL_START_POSITION.x,
      BALL_START_POSITION.y,
      BALL_START_POSITION.z
    );


    const tempEuler = new THREE.Euler(
      BALL_PHYSICS.startRotation.x,
      BALL_PHYSICS.startRotation.y,
      BALL_PHYSICS.startRotation.z,
      'XYZ'
    );
    const tempQuat = new THREE.Quaternion().setFromEuler(tempEuler);
    this.ball.body.quaternion.set(tempQuat.x, tempQuat.y, tempQuat.z, tempQuat.w);

    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);
    this.syncBallKinematicFrames();

    this.ball.syncVisuals();
  }

  /**

   */
  private setBallGravityEnabled(enabled: boolean): void {
    if (enabled === this.isBallGravityEnabled) {
      return;
    }

    if (enabled) {
      this.ball.body.type = CANNON.Body.DYNAMIC;
      this.ball.body.mass = this.ballInitialMass;
      this.ball.body.updateMassProperties();
      this.ball.body.force.set(0, 0, 0);
      this.ball.body.torque.set(0, 0, 0);
      this.ball.body.wakeUp();
    } else {
      this.ball.body.velocity.set(0, 0, 0);
      this.ball.body.angularVelocity.set(0, 0, 0);
      this.ball.body.force.set(0, 0, 0);
      this.ball.body.torque.set(0, 0, 0);
      this.ball.body.type = CANNON.Body.STATIC;
      this.ball.body.mass = 0;
      this.ball.body.updateMassProperties();
      this.ball.body.sleep();
    }

    this.isBallGravityEnabled = enabled;
  }

  /**


   */
  private syncBallKinematicFrames(): void {
    this.ball.body.previousPosition.copy(this.ball.body.position);
    this.ball.body.interpolatedPosition.copy(this.ball.body.position);
    this.ball.body.previousQuaternion.copy(this.ball.body.quaternion);
    this.ball.body.interpolatedQuaternion.copy(this.ball.body.quaternion);
  }
}
