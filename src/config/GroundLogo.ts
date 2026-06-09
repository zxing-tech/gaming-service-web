import * as THREE from 'three';

/**
 * Coca-Cola / pitch logo decal — scales with the shorter screen edge so it stays
 * readable on small phones and doesn’t dominate on tablets.
 */
export function getGroundLogoLayout(): { width: number; height: number; z: number } {
  if (typeof window === 'undefined') {
    return { width: 3.8, height: 1.27, z: 0.7 };
  }

  const sw = Math.min(window.innerWidth, window.innerHeight);
  const isLandscapePhone = window.innerWidth > window.innerHeight && sw < 520;

  let width: number;
  let height: number;
  let z: number;

  // Image is 1024x344 (≈ 2.98:1 landscape). width ≈ height * 2.98 throughout.
  if (sw <= 320) {
    width = 1.5;
    height = 0.5;
    z = 0.46;
  } else if (sw <= 360) {
    width = 1.7;
    height = 0.57;
    z = 0.48;
  } else if (sw <= 390) {
    width = 1.9;
    height = 0.64;
    z = 0.5;
  } else if (sw <= 430) {
    width = 2.1;
    height = 0.7;
    z = 0.53;
  } else if (sw <= 480) {
    width = 2.3;
    height = 0.77;
    z = 0.55;
  } else if (sw <= 600) {
    width = 2.5;
    height = 0.84;
    z = 0.57;
  } else if (sw <= 768) {
    width = 2.9;
    height = 0.97;
    z = 0.62;
  } else if (sw <= 1024) {
    width = 3.4;
    height = 1.14;
    z = 0.66;
  } else {
    width = 3.8;
    height = 1.27;
    z = 0.7;
  }

  if (isLandscapePhone) {
    width *= 0.9;
    height *= 0.9;
    z *= 0.97;
  }

  return { width, height, z };
}

export function applyGroundLogoLayout(
  meshes: THREE.Mesh[],
  layout: { width: number; height: number; z: number }
): void {
  const { width, height, z } = layout;
  for (const mesh of meshes) {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(width, height);
    mesh.position.z = z;
  }
}
