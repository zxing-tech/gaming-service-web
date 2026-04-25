import * as THREE from 'three';

export function createPerspectiveCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 2000);
  // Higher + slightly farther camera for a more top-down gameplay view.
  camera.position.set(0, 2.4, 6.2);
  camera.lookAt(0, 0.95, -5.9);
  return camera;
}
