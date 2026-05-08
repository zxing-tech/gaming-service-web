import { PHYSICS_LINEAR_DAMPING } from '../physics/Constants';
import type { SoundKey } from './Audio';
import { getAssetPath } from '../utils/assetPath';

const basicBallModel = getAssetPath('/assets/ball/basic.glb');

const basicBallImage = getAssetPath('/assets/ball/basic.png');


export interface BallPhysicsConfig {
  radius: number;
  mass: number;
  linearDamping: number;
  angularDamping: number;
  startPosition: { x: number; y: number; z: number };
  startRotation: { x: number; y: number; z: number };
}


export interface BallTheme {
  name: string;
  modelUrl: string;
  sourceFormat?: 'gltf' | 'fbx';
  imageUrl: string;
  gltfScale: number;
  unlockScore: number;
  material?: {
    roughness?: number;
    metalness?: number;
  };
  sounds?: {
    bounce?: SoundKey;
  };
}


export interface BallConfig extends BallPhysicsConfig {
  theme: BallTheme;
  gltfScale: number;
}

const BALL_HOVER_EPSILON = 0.01;


export const BALL_PHYSICS: BallPhysicsConfig = {
  radius: 0.09,
  mass: 1.2,
  linearDamping: PHYSICS_LINEAR_DAMPING,
  angularDamping: 0.9,
  startPosition: { x: 0, y: 0.15, z: 0 },
  startRotation: { x: 0.3, y: 0.5, z: 0.2 }
};


BALL_PHYSICS.startPosition.y = BALL_PHYSICS.radius + BALL_HOVER_EPSILON;


export const BALL_THEMES = {
  BASIC: {
    name: 'basic',
    modelUrl: basicBallModel,
    sourceFormat: 'gltf',
    imageUrl: basicBallImage,
    gltfScale: 1.3,
    unlockScore: 0
  } as BallTheme,
} as const;


export const DEFAULT_BALL_THEME = BALL_THEMES.BASIC;


export const BALL_CONFIG: BallConfig = {
  ...BALL_PHYSICS,
  theme: DEFAULT_BALL_THEME,
  gltfScale: DEFAULT_BALL_THEME.gltfScale
};


export const BALL_RADIUS = BALL_PHYSICS.radius;
export const BALL_START_POSITION = BALL_PHYSICS.startPosition;
export const BALL_HOVER_OFFSET = BALL_HOVER_EPSILON;
