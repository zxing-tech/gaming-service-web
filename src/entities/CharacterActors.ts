import type * as CANNON from 'cannon-es';
import * as THREE from 'three';

/**
 * Kicker / goalkeeper visuals. Stub implementation: game logic runs; replace with
 * GLTF loading + animation when character assets are ready.
 */
export class CharacterActors {
  constructor(
    _scene: THREE.Scene,
    _loadingManager: THREE.LoadingManager
  ) {}

  async load(): Promise<void> {
    return;
  }

  update(
    _deltaTime: number,
    _ballPosition: CANNON.Vec3,
    _isShotInProgress: boolean
  ): void {}

  triggerKick(): void {}

  reset(): void {}
}
