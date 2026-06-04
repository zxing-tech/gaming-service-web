import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RENDERING_CONFIG } from '../config/Rendering';

/**
 * Half-float HDR render chain: beauty pass → ACES tone map + sRGB (OutputPass).
 * Replaces direct `renderer.render()` so highlights roll off instead of clipping flat white.
 */
export class HdrPipeline {
  private readonly composer: EffectComposer;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    renderer.toneMapping = RENDERING_CONFIG.toneMapping;
    renderer.toneMappingExposure = RENDERING_CONFIG.toneMappingExposure;

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(new OutputPass());
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
  }
}
