import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import type {
  Axis,
  ObstacleBehaviorConfig,
  ObstacleBlueprint,
  ObstacleColliderConfig,
  ObstacleInstanceConfig,
  ObstacleMaterialConfig,
  ObstacleTransformConfig,
  PrimitiveRenderConfig,
  RangeValue
} from '../config/Obstacles';
import { getAssetPath } from '../utils/assetPath';

const DEFAULT_CYLINDER_SEGMENTS = 16;

function toVector3(init?: { x?: number; y?: number; z?: number }, defaultValue = 0): THREE.Vector3 {
  return new THREE.Vector3(
    init?.x ?? defaultValue,
    init?.y ?? defaultValue,
    init?.z ?? defaultValue
  );
}

function combineTransforms(
  base?: ObstacleTransformConfig,
  override?: ObstacleTransformConfig
): Required<ObstacleTransformConfig> {
  return {
    position: {
      ...(base?.position ?? {}),
      ...(override?.position ?? {})
    },
    positionRange: {
      ...(base?.positionRange ?? {}),
      ...(override?.positionRange ?? {})
    },
    rotation: {
      ...(base?.rotation ?? {}),
      ...(override?.rotation ?? {})
    },
    rotationRange: {
      ...(base?.rotationRange ?? {}),
      ...(override?.rotationRange ?? {})
    },
    scale: override?.scale ?? base?.scale ?? 1
  };
}

function randomInRange(range: RangeValue | undefined, fallback: number): number {
  if (!range) return fallback;
  const [min, max] = range;
  if (min === max) return min;
  return THREE.MathUtils.lerp(min, max, Math.random());
}

function axisToVector(axis: Axis): THREE.Vector3 {
  switch (axis) {
    case 'x':
      return new THREE.Vector3(1, 0, 0);
    case 'y':
      return new THREE.Vector3(0, 1, 0);
    case 'z':
    default:
      return new THREE.Vector3(0, 0, 1);
  }
}

