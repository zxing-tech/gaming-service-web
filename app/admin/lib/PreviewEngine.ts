import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  OBSTACLE_BLUEPRINTS,
  type ObstacleBlueprint,
  type ObstacleInstanceConfig,
  type ObstacleTransformConfig,
  type ObstacleRenderConfig,
  type PrimitiveRenderConfig,
  type ObstacleBehaviorConfig,
  type PatrolBehaviorConfig,
  type SpinBehaviorConfig,
  type RangeValue,
  type Vector3Init,
  type Vector3Range,
  type Axis,
  type ObstacleMaterialConfig
} from '../../../src/config/Obstacles';
import { GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from '../../../src/config/Goal';
import { GOAL_NET_CONFIG } from '../../../src/config/Net';
import type { DifficultyLevelConfig } from '../../../src/config/Difficulty';
import { configureRendererColorPipeline } from '../../../src/infra/Graphics';
import { HdrPipeline } from '../../../src/infra/HdrPipeline';

const GOAL_Z = GOAL_DEPTH;
const GOAL_REAR_Z = GOAL_DEPTH - GOAL_NET_CONFIG.layout.depthBottom;

function randomInRange(range?: RangeValue): number {
  if (!range) return 0;
  const [min, max] = range;
  return min + Math.random() * (max - min);
}

function toVector3(init?: Vector3Init, defaultValue = 0): THREE.Vector3 {
  return new THREE.Vector3(
    init?.x ?? defaultValue,
    init?.y ?? defaultValue,
    init?.z ?? defaultValue
  );
}

function mergeRanges(base?: Vector3Range, override?: Vector3Range): Vector3Range {
  return {
    ...(base ?? {}),
    ...(override ?? {})
  };
}

function mergeTransforms(
  base?: ObstacleTransformConfig,
  override?: ObstacleTransformConfig
): {
  position: Vector3Init;
  positionRange: Vector3Range;
  rotation: Vector3Init;
  rotationRange: Vector3Range;
  scale?: number | Vector3Init;
} {
  return {
    position: { ...(base?.position ?? {}), ...(override?.position ?? {}) },
    positionRange: mergeRanges(base?.positionRange, override?.positionRange),
    rotation: { ...(base?.rotation ?? {}), ...(override?.rotation ?? {}) },
    rotationRange: mergeRanges(base?.rotationRange, override?.rotationRange),
    scale: override?.scale ?? base?.scale
  };
}

function axisToVector(axis: Axis): THREE.Vector3 {
  switch (axis) {
    case 'x':
      return new THREE.Vector3(1, 0, 0);
    case 'y':
      return new THREE.Vector3(0, 1, 0);
    default:
      return new THREE.Vector3(0, 0, 1);
  }
}

function createMaterial(
  config: ObstacleMaterialConfig | undefined,
  loadingManager: THREE.LoadingManager
): THREE.Material {
  const textureLoader = new THREE.TextureLoader(loadingManager);
  const params: THREE.MeshStandardMaterialParameters = {
    transparent: config?.transparent,
    opacity: config?.opacity
  };

  if (config?.color) {
    params.color = new THREE.Color(config.color as THREE.ColorRepresentation);
  }

  if (config?.textureUrl) {
    const texture = textureLoader.load(config.textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    params.map = texture;
    params.transparent = config.transparent ?? true;
  }

  const material = new THREE.MeshStandardMaterial(params);

  if (config?.doubleSided) {
    material.side = THREE.DoubleSide;
  }
  if (config?.alphaTest !== undefined) {
    material.alphaTest = config.alphaTest;
  }
  if (config?.depthWrite !== undefined) {
    material.depthWrite = config.depthWrite;
  }
  if (config?.depthTest !== undefined) {
    material.depthTest = config.depthTest;
  }

  return material;
}

async function buildVisual(
  render: ObstacleRenderConfig,
  loadingManager: THREE.LoadingManager
): Promise<THREE.Object3D> {
  if (render.kind === 'model') {
    const loader = new GLTFLoader(loadingManager);
    const gltf = await loader.loadAsync(render.assetUrl);
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        const mesh = child as THREE.Mesh;
        const mat = mesh.material;
        if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
        }
      }
    });

    if (render.scale !== undefined) {
      if (typeof render.scale === 'number') {
        gltf.scene.scale.setScalar(render.scale);
      } else {
        gltf.scene.scale.set(
          render.scale.x ?? 1,
          render.scale.y ?? 1,
          render.scale.z ?? 1
        );
      }
    }

    if (render.pivotOffset) {
      gltf.scene.position.set(
        render.pivotOffset.x ?? 0,
        render.pivotOffset.y ?? 0,
        render.pivotOffset.z ?? 0
      );
    }

    return gltf.scene;
  }

  const primitive = render as PrimitiveRenderConfig;
  const size = primitive.size ?? {};
  let geometry: THREE.BufferGeometry;

  switch (primitive.shape) {
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
        24
      );
      break;
    case 'capsule':
      geometry = new THREE.CapsuleGeometry(
        size.radius ?? 0.4,
        Math.max((size.height ?? 1) - (size.radius ?? 0.4) * 2, 0.0001)
      );
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(size.radius ?? 0.5, 24, 16);
      break;
    default:
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
  }

  const material = createMaterial(primitive.material, loadingManager);
  return new THREE.Mesh(geometry, material);
}

