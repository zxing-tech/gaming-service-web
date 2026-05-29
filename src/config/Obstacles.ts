import { getAssetPath } from '../utils/assetPath';
import { GOAL_WIDTH } from './Goal';

/** Primary GLB: mesh + default animations (Mixamo Goalkeeper Body Block). Converted from
 *  FBX via FBX2glTF; baseColor textures re-encoded to WebP q90 at original 4K resolution
 *  (visually identical, ~85% smaller); PBR factors normalized at conversion time so
 *  MeshStandardMaterial doesn't render skin/cloth as gray metal. */
export const MIXAMO_KEEPER_FBX_BASE = getAssetPath('/assets/models/Goalkeeper Idle (1).glb');
/** Eager-loaded extras — animation clips merged onto primary skeleton. */
export const MIXAMO_KEEPER_FBX_EXTRA = [] as const;
/** Deferred extras — fetched in background after initial load. Animation-only files (their
 *  meshes are disposed once we extract clips), so the GLB has its textures stripped entirely. */
export const MIXAMO_KEEPER_FBX_DEFERRED = [
  getAssetPath('/assets/models/Diving Save (7).glb'),
  getAssetPath('/assets/models/Diving Save(8).glb')
] as const;

/** Plane size in world units — sized to fit inside GOAL_HEIGHT (2) and GOAL_WIDTH (3) opening. */
const keeperWallWidth = 1.32;

/** Half-width of the keeper visual; used to clamp patrol so the body stays inside the posts. */
export const KEEPER_VISUAL_HALF_WIDTH = keeperWallWidth / 2;

/** Max |x| for keeper center position (small margin inside the goal mouth). */
export const KEEPER_MAX_CENTER_OFFSET_X =
  GOAL_WIDTH / 2 - KEEPER_VISUAL_HALF_WIDTH - 0.06;
export type Axis = 'x' | 'y' | 'z';

export type RangeValue = [number, number];

export interface Vector3Init {
  x?: number;
  y?: number;
  z?: number;
}

export interface Vector3Range {
  x?: RangeValue;
  y?: RangeValue;
  z?: RangeValue;
}

export interface ObstacleTransformConfig {

  position?: Vector3Init;

  positionRange?: Vector3Range;

  rotation?: Vector3Init;

  rotationRange?: Vector3Range;

  scale?: number | Vector3Init;
}

export interface ObstacleMaterialConfig {
  color?: number | string;
  textureUrl?: string;
  doubleSided?: boolean;
  transparent?: boolean;
  opacity?: number;
  alphaTest?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
}

export interface PrimitiveRenderConfig {
  kind: 'primitive';
  shape: 'box' | 'plane' | 'cylinder' | 'capsule' | 'sphere';
  size?: {
    x?: number;
    y?: number;
    z?: number;
    radius?: number;
    height?: number;
  };
  material?: ObstacleMaterialConfig;
}

export interface ModelRenderConfig {
  kind: 'model';
  assetUrl: string;
  /** Defaults to GLTF/GLB. Use `fbx` for Mixamo-style exports. */
  sourceFormat?: 'gltf' | 'fbx';
  /** Same rig as `assetUrl`; clips are merged onto the primary skeleton in the obstacle. */
  extraAnimationUrls?: readonly string[];
  /** Loaded after the obstacle is on screen; clips are appended once they arrive (best-effort). */
  deferredAnimationUrls?: readonly string[];
  scale?: number | Vector3Init;
  pivotOffset?: Vector3Init;
}

export type ObstacleRenderConfig = PrimitiveRenderConfig | ModelRenderConfig;

export interface BoxColliderConfig {
  shape: 'box';
  size: {
    x: number;
    y: number;
    z: number;
  };
}

export interface CylinderColliderConfig {
  shape: 'cylinder';
  radius: number;
  height: number;
  axis?: Axis;
}

export interface CapsuleColliderConfig {
  shape: 'capsule';
  radius: number;
  height: number;
  axis?: Axis;
}

export interface SphereColliderConfig {
  shape: 'sphere';
  radius: number;
}

