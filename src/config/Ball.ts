import { PHYSICS_LINEAR_DAMPING } from '../physics/Constants';
import type { SoundKey } from './Audio';
import { getAssetPath } from '../utils/assetPath';

const basicBallModel = getAssetPath('/assets/ball/basic.glb');
const moonBallModel = getAssetPath('/assets/ball/moon.glb');
const basketBallModel = getAssetPath('/assets/ball/basketball.glb');
const volleyBallModel = getAssetPath('/assets/ball/volleyball.glb');
const earthBallModel = getAssetPath('/assets/ball/earth.glb');
const worldCup2010BallModel = getAssetPath('/assets/ball/worldcup2010.glb');
const beachBallModel = getAssetPath('/assets/ball/beachball.glb');
const monsterBallModel = getAssetPath('/assets/ball/monsterball.glb');
const sunBallModel = getAssetPath('/assets/ball/sun.glb');

const basicBallImage = getAssetPath('/assets/ball/basic.png');
const moonBallImage = getAssetPath('/assets/ball/moon.png');
const basketballBallImage = getAssetPath('/assets/ball/basketball.png');
const volleyballBallImage = getAssetPath('/assets/ball/volleyball.png');
const earthBallImage = getAssetPath('/assets/ball/earth.png');
const worldcup2010BallImage = getAssetPath('/assets/ball/worldcup2010.png');
const beachballImage = getAssetPath('/assets/ball/beachball.png');
const monsterballImage = getAssetPath('/assets/ball/monsterball.png');
const sunBallImage = getAssetPath('/assets/ball/sun.png');


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
  radius: 0.15,
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
    imageUrl: basicBallImage,
    gltfScale: 1.3,
    unlockScore: 0
  } as BallTheme,
  MOON: {
    name: 'moon',
    modelUrl: moonBallModel,
    imageUrl: moonBallImage,
    gltfScale: 0.0048,
    unlockScore: 60,
	material: {
	  roughness: 0.,
	  metalness: 0.3,
	},
	sounds: {
    bounce: 'post'
  }
  } as BallTheme,
  BASKETBALL : {
	name: 'basketball',
	modelUrl: basketBallModel,
	imageUrl: basketballBallImage,
	gltfScale: 0.15,
	unlockScore: 15
  } as BallTheme,
  VOLLEYBALL : {
	name: 'volleyball',
	modelUrl: volleyBallModel,
	imageUrl: volleyballBallImage,
	gltfScale: 1.3,
	unlockScore: 30
  } as BallTheme,
  EARTH : {
	name: 'earth',
	modelUrl: earthBallModel,
	imageUrl: earthBallImage,
	gltfScale: 0.125,
	unlockScore: 75,
	material: {
	  roughness: 0.,
	  metalness: 0.3,
	}
  } as BallTheme,
  WORLDCUP2010 : {
	name: 'worldcup2010',
	modelUrl: worldCup2010BallModel,
	imageUrl: worldcup2010BallImage,
	gltfScale: 0.4,
	unlockScore: 120
  } as BallTheme,
  BEACHBALL : {
	name: 'beachball',
	modelUrl: beachBallModel,
	imageUrl: beachballImage,
	gltfScale: 0.14,
	unlockScore: 90
  } as BallTheme,
  MONSTERBALL : {
	name: 'monsterball',
	modelUrl: monsterBallModel,
	imageUrl: monsterballImage,
	gltfScale: 0.04,
	unlockScore: 105
  } as BallTheme,
  SUN : {
	name: 'sun',
	modelUrl: sunBallModel,
	imageUrl: sunBallImage,
	gltfScale: 0.015,
	unlockScore: 45
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