class PreviewObstacle {
  public readonly object: THREE.Object3D;
  private readonly basePosition = new THREE.Vector3();
  private readonly baseQuaternion = new THREE.Quaternion();
  private readonly baseScale = new THREE.Vector3(1, 1, 1);
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly tempQuat = new THREE.Quaternion();
  private readonly tempAxis = new THREE.Vector3();

  private movementTime = 0;
  private patrolState?: {
    axis: Axis;
    center: number;
    amplitude: number;
    speed: number;
    waveform: 'sine' | 'pingpong';
    phase: number;
  };

  private spinState?: {
    axis: Axis;
    axisVector: THREE.Vector3;
    speed: number;
    angle: number;
    radius: number;
    orbit?: {
      axis: Axis;
      center: number;
      amplitude: number;
      speed: number;
      phase: number;
    };
  };

  constructor(mesh: THREE.Object3D, blueprint: ObstacleBlueprint, instance: ObstacleInstanceConfig) {
    this.object = new THREE.Group();
    this.object.add(mesh);

    const combined = mergeTransforms(blueprint.defaultTransform, instance.transform);

    const position = toVector3(combined.position, 0);
    position.x += randomInRange(combined.positionRange.x);
    position.y += randomInRange(combined.positionRange.y);
    position.z += randomInRange(combined.positionRange.z);
    this.basePosition.copy(position);

    const rotation = new THREE.Euler(
      (combined.rotation.x ?? 0) + randomInRange(combined.rotationRange.x),
      (combined.rotation.y ?? 0) + randomInRange(combined.rotationRange.y),
      (combined.rotation.z ?? 0) + randomInRange(combined.rotationRange.z)
    );
    this.baseQuaternion.setFromEuler(rotation);

    if (combined.scale !== undefined) {
      if (typeof combined.scale === 'number') {
        this.baseScale.setScalar(combined.scale);
      } else {
        this.baseScale.set(
          combined.scale.x ?? 1,
          combined.scale.y ?? 1,
          combined.scale.z ?? 1
        );
      }
    }

    this.object.position.copy(this.basePosition);
    this.object.quaternion.copy(this.baseQuaternion);
    this.object.scale.copy(this.baseScale);

    const behavior = instance.behavior;
    if (behavior) {
      this.configureBehavior(behavior);
    }
  }

