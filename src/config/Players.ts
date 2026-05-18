import { getAssetPath } from '../utils/assetPath';
import { MIXAMO_KEEPER_FBX_BASE } from './Obstacles';

/**
 * Kicker / goalkeeper URLs for preload (AssetLoader).
 */
export const PLAYERS_CONFIG = {
  kicker: {
    assetUrl: getAssetPath('/assets/models/Strike Foward Jog.glb'),
    idleAssetUrl: getAssetPath('/assets/models/Happy Idle (2).glb'),
    sourceFormat: 'gltf',
    /** Jersey decals are baked into the shirt's UV-mapped texture so they deform with skinning
     * and shade like the rest of the cloth (no floating sticker look). */
    appearance: {
      shirt: { color: 0xd31738 },
      jerseyBake: {
        logoUrl: getAssetPath('/assets/ads/image-white.png'),
        number: 10,
        numberColor: 0xffffff,
      },
    },
  },
  goalkeeper: {
    assetUrl: MIXAMO_KEEPER_FBX_BASE,
    appearance: {
      shirt: { color: 0x35cd21 },
      chestLogo: getAssetPath('/logo-grab.png'),
    },
  },
} as const;