export interface AutoColliderConfig {
  shape: 'auto';
  margin?: number;
}

export type ObstacleColliderConfig =
  | BoxColliderConfig
  | CylinderColliderConfig
  | CapsuleColliderConfig
  | SphereColliderConfig
  | AutoColliderConfig;

export interface StaticBehaviorConfig {
  type: 'static';
}

export interface PatrolBehaviorConfig {
  type: 'patrol';
  axis: Axis;
  range: RangeValue;
  speed?: number;
  waveform?: 'sine' | 'pingpong';
  startPhase?: number;
}

export interface SpinBehaviorConfig {
  type: 'spin';
  axis: Axis;
  speed?: number;
  orbit?: {
    axis: Axis;
    range: RangeValue;
    speed?: number;
    startPhase?: number;
  };
  radius?: number;
  startAngle?: number;
}

export type ObstacleBehaviorConfig =
  | StaticBehaviorConfig
  | PatrolBehaviorConfig
  | SpinBehaviorConfig;

export interface ObstacleBlueprint {
  id: string;
  render: ObstacleRenderConfig;
  collider?: ObstacleColliderConfig;
  defaultTransform?: ObstacleTransformConfig;
}

export interface ObstacleInstanceConfig {

  blueprintId: string;

  label?: string;

  transform?: ObstacleTransformConfig;

  collider?: ObstacleColliderConfig;

  behavior?: ObstacleBehaviorConfig;
}

export const OBSTACLE_BLUEPRINTS: Record<string, ObstacleBlueprint> = {
  keeperWall: {
    id: 'keeperWall',
    render: {
      kind: 'model',
      assetUrl: MIXAMO_KEEPER_FBX_BASE,
      extraAnimationUrls: MIXAMO_KEEPER_FBX_EXTRA,
      deferredAnimationUrls: MIXAMO_KEEPER_FBX_DEFERRED,
      scale: 0.9
    },
    collider: {
      shape: 'box',
      // Torso-sized only — not post-to-post; strict shot slab further narrows to the dive side.
      size: { x: 0.78, y: 1.48, z: 0.72 }
    },
    defaultTransform: {
      position: { y: 0 }
    }
  },
  cubeColor: {
    id: 'cubeColor',
    render: {
      kind: 'primitive',
      shape: 'box',
      size: { x: 0.8, y: 0.8, z: 0.8 },
      material: {
        color: '#ff3355'
      }
    },
    collider: {
      shape: 'box',
      size: { x: 0.8, y: 0.8, z: 0.8 }
    },
    defaultTransform: {
      position: { y: 0.4 }
    }
  },
  capsuleGuard: {
    id: 'capsuleGuard',
    render: {
      kind: 'primitive',
      shape: 'capsule',
      size: { radius: 0.25, height: 1.4 },
      material: {
        color: '#ff8822'
      }
    },
    collider: {
      shape: 'capsule',
      radius: 0.25,
      height: 1.4,
      axis: 'y'
    },
    defaultTransform: {
      position: { y: 0.7 }
    }
  },
  panelBlue: {
    id: 'panelBlue',
    render: {
      kind: 'primitive',
      shape: 'plane',
      size: { x: 1.0, y: 1.5 },
      material: {
        color: '#2a80ff',
        doubleSided: true,
        transparent: false
      }
    },
    collider: {
      shape: 'box',
      size: { x: 1.0, y: 1.5, z: 0.2 }
    },
    defaultTransform: {
      position: { y: 0.75 }
    }
  },
  cylinderBasic: {
    id: 'cylinderBasic',
    render: {
      kind: 'primitive',
      shape: 'cylinder',
      size: { radius: 0.35, height: 1.2 },
      material: {
        color: '#22aaff'
      }
    },
    collider: {
      shape: 'cylinder',
      radius: 0.35,
      height: 1.2,
      axis: 'y'
    },
    defaultTransform: {
      position: { y: 0.6 }
    }
  }
};

export function getObstacleBlueprint(id: string): ObstacleBlueprint | undefined {
  return OBSTACLE_BLUEPRINTS[id];
}