  private configureBehavior(behavior: ObstacleBehaviorConfig) {
    switch (behavior.type) {
      case 'patrol': {
        const config = behavior as PatrolBehaviorConfig;
        const range = config.range;
        const center = (range[0] + range[1]) * 0.5;
        const amplitude = Math.max((range[1] - range[0]) * 0.5, 0);
        this.patrolState = {
          axis: config.axis,
          center,
          amplitude,
          speed: config.speed ?? 1,
          waveform: config.waveform ?? 'sine',
          phase: config.startPhase ?? 0
        };
        break;
      }
      case 'spin': {
        const config = behavior as SpinBehaviorConfig;
        const axisVector = axisToVector(config.axis);
        const spinState: NonNullable<typeof this.spinState> = {
          axis: config.axis,
          axisVector,
          speed: config.speed ?? 1.2,
          angle: config.startAngle ?? 0,
          radius: config.radius ?? 0
        };

        if (config.orbit) {
          const orbit = config.orbit;
          const center = (orbit.range[0] + orbit.range[1]) * 0.5;
          const amplitude = Math.max((orbit.range[1] - orbit.range[0]) * 0.5, 0);
          spinState.orbit = {
            axis: orbit.axis,
            center,
            amplitude,
            speed: orbit.speed ?? 0,
            phase: orbit.startPhase ?? 0
          };
        }

        this.spinState = spinState;
        break;
      }
      default:
        break;
    }
  }

  update(deltaTime: number) {
    this.position.copy(this.basePosition);
    this.quaternion.copy(this.baseQuaternion);

    this.movementTime += deltaTime;

    if (this.patrolState) {
      const state = this.patrolState;
      let value: number;
      if (state.waveform === 'pingpong') {
        const cycle = Math.PI;
        const raw = (state.phase + state.speed * this.movementTime) % (cycle * 2);
        const t = raw <= cycle ? raw / cycle : 2 - raw / cycle;
        value = state.center - state.amplitude + (state.amplitude * 2) * t;
      } else {
        value = state.center + state.amplitude * Math.sin(state.phase + this.movementTime * state.speed);
      }
      (this.position as unknown as Record<Axis, number>)[state.axis] = value;
    }

    if (this.spinState) {
      const state = this.spinState;
      state.angle = (state.angle + state.speed * deltaTime) % (Math.PI * 2);
      this.tempAxis.copy(state.axisVector);
      this.tempQuat.setFromAxisAngle(this.tempAxis, state.angle);
      this.quaternion.multiply(this.tempQuat);

      if (state.radius > 0) {
        const angle = state.angle;
        switch (state.axis) {
          case 'x':
            this.position.y += state.radius * Math.sin(angle);
            this.position.z += state.radius * Math.cos(angle);
            break;
          case 'y':
            this.position.x += state.radius * Math.sin(angle);
            this.position.z += state.radius * Math.cos(angle);
            break;
          case 'z':
            this.position.x += state.radius * Math.sin(angle);
            this.position.y += state.radius * Math.cos(angle);
            break;
        }
      }

      if (state.orbit) {
        const orbit = state.orbit;
        orbit.phase = (orbit.phase + orbit.speed * deltaTime) % (Math.PI * 2);
        const value = orbit.center + orbit.amplitude * Math.sin(orbit.phase);
        (this.position as unknown as Record<Axis, number>)[orbit.axis] = value;
      }
    }

    this.object.position.copy(this.position);
    this.object.quaternion.copy(this.quaternion);
  }
}

export class LevelPreviewEngine {
  private readonly container: HTMLElement;
  private readonly obstacleConfigs: ObstacleInstanceConfig[];
  private readonly renderer: THREE.WebGLRenderer;
  private readonly hdrPipeline: HdrPipeline;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly obstacles: PreviewObstacle[] = [];
  private readonly loadingManager = new THREE.LoadingManager();
  private readonly resizeObserver: ResizeObserver;

  private isReady = false;

  constructor(container: HTMLElement, _level: DifficultyLevelConfig, obstacleConfigs?: ObstacleInstanceConfig[]) {
    this.container = container;
    this.obstacleConfigs = obstacleConfigs ?? _level.obstacles ?? [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050a11);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    configureRendererColorPipeline(this.renderer);
    this.renderer.domElement.classList.add('w-full', 'h-full', 'block', 'rounded-xl');
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 50);
    this.camera.position.set(0, 1.5, 3.2);
    this.camera.lookAt(0, 0.5, GOAL_Z);

    this.hdrPipeline = new HdrPipeline(this.renderer, this.scene, this.camera);

    this.addLights();
    this.addGround();
    this.addGoalFrame();

    this.resize();

