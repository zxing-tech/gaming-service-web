import * as THREE from 'three';

/** Renderer tone mapping and scene light intensities (HDR pipeline source of truth). */
export const RENDERING_CONFIG = {
  toneMapping: THREE.ACESFilmicToneMapping,
  /** Lower than legacy 1.3 — ACES + half-float RT already lift mids/highlights. */
  toneMappingExposure: 0.95,
  lighting: {
    ambient: 0.35,
    hemisphereSky: 0xd8f1de,
    hemisphereGround: 0x3a6b46,
    hemisphere: 0.45,
    directional: 0.85,
    point: 0.75,
    rim: 3.5,
    rimColor: 0xb0d8ff,
    rimDistance: 90,
    goalFront: 0.9,
  },
} as const;
