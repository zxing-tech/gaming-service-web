import { getAssetPath } from '../utils/assetPath';

/**
 * Kicker / goalkeeper GLB URLs for preload (AssetLoader).
 * Replace with dedicated character models when available.
 */
export const PLAYERS_CONFIG = {
  kicker: {
    assetUrl: getAssetPath('/assets/models/drum.glb'),
  },
  goalkeeper: {
    assetUrl: getAssetPath('/assets/models/van.glb'),
  },
} as const;
