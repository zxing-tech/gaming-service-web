import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Drop-in replacement for FBXLoader that also handles .glb / .gltf. Auto-
// detects from URL extension and presents both as an Object3D whose
// `.animations` is the AnimationClip[] (matching FBXLoader's shape), so
// existing call sites don't have to change.
export class UniversalModelLoader {
  private readonly fbxLoader: FBXLoader;
  private readonly gltfLoader: GLTFLoader;

  constructor(manager?: THREE.LoadingManager) {
    this.fbxLoader = new FBXLoader(manager);
    this.gltfLoader = new GLTFLoader(manager);
  }

  loadAsync(url: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      this.load(url, resolve, undefined, reject);
    });
  }

  load(
    url: string,
    onLoad: (object: THREE.Object3D) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const lower = url.split('?')[0].toLowerCase();
    if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
      this.gltfLoader.load(
        url,
        (gltf) => {
          (gltf.scene as THREE.Object3D & { animations: THREE.AnimationClip[] }).animations =
            gltf.animations;
          onLoad(gltf.scene);
        },
        onProgress,
        onError,
      );
      return;
    }
    this.fbxLoader.load(url, onLoad, onProgress, onError);
  }
}
