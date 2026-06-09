import * as THREE from 'three';

const TRAIL_LENGTH = 22;
const SAMPLE_DISTANCE = 0.07; // metres between samples — keeps trail dense at any ball speed
const BALL_RADIUS = 0.11;

// Warm white-yellow glow, matches the ball being "on fire"
const TRAIL_COLOR = new THREE.Color(1.0, 0.88, 0.45);
const BLACK = new THREE.Color(0, 0, 0);

/**
 * Meteor-style comet tail that follows the ball during flight.
 * Uses an InstancedMesh of spheres so all nodes are a single draw call.
 * AdditiveBlending makes the tail look like a glowing energy streak.
 */
export class BallTrail {
  private readonly scene: THREE.Scene;
  private readonly mesh: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly scratch = new THREE.Color();

  private positions: THREE.Vector3[] = [];
  private readonly lastSamplePos = new THREE.Vector3();
  private active = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const geo = new THREE.SphereGeometry(1, 7, 5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, TRAIL_LENGTH);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.visible = false;

    // Initialise all instances hidden so setColorAt allocates the buffer immediately.
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.dummy.position.set(0, -1000, 0);
      this.dummy.scale.setScalar(0.001);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, BLACK);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    scene.add(this.mesh);
  }

  start(pos: { x: number; y: number; z: number }): void {
    this.positions = [];
    this.lastSamplePos.set(pos.x, pos.y, pos.z);
    this.active = true;
    this.mesh.visible = true;
  }

  update(pos: { x: number; y: number; z: number }): void {
    if (!this.active) return;

    const v = new THREE.Vector3(pos.x, pos.y, pos.z);
    if (v.distanceTo(this.lastSamplePos) < SAMPLE_DISTANCE) return;

    this.positions.unshift(v);
    if (this.positions.length > TRAIL_LENGTH) this.positions.length = TRAIL_LENGTH;
    this.lastSamplePos.copy(v);

    this.syncInstances();
  }

  stop(): void {
    this.active = false;
    this.positions = [];
    this.mesh.visible = false;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }

  private syncInstances(): void {
    const n = this.positions.length;

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      if (i >= n) {
        this.dummy.position.set(0, -1000, 0);
        this.dummy.scale.setScalar(0.001);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        this.mesh.setColorAt(i, BLACK);
        continue;
      }

      // t = 1 for the newest (head), 0 for the oldest (tail)
      const t = n === 1 ? 1 : 1 - i / (n - 1);
      const tSmooth = t * t;

      const radius = THREE.MathUtils.lerp(0.003, BALL_RADIUS * 0.28, tSmooth);
      const brightness = tSmooth * 0.9;

      this.dummy.position.copy(this.positions[i]);
      this.dummy.scale.setScalar(radius);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(
        i,
        this.scratch.setRGB(
          TRAIL_COLOR.r * brightness,
          TRAIL_COLOR.g * brightness,
          TRAIL_COLOR.b * brightness,
        ),
      );
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