function createMaterial(
  config: ObstacleMaterialConfig | undefined,
  loadingManager: THREE.LoadingManager
): THREE.Material {
  if (!config) {
    return new THREE.MeshStandardMaterial({ color: 0xffffff });
  }

  const options: THREE.MeshStandardMaterialParameters = {};
  if (config.color !== undefined) {
    options.color = new THREE.Color(config.color as THREE.ColorRepresentation);
  }
  if (config.transparent !== undefined) {
    options.transparent = config.transparent;
  }
  if (config.opacity !== undefined) {
    options.opacity = config.opacity;
  }
  if (config.textureUrl) {
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const texture = textureLoader.load(config.textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    options.map = texture;
  }
  const material = new THREE.MeshStandardMaterial(options);
  if (config.doubleSided) {
    material.side = THREE.DoubleSide;
  }
  if (config.alphaTest !== undefined) {
    material.alphaTest = config.alphaTest;
  }
  if (config.depthWrite !== undefined) {
    material.depthWrite = config.depthWrite;
  }
  if (config.depthTest !== undefined) {
    material.depthTest = config.depthTest;
  }
  return material;
}

interface ColliderCreated {
  primaryShape: CANNON.Shape;
  extraShapes?: Array<{ shape: CANNON.Shape; offset: CANNON.Vec3; orientation?: CANNON.Quaternion }>;
  debugMesh: THREE.Object3D;
  orientation?: CANNON.Quaternion;
}

interface BehaviorState {
  patrol?: {
    axis: Axis;
    range: RangeValue;
    speed: number;
    waveform: 'sine' | 'pingpong';
    phase: number;
  };
  spin?: {
    axis: Axis;
    speed: number;
    angle: number;
    radius: number;
    orbit?: {
      axis: Axis;
      range: RangeValue;
      speed: number;
      phase: number;
    };
  };
}

export class Obstacle {
  public readonly pivot = new THREE.Group();
  public readonly body: CANNON.Body;
  public readonly blueprintId: string;

  private readonly visualRoot = new THREE.Group();
  private readonly debugRoot = new THREE.Group();

  private readonly blueprint: ObstacleBlueprint;
  private readonly loadingManager: THREE.LoadingManager;
  private behaviorState: BehaviorState = {};
  private shouldTrack = true;

  private readonly basePosition = new THREE.Vector3();
  private readonly positionRange: { x?: RangeValue; y?: RangeValue; z?: RangeValue } = {};
  private readonly baseRotation = new THREE.Euler();
  private readonly rotationRange: { x?: RangeValue; y?: RangeValue; z?: RangeValue } = {};
  private readonly baseScale = new THREE.Vector3(1, 1, 1);
  private readonly baseQuaternion = new THREE.Quaternion();
  private currentQuaternion = new THREE.Quaternion();
  private currentBasePosition = new THREE.Vector3();
  private currentBaseQuaternion = new THREE.Quaternion();

  private movementTime = 0;
  private keeperMaterial?: THREE.MeshStandardMaterial;
  private keeperTextures?: {
    left: THREE.Texture;
    right: THREE.Texture;
    center: THREE.Texture;
    jump: THREE.Texture;
    ready: THREE.Texture;
  };
  private keeperPreviousX = 0;

  constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    blueprint: ObstacleBlueprint,
    instance: ObstacleInstanceConfig,
    loadingManager: THREE.LoadingManager = THREE.DefaultLoadingManager
  ) {
    this.blueprint = blueprint;
    this.blueprintId = blueprint.id;
    this.loadingManager = loadingManager;

    this.pivot.add(this.visualRoot);
    this.debugRoot.visible = false;
    this.pivot.add(this.debugRoot);
    scene.add(this.pivot);

    this.body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
    world.addBody(this.body);

    this.initTransform(instance);
    this.initVisual(blueprint.render);
    this.initCollider(instance.collider ?? blueprint.collider ?? null);

    if (instance.behavior) {
      this.applyBehavior(instance.behavior);
    } else {
      this.refreshTransform();
    }
  }

  configure(instance: ObstacleInstanceConfig): void {
    this.initTransform(instance);
    if (instance.behavior) {
      this.applyBehavior(instance.behavior);
    } else {
      this.behaviorState = {};
      this.movementTime = 0;
      this.refreshTransform();
    }
  }

  private initTransform(instance: ObstacleInstanceConfig): void {
    const combined = combineTransforms(this.blueprint.defaultTransform, instance.transform);

    this.basePosition.copy(toVector3(combined.position, 0));
    this.positionRange.x = combined.positionRange?.x;
    this.positionRange.y = combined.positionRange?.y;
    this.positionRange.z = combined.positionRange?.z;

    this.baseRotation.set(
      combined.rotation?.x ?? 0,
      combined.rotation?.y ?? 0,
      combined.rotation?.z ?? 0
    );
    this.rotationRange.x = combined.rotationRange?.x;
    this.rotationRange.y = combined.rotationRange?.y;
    this.rotationRange.z = combined.rotationRange?.z;

    if (typeof combined.scale === 'number') {
      this.baseScale.setScalar(combined.scale);
    } else {
      this.baseScale.copy(toVector3(combined.scale, 1));
    }

    this.baseQuaternion.setFromEuler(this.baseRotation);
  }

  private initVisual(render: ObstacleBlueprint['render']): void {
    let visualObject: THREE.Object3D | null = null;
    switch (render.kind) {
      case 'primitive':
        visualObject = this.createPrimitive(render);
        this.visualRoot.add(visualObject);
        break;
      case 'model':
        this.loadModel(render);
        break;
    }
    if (this.blueprintId === 'keeperWall' && visualObject instanceof THREE.Mesh) {
      this.setupKeeperTextures(visualObject);
    }
    this.applyScale();
  }

  private createPrimitive(render: PrimitiveRenderConfig): THREE.Object3D {
    const size = render.size ?? {};
    let geometry: THREE.BufferGeometry;
    switch (render.shape) {
      case 'box':
        geometry = new THREE.BoxGeometry(size.x ?? 1, size.y ?? 1, size.z ?? 1);
        break;
      case 'plane':
        geometry = new THREE.PlaneGeometry(size.x ?? 1, size.y ?? 1);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          size.radius ?? 0.5,
          size.radius ?? 0.5,
          size.height ?? 1,
          DEFAULT_CYLINDER_SEGMENTS
        );
        break;
      case 'capsule': {
        const radius = size.radius ?? 0.4;
        const fullHeight = size.height ?? 1;
        const length = Math.max(fullHeight - radius * 2, 0.0001);
        geometry = new THREE.CapsuleGeometry(radius, length);
        break;
      }
      case 'sphere':
        geometry = new THREE.SphereGeometry(size.radius ?? 0.5, 24, 16);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
    }
    const material = createMaterial(render.material, this.loadingManager);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  private loadModel(render: Extract<ObstacleBlueprint['render'], { kind: 'model' }>): void {
    const group = new THREE.Group();
    if (render.pivotOffset) {
      group.position.set(
        render.pivotOffset.x ?? 0,
        render.pivotOffset.y ?? 0,
        render.pivotOffset.z ?? 0
      );
    }
    this.visualRoot.add(group);

    const loader = new GLTFLoader(this.loadingManager);
    loader.load(
      render.assetUrl,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            if (child.material instanceof THREE.MeshStandardMaterial && child.material.map) {
              child.material.map.colorSpace = THREE.SRGBColorSpace;
            }
          }
        });

        group.add(gltf.scene);
      },
      undefined,
      (error) => {
        console.error(`[Obstacle] Failed to load model "${render.assetUrl}"`, error);
      }
    );

    this.applyScale(render.scale, group);
  }

  private applyScale(scaleConfig?: number | { x?: number; y?: number; z?: number }, target?: THREE.Object3D) {
    const targetObject = target ?? this.visualRoot;
    if (!scaleConfig) {
      targetObject.scale.copy(this.baseScale);
      return;
    }
    if (typeof scaleConfig === 'number') {
      targetObject.scale.setScalar(scaleConfig);
    } else {
      targetObject.scale.set(
        scaleConfig.x ?? 1,
        scaleConfig.y ?? 1,
        scaleConfig.z ?? 1
      );
    }
  }

  private initCollider(config: ObstacleColliderConfig | null): void {
    const collider = config ?? {
      shape: 'box',
      size: { x: 1, y: 1, z: 1 }
    };

    const created = this.createCollider(collider);
    this.body.addShape(created.primaryShape, new CANNON.Vec3(), created.orientation);

    created.extraShapes?.forEach(({ shape, offset, orientation }) => {
      this.body.addShape(shape, offset, orientation);
    });

    this.debugRoot.add(created.debugMesh);
  }

  private createCollider(config: ObstacleColliderConfig): ColliderCreated {
    switch (config.shape) {
      case 'box': {
        const halfExtents = new CANNON.Vec3(
          config.size.x / 2,
          config.size.y / 2,
          config.size.z / 2
        );
        const shape = new CANNON.Box(halfExtents);
        const debugGeometry = new THREE.BoxGeometry(config.size.x, config.size.y, config.size.z);
        const debugMaterial = new THREE.MeshBasicMaterial({
          wireframe: true,
          color: 0xff6688,
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
        return { primaryShape: shape, debugMesh };
      }
      case 'cylinder': {
        const shape = new CANNON.Cylinder(config.radius, config.radius, config.height, DEFAULT_CYLINDER_SEGMENTS);
        let orientation: CANNON.Quaternion | undefined;
        if (config.axis && config.axis !== 'x') {
          orientation = new CANNON.Quaternion();
          if (config.axis === 'y') {
            orientation.setFromEuler(0, 0, Math.PI / 2);
          } else if (config.axis === 'z') {
            orientation.setFromEuler(0, Math.PI / 2, 0);
          }
        }
        const debugGeometry = new THREE.CylinderGeometry(
          config.radius,
          config.radius,
          config.height,
          DEFAULT_CYLINDER_SEGMENTS
        );
        const debugMaterial = new THREE.MeshBasicMaterial({
          wireframe: true,
          color: 0x66ff88,
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
        if (config.axis === 'x') {
          debugMesh.rotation.z = Math.PI / 2;
        } else if (config.axis === 'z') {
          debugMesh.rotation.x = Math.PI / 2;
        }
        return { primaryShape: shape, debugMesh, orientation };
      }
      case 'capsule': {
        const radius = config.radius;
        const height = Math.max(config.height, 0);
        const cylinderHeight = Math.max(height - radius * 2, 0.0001);
        const cylinder = new CANNON.Cylinder(radius, radius, cylinderHeight, DEFAULT_CYLINDER_SEGMENTS);
        const sphere = new CANNON.Sphere(radius);
        let orientation: CANNON.Quaternion | undefined;
        if (config.axis && config.axis !== 'x') {
          orientation = new CANNON.Quaternion();
          if (config.axis === 'y') {
            orientation.setFromEuler(0, 0, Math.PI / 2);
          } else if (config.axis === 'z') {
            orientation.setFromEuler(0, Math.PI / 2, 0);
          }
        }
        const extraShapes = [
          {
            shape: sphere,
            offset: new CANNON.Vec3(cylinderHeight / 2, 0, 0)
          },
          {
            shape: sphere,
            offset: new CANNON.Vec3(-cylinderHeight / 2, 0, 0)
          }
        ];
        if (config.axis === 'y') {
          extraShapes[0].offset.set(0, cylinderHeight / 2, 0);
          extraShapes[1].offset.set(0, -cylinderHeight / 2, 0);
        } else if (config.axis === 'z') {
          extraShapes[0].offset.set(0, 0, cylinderHeight / 2);
          extraShapes[1].offset.set(0, 0, -cylinderHeight / 2);
        }

        const debugGeometry = new THREE.CapsuleGeometry(radius, Math.max(cylinderHeight, 0));
        const debugMaterial = new THREE.MeshBasicMaterial({
          wireframe: true,
          color: 0x6688ff,
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
        if (!config.axis || config.axis === 'x') {
          debugMesh.rotation.z = Math.PI / 2;
        } else if (config.axis === 'z') {
          debugMesh.rotation.x = Math.PI / 2;
        }

        return {
          primaryShape: cylinder,
          extraShapes,
          debugMesh,
          orientation
        };
      }
      case 'sphere': {
        const shape = new CANNON.Sphere(config.radius);
        const debugGeometry = new THREE.SphereGeometry(config.radius, 18, 18);
        const debugMaterial = new THREE.MeshBasicMaterial({
          wireframe: true,
          color: 0xffaa33,
          transparent: true,
          opacity: 0.4,
          depthWrite: false
        });
        const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
        return { primaryShape: shape, debugMesh };
      }
      case 'auto':
      default: {
        const size = 1;
        const halfExtents = new CANNON.Vec3(size / 2, size / 2, size / 2);
        const shape = new CANNON.Box(halfExtents);
        const debugGeometry = new THREE.BoxGeometry(size, size, size);
        const debugMaterial = new THREE.MeshBasicMaterial({
          wireframe: true,
          color: 0xffffff,
          transparent: true,
          opacity: 0.4,
          depthWrite: false
        });
        const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
        console.warn('[Obstacle] Auto collider is not yet implemented, defaulting to 1x1x1 box.');
        return { primaryShape: shape, debugMesh };
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.shouldTrack) {
      this.body.angularVelocity.set(0, 0, 0);
      this.body.velocity.set(0, 0, 0);
      return;
    }

    this.movementTime += deltaTime;

    const position = this.currentBasePosition.clone();
    const quaternion = this.currentBaseQuaternion.clone();

    if (this.behaviorState.patrol) {
      this.applyPatrol(position, this.behaviorState.patrol);
    }
    if (this.behaviorState.spin) {
      this.applySpin(quaternion, position, this.behaviorState.spin, deltaTime);
    }

    this.currentQuaternion.copy(quaternion);

    this.applyTransform(position, quaternion);
    this.updateKeeperPose(position);

    this.body.angularVelocity.set(0, 0, 0);
    this.body.velocity.set(0, 0, 0);
  }

  setColliderDebugVisible(visible: boolean): void {
    this.debugRoot.visible = visible;
  }

  startTracking(): void {
    // Goalkeeper starts moving only when the shot starts, with random phase each time.
    if (this.blueprintId === 'keeperWall' && this.behaviorState.patrol) {
      this.behaviorState.patrol.phase = Math.random() * Math.PI * 2;
      this.movementTime = 0;
    }
    this.shouldTrack = true;
  }

  stopTracking(): void {
    this.shouldTrack = false;
  }

  resetTracking(): void {
    this.shouldTrack = true;
    this.refreshTransform();
  }

  applyBehavior(behavior: ObstacleBehaviorConfig): void {
    this.movementTime = 0;
    this.behaviorState = {};

    switch (behavior.type) {
      case 'patrol':
        this.behaviorState.patrol = {
          axis: behavior.axis,
          range: behavior.range,
          speed: behavior.speed ?? 1,
          waveform: behavior.waveform ?? 'sine',
          phase: behavior.startPhase ?? Math.random() * Math.PI * 2
        };
        break;
      case 'spin':
        this.behaviorState.spin = {
          axis: behavior.axis,
          speed: behavior.speed ?? 1.2,
          angle: behavior.startAngle ?? Math.random() * Math.PI * 2,
          radius: behavior.radius ?? 0,
          orbit: behavior.orbit
            ? {
                axis: behavior.orbit.axis,
                range: behavior.orbit.range,
                speed: behavior.orbit.speed ?? 0,
                phase: behavior.orbit.startPhase ?? Math.random() * Math.PI * 2
              }
            : undefined
        };
        break;
      case 'static':
      default:
        break;
    }

    this.refreshTransform();
  }

  refreshTransform(): void {
    const position = this.samplePosition(true);
    const rotationOffset = this.sampleRotation();
    const quaternion = this.baseQuaternion.clone();
    if (rotationOffset.x !== 0 || rotationOffset.y !== 0 || rotationOffset.z !== 0) {
      const offsetQuat = new THREE.Quaternion().setFromEuler(rotationOffset);
      quaternion.multiply(offsetQuat);
    }
    this.currentQuaternion.copy(quaternion);
    this.currentBasePosition.copy(position);
    this.currentBaseQuaternion.copy(quaternion);
    this.applyTransform(position, quaternion);
    this.keeperPreviousX = position.x;
    this.updateKeeperPose(position);
  }

  dispose(): void {
    if (this.body.world) {
      this.body.world.removeBody(this.body);
    }
    if (this.pivot.parent) {
      this.pivot.parent.remove(this.pivot);
    }
    this.disposeObject(this.visualRoot);
    this.disposeObject(this.debugRoot);
  }

  private samplePosition(randomizeRanges: boolean): THREE.Vector3 {
    const result = this.basePosition.clone();
    if (randomizeRanges) {
      if (this.positionRange.x) {
        result.x = randomInRange(this.positionRange.x, result.x);
      }
      if (this.positionRange.y) {
        result.y = randomInRange(this.positionRange.y, result.y);
      }
      if (this.positionRange.z) {
        result.z = randomInRange(this.positionRange.z, result.z);
      }
    }
    return result;
  }

  private sampleRotation(): THREE.Euler {
    const result = new THREE.Euler();
    if (this.rotationRange.x) {
      result.x = randomInRange(this.rotationRange.x, 0);
    }
    if (this.rotationRange.y) {
      result.y = randomInRange(this.rotationRange.y, 0);
    }
    if (this.rotationRange.z) {
      result.z = randomInRange(this.rotationRange.z, 0);
    }
    return result;
  }

  private applyTransform(position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    this.pivot.position.copy(position);
    this.visualRoot.quaternion.copy(quaternion);
    this.visualRoot.position.set(0, 0, 0);
    this.visualRoot.scale.copy(this.baseScale);
    this.debugRoot.position.set(0, 0, 0);
    this.debugRoot.quaternion.copy(quaternion);

    this.body.position.set(position.x, position.y, position.z);
    this.body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    this.body.previousPosition.copy(this.body.position);
    this.body.interpolatedPosition.copy(this.body.position);
    this.body.previousQuaternion.copy(this.body.quaternion);
    this.body.interpolatedQuaternion.copy(this.body.quaternion);
    this.body.aabbNeedsUpdate = true;
    this.body.updateAABB();
  }

  private applyPatrol(position: THREE.Vector3, state: NonNullable<BehaviorState['patrol']>): void {
    const [min, max] = state.range;
    const center = (min + max) * 0.5;
    const amplitude = Math.max((max - min) * 0.5, 0);
    let value = center;
    switch (state.waveform) {
      case 'pingpong': {
        const duration = Math.PI;
        const phase = (state.phase + this.movementTime * state.speed) % (duration * 2);
        const t = phase <= duration ? phase / duration : 2 - phase / duration;
        value = min + (max - min) * t;
        break;
      }
      case 'sine':
      default: {
        const angle = state.phase + this.movementTime * state.speed;
        value = center + amplitude * Math.sin(angle);
        break;
      }
    }
    position[state.axis] = value;
  }

  private setupKeeperTextures(mesh: THREE.Mesh): void {
    if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
    this.keeperMaterial = mesh.material;
    const textureLoader = new THREE.TextureLoader(this.loadingManager);
    const left = textureLoader.load(getAssetPath('/assets/keeper/goalkeeper-dive-left.png'));
    const right = textureLoader.load(getAssetPath('/assets/keeper/goalkeeper-dive-right.png'));
    const center = textureLoader.load(getAssetPath('/assets/keeper/goalkeeper-save-center.png'));
    const jump = textureLoader.load(getAssetPath('/assets/keeper/goalkeeper-jump.png'));
    const ready = textureLoader.load(getAssetPath('/assets/keeper/goalkeeper-ready.png'));

    [left, right, center, jump, ready].forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    });

    this.keeperTextures = { left, right, center, jump, ready };
    this.keeperMaterial.map = ready;
    this.keeperMaterial.needsUpdate = true;
  }

  private updateKeeperPose(position: THREE.Vector3): void {
    if (!this.keeperTextures || !this.keeperMaterial) return;

    const deltaX = position.x - this.keeperPreviousX;
    this.keeperPreviousX = position.x;

    let nextTexture = this.keeperTextures.center;

    if (Math.abs(deltaX) > 0.01) {
      nextTexture = deltaX > 0 ? this.keeperTextures.right : this.keeperTextures.left;
    } else if (Math.abs(position.x) < 0.25 && Math.sin(this.movementTime * 2.8) > 0.8) {
      nextTexture = this.keeperTextures.jump;
    } else if (Math.sin(this.movementTime * 1.4) > 0.2) {
      nextTexture = this.keeperTextures.ready;
    }

    if (this.keeperMaterial.map !== nextTexture) {
      this.keeperMaterial.map = nextTexture;
      this.keeperMaterial.needsUpdate = true;
    }
  }

  private applySpin(
    quaternion: THREE.Quaternion,
    position: THREE.Vector3,
    state: NonNullable<BehaviorState['spin']>,
    deltaTime: number
  ): void {
    state.angle = (state.angle + (state.speed ?? 0) * deltaTime) % (Math.PI * 2);
    const spinAxis = axisToVector(state.axis);
    const dynamicRotation = new THREE.Quaternion().setFromAxisAngle(spinAxis, state.angle);
    quaternion.multiply(dynamicRotation);

    if (state.radius > 0) {
      position.x += spinAxis.x * state.radius * Math.cos(state.angle);
      position.y += spinAxis.y * state.radius * Math.cos(state.angle);
      position.z += spinAxis.z * state.radius * Math.cos(state.angle);
    }

    if (state.orbit) {
      const [min, max] = state.orbit.range;
      const center = (min + max) * 0.5;
      const amplitude = Math.max((max - min) * 0.5, 0);
      state.orbit.phase = (state.orbit.phase + state.orbit.speed * deltaTime) % (Math.PI * 2);
      const value = center + amplitude * Math.sin(state.orbit.phase);
      position[state.orbit.axis] = value;
    }
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
