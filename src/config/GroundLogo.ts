import * as THREE from 'three';

/**
 * Coca-Cola / pitch logo decal — scales with the shorter screen edge so it stays
 * readable on small phones and doesn’t dominate on tablets.
 */
export function getGroundLogoLayout(): { width: number; height: number; z: number } {
  if (typeof window === 'undefined') {
    return { width: 3, height: 4.8, z: 0.7 };
  }

  const sw = Math.min(window.innerWidth, window.innerHeight);
  const isLandscapePhone = window.innerWidth > window.innerHeight && sw < 520;

  let width: number;
  let height: number;
  let z: number;

  if (sw <= 320) {
    width = 1.35;
    height = 2.0;
    z = 0.46;
  } else if (sw <= 360) {
    width = 1.5;
    height = 2.2;
    z = 0.48;
  } else if (sw <= 390) {
    width = 1.65;
    height = 2.45;
    z = 0.5;
  } else if (sw <= 430) {
    width = 1.85;
    height = 2.75;
    z = 0.53;
  } else if (sw <= 480) {
    width = 2.0;
    height = 2.95;
    z = 0.55;
  } else if (sw <= 600) {
    width = 2.2;
    height = 3.25;
    z = 0.57;
  } else if (sw <= 768) {
    width = 2.45;
    height = 3.6;
    z = 0.62;
  } else if (sw <= 1024) {
    width = 2.75;
    height = 4.2;
    z = 0.66;
  } else {
    width = 3;
    height = 4.8;
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
