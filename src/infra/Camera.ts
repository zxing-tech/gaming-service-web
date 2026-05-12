import * as THREE from 'three';

export const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 2.4, 6.2);
export const DEFAULT_CAMERA_LOOKAT = new THREE.Vector3(0, 0.95, -5.9);

// Follow-ball cinematic camera: ride behind and slightly above the ball during a shot.
export const BALL_FOLLOW_OFFSET = new THREE.Vector3(0, 1.4, 2.8);
// Bias the lookAt past the ball toward the goal (negative Z) so the framing leads the motion.
export const BALL_FOLLOW_LOOKAHEAD_Z = -1.8;
// Per-frame lerp factor at 60fps; smaller = softer follow.
export const BALL_FOLLOW_LERP_IN = 0.14;
export const BALL_FOLLOW_LERP_OUT = 0.09;

export function createPerspectiveCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.copy(DEFAULT_CAMERA_POSITION);
  camera.lookAt(DEFAULT_CAMERA_LOOKAT);
  return camera;
}
