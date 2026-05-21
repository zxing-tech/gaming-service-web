import * as THREE from 'three';
import { RENDERING_CONFIG } from '../config/Rendering';

export function configureRendererColorPipeline(renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = RENDERING_CONFIG.toneMapping;
  renderer.toneMappingExposure = RENDERING_CONFIG.toneMappingExposure;
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });


  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  configureRendererColorPipeline(renderer);
  return renderer;
}