    void this.loadObstacles();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.hdrPipeline.dispose();
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }

  private addLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(4, 6, 4);
    this.scene.add(dir);

    const rim = new THREE.DirectionalLight(0x66aaff, 0.35);
    rim.position.set(-3, 2, -3);
    this.scene.add(rim);
  }

  private addGround() {
    const geometry = new THREE.PlaneGeometry(14, 14);
    const material = new THREE.MeshStandardMaterial({
      color: 0x093049,
      metalness: 0.15,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, GOAL_Z + 2.4);
    this.scene.add(ground);
  }

  private addGoalFrame() {
    const material = new THREE.MeshStandardMaterial({
      color: 0xe8f0ff,
      metalness: 0.2,
      roughness: 0.6
    });

    const postWidth = POST_RADIUS * 2;
    const depthBottom = GOAL_NET_CONFIG.layout.depthBottom;
    const rearZ = GOAL_REAR_Z;

    const frontLeftPost = new THREE.Mesh(
      new THREE.BoxGeometry(postWidth, GOAL_HEIGHT, postWidth),
      material
    );
    frontLeftPost.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_Z);

    const frontRightPost = frontLeftPost.clone();
    frontRightPost.position.x = GOAL_WIDTH / 2;

    const rearLeftPost = frontLeftPost.clone();
    rearLeftPost.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, rearZ);

    const rearRightPost = frontLeftPost.clone();
    rearRightPost.position.set(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, rearZ);

    const crossbarFront = new THREE.Mesh(
      new THREE.BoxGeometry(GOAL_WIDTH, postWidth, postWidth),
      material
    );
    crossbarFront.position.set(0, GOAL_HEIGHT - POST_RADIUS, GOAL_Z);

    const crossbarRear = crossbarFront.clone();
    crossbarRear.position.z = rearZ;

    const depthBarGeometry = new THREE.BoxGeometry(postWidth, postWidth, depthBottom);
    const topLeftDepth = new THREE.Mesh(depthBarGeometry, material);
    topLeftDepth.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT - POST_RADIUS, GOAL_Z - depthBottom / 2);

    const topRightDepth = topLeftDepth.clone();
    topRightDepth.position.x = GOAL_WIDTH / 2;

    const bottomLeftDepth = topLeftDepth.clone();
    bottomLeftDepth.position.set(-GOAL_WIDTH / 2, POST_RADIUS, GOAL_Z - depthBottom / 2);

    const bottomRightDepth = bottomLeftDepth.clone();
    bottomRightDepth.position.x = GOAL_WIDTH / 2;

    const baseFront = new THREE.Mesh(
      new THREE.BoxGeometry(GOAL_WIDTH, postWidth, postWidth),
      material
    );
    baseFront.position.set(0, POST_RADIUS, GOAL_Z);

    const baseRear = baseFront.clone();
    baseRear.position.z = rearZ;

    const goalGroup = new THREE.Group();
    goalGroup.add(
      frontLeftPost,
      frontRightPost,
      rearLeftPost,
      rearRightPost,
      crossbarFront,
      crossbarRear,
      topLeftDepth,
      topRightDepth,
      bottomLeftDepth,
      bottomRightDepth,
      baseFront,
      baseRear
    );
    this.scene.add(goalGroup);
  }

  private async loadObstacles() {
    const tasks = this.obstacleConfigs.map(async (config) => {
      const blueprint = OBSTACLE_BLUEPRINTS[config.blueprintId];
      if (!blueprint) {
        console.warn(`[Admin] Unknown blueprint: ${config.blueprintId}`);
        return null;
      }

      const mesh = await buildVisual(blueprint.render, this.loadingManager);
      const preview = new PreviewObstacle(mesh, blueprint, config);
      this.scene.add(preview.object);
      return preview;
    });

    const loaded = await Promise.all(tasks);
    loaded.forEach((item) => {
      if (item) {
        this.obstacles.push(item);
      }
    });

    this.isReady = true;
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height, false);
    this.hdrPipeline.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(deltaTime: number) {
    if (!this.isReady) {
      return;
    }

    for (const obstacle of this.obstacles) {
      obstacle.update(deltaTime);
    }

    this.hdrPipeline.render();
  }
}
