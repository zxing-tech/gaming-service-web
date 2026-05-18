import { getAssetPath } from '../utils/assetPath';
import { GOAL_WIDTH } from './Goal';

/** Primary GLB: mesh + default animations (Mixamo Goalkeeper Body Block). Converted from
 *  FBX via FBX2glTF; baseColor textures re-encoded to WebP q90 at original 4K resolution
 *  (visually identical, ~85% smaller); PBR factors normalized at conversion time so
 *  MeshStandardMaterial doesn't render skin/cloth as gray metal. */
export const MIXAMO_KEEPER_FBX_BASE = getAssetPath('/assets/models/Goalkeeper Body Block (3).glb');
/** Eager-loaded extras — required at boot so the keeper has a proper idle pose before the first shot. */
export const MIXAMO_KEEPER_FBX_EXTRA = [
  getAssetPath('/assets/models/Goalkeeper Idle.glb')
] as const;
/** Deferred extras — fetched in background after initial load. Animation-only files (their
 *  meshes are disposed once we extract clips), so the GLB has its textures stripped entirely. */
export const MIXAMO_KEEPER_FBX_DEFERRED = [
  getAssetPath('/assets/models/Goalkeeper Body Block (2).glb'),
  getAssetPath('/assets/models/Goalkeeper Diving Save (3).glb'),
  getAssetPath('/assets/models/Goalkeeper Diving Save (4).glb')
] as const;

/** Plane size in world units — sized to fit inside GOAL_HEIGHT (2) and GOAL_WIDTH (3) opening. */
const keeperWallWidth = 1.32;

/** Half-width of the keeper visual; used to clamp patrol so the body stays inside the posts. */
export const KEEPER_VISUAL_HALF_WIDTH = keeperWallWidth / 2;

/** Max |x| for keeper center position (small margin inside the goal mouth). */
export const KEEPER_MAX_CENTER_OFFSET_X =
  GOAL_WIDTH / 2 - KEEPER_VISUAL_HALF_WIDTH - 0.06;
const woodTextureUrl = getAssetPath('/assets/models/obstacle/wood.jpg');
const whiteDroneTextureUrl = getAssetPath('/assets/models/obstacle/whiteDrone.png');
const cokeModelUrl = getAssetPath('/assets/models/bottle/coke.glb');
const drumModelUrl = getAssetPath('/assets/models/drum.glb');
const vanModelUrl = getAssetPath('/assets/models/van.glb');
const sharkModelUrl = getAssetPath('/assets/models/shark.glb');


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
      scale: 1.1
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
  woodVertical: {
    id: 'woodVertical',
    render: {
      kind: 'primitive',
      shape: 'plane',
      size: { x: 0.6, y: 2.0 },
      material: {
        textureUrl: woodTextureUrl,
        doubleSided: true,
        transparent: true,
        opacity: 1,
        alphaTest: 0.01
      }
    },
    collider: {
      shape: 'box',
      size: { x: 0.6, y: 2.0, z: 0.6 }
    },
    defaultTransform: {
      position: { y: 1.0 }
    }
  },
  woodHorizontal: {
    id: 'woodHorizontal',
    render: {
      kind: 'primitive',
      shape: 'plane',
      size: { x: 3.0, y: 0.4 },
      material: {
        textureUrl: woodTextureUrl,
        doubleSided: true,
        transparent: true,
        opacity: 1,
        alphaTest: 0.01
      }
    },
    collider: {
      shape: 'box',
      size: { x: 3.0, y: 0.4, z: 0.6 }
    },
    defaultTransform: {
      position: { y: 0.3 }
    }
  },
    whiteDrone: {
    id: 'whiteDrone',
    render: {
      kind: 'primitive',
      shape: 'plane',
      size: { x: 1.0, y: 1.0 },
      material: {
        textureUrl: whiteDroneTextureUrl,
        doubleSided: true,
        transparent: true,
        opacity: 1,
        alphaTest: 0.01
      }
    },
    collider: {
      shape: 'box',
      size: { x: 0.6, y: 0.5, z: 0.6 }
    },
    defaultTransform: {
      position: { y: 0.8 }
    }
  },
  drum :{
	id: 'drum',
	render: {
 		kind: 'model',
		assetUrl: drumModelUrl,
		scale: 4.0,
		pivotOffset: {y: -0.47},

	},
	 collider: {
      shape: 'cylinder',
	  radius: 0.33,
	  height: 1.0,
	  axis: 'y',
    },
    
  },
  shark :{
	id: 'shark',
	render: {
 		kind: 'model',
		assetUrl: sharkModelUrl,
		scale: 0.49,
		pivotOffset: {x: -0.7, y: 0.3, z: -1.0},

	},
	 collider: {
      shape: 'box',
      size: { x: 2.5, y: 0.6, z: 0.6 },
    },
    
  },
  van :{
	id: 'van',
	render: {
 		kind: 'model',
		assetUrl: vanModelUrl,
		scale: 0.0081,
		pivotOffset: { y: -0.75}
	},
	 collider: {
      shape: 'box',
      size: { x: 1.7, y: 1.7, z: 3.4 },
    },
    
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
  cokeBottle: {
    id: 'cokeBottle',
    render: {
      kind: 'model',
      assetUrl: cokeModelUrl,
      scale: 0.2025,
      pivotOffset: { y: 0 }
    },
    collider: {
      shape: 'capsule',
      radius: 0.18,
      height: 0.9,
      axis: 'y'
    },
    defaultTransform: {
      position: { y: 0.45 }
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
