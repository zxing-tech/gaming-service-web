import { getAssetPath } from '../utils/assetPath';
import { MIXAMO_KEEPER_FBX_BASE } from './Obstacles';

/**
 * Kicker / goalkeeper URLs for preload (AssetLoader).
 */
export const PLAYERS_CONFIG = {
  kicker: {
    assetUrl: getAssetPath('/assets/models/Strike Foward Jog.fbx'),
    idleAssetUrl: getAssetPath('/assets/models/Happy Idle (2).fbx'),
    sourceFormat: 'fbx',
  },
  goalkeeper: {
    assetUrl: MIXAMO_KEEPER_FBX_BASE,
  },
} as const;
