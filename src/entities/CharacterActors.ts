import type * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { PLAYERS_CONFIG } from '../config/Players';

export class CharacterActors {
  private static readonly STRIKER_IDLE_OFFSET_X = -0.26;
  private static readonly STRIKER_IDLE_OFFSET_Z = 1.18;
  // Trigger ball launch at early contact frame of this kick animation.
  private static readonly KICK_CONTACT_NORMALIZED_TIME = 0.28;
  private static readonly STRIKER_BLEND_SECONDS = 0.1;
  private readonly scene: THREE.Scene;
  private readonly loadingManager: THREE.LoadingManager;
  private strikerRoot: THREE.Object3D | null = null;
  private strikerMixer: THREE.AnimationMixer | null = null;
  private strikerKickAction: THREE.AnimationAction | null = null;
  private strikerIdleAction: THREE.AnimationAction | null = null;
  private isKickPlaying = false;

  constructor(
    scene: THREE.Scene,
    loadingManager: THREE.LoadingManager
  ) {
    this.scene = scene;
    this.loadingManager = loadingManager;
  }

  async load(): Promise<void> {
    if (PLAYERS_CONFIG.kicker.sourceFormat !== 'fbx') return;

    const loader = new FBXLoader(this.loadingManager);
    try {
      const root = await loader.loadAsync(encodeURI(PLAYERS_CONFIG.kicker.assetUrl));
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          if (child.material instanceof THREE.MeshStandardMaterial && child.material.map) {
            child.material.map.colorSpace = THREE.SRGBColorSpace;
          }
        }
      });

      root.scale.setScalar(0.0085);
      root.rotation.y = Math.PI;
      root.visible = true;
      this.scene.add(root);

      this.strikerRoot = root;
      this.strikerMixer = new THREE.AnimationMixer(root);

      const kickClip = root.animations[0];
      if (kickClip) {
        const action = this.strikerMixer.clipAction(kickClip, root);
        action.enabled = true;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.stop();
        this.strikerKickAction = action;
      }

      if (PLAYERS_CONFIG.kicker.idleAssetUrl) {
        try {
          const idleBundle = await loader.loadAsync(encodeURI(PLAYERS_CONFIG.kicker.idleAssetUrl));
          const idleClip = idleBundle.animations[0];
          if (idleClip && this.strikerMixer && this.strikerRoot) {
            const idleAction = this.strikerMixer.clipAction(idleClip, this.strikerRoot);
            idleAction.enabled = true;
            idleAction.setLoop(THREE.LoopRepeat, Infinity);
            idleAction.clampWhenFinished = false;
            idleAction.play();
            this.strikerIdleAction = idleAction;
          }
        } catch (error) {
          console.warn('[CharacterActors] Failed to load striker idle FBX', error);
        }
      }

      this.playIdleLoop();
    } catch (error) {
      console.warn('[CharacterActors] Failed to load striker FBX', error);
    }
  }

  update(
    deltaTime: number,
    ballPosition: CANNON.Vec3,
    isShotInProgress: boolean
  ): void {
    if (!this.strikerRoot) return;

    if (!isShotInProgress) {
      this.strikerRoot.position.set(
        ballPosition.x + CharacterActors.STRIKER_IDLE_OFFSET_X,
        0,
        ballPosition.z + CharacterActors.STRIKER_IDLE_OFFSET_Z
      );
      if (!this.isKickPlaying) {
        this.strikerRoot.rotation.y = Math.PI;
      }
    }

    if (this.strikerMixer) {
      const dt = Math.min(Math.max(deltaTime, 0), 0.05);
      this.strikerMixer.update(dt);
    }

    if (this.isKickPlaying && this.strikerKickAction) {
      const clipDuration = this.strikerKickAction.getClip().duration;
      const kickEnded = this.strikerKickAction.time >= clipDuration - 0.005;
      if (kickEnded) {
        this.isKickPlaying = false;
        this.playIdleLoop();
      }
    }
  }

  triggerKick(): void {
    if (!this.strikerKickAction || !this.strikerMixer || !this.strikerRoot) return;
    this.isKickPlaying = true;
    this.strikerRoot.visible = true;
    this.strikerKickAction.reset();
    this.strikerKickAction.paused = false;
    this.strikerKickAction.setLoop(THREE.LoopOnce, 1);
    this.strikerKickAction.clampWhenFinished = true;
    this.strikerKickAction.fadeIn(CharacterActors.STRIKER_BLEND_SECONDS).play();
    if (this.strikerIdleAction) {
      this.strikerIdleAction.fadeOut(CharacterActors.STRIKER_BLEND_SECONDS);
    }
  }

  isKickAnimationComplete(): boolean {
    if (!this.strikerKickAction) return true;
    if (!this.isKickPlaying) return true;
    const clipDuration = this.strikerKickAction.getClip().duration;
    return this.strikerKickAction.time >= clipDuration - 0.03;
  }

  hasReachedKickContactMoment(): boolean {
    if (!this.strikerKickAction) return true;
    const clipDuration = this.strikerKickAction.getClip().duration;
    const contactTime = clipDuration * CharacterActors.KICK_CONTACT_NORMALIZED_TIME;
    return this.strikerKickAction.time >= contactTime;
  }

  reset(): void {
    this.isKickPlaying = false;
    if (this.strikerKickAction) {
      this.strikerKickAction.stop();
    }
    if (this.strikerRoot) {
      this.strikerRoot.rotation.y = Math.PI;
    }
    this.playIdleLoop();
  }

  private playIdleLoop(): void {
    if (!this.strikerMixer) return;
    if (this.strikerIdleAction) {
      this.strikerIdleAction.reset();
      this.strikerIdleAction.setLoop(THREE.LoopRepeat, Infinity);
      this.strikerIdleAction.clampWhenFinished = false;
      this.strikerIdleAction.play();
      if (this.strikerKickAction && this.isKickPlaying) {
        this.strikerIdleAction.crossFadeFrom(
          this.strikerKickAction,
          CharacterActors.STRIKER_BLEND_SECONDS,
          false
        );
      } else {
        if (this.strikerKickAction) {
          this.strikerKickAction.fadeOut(CharacterActors.STRIKER_BLEND_SECONDS);
        }
        this.strikerIdleAction.fadeIn(CharacterActors.STRIKER_BLEND_SECONDS);
      }
      return;
    }
    if (this.strikerKickAction) {
      this.strikerKickAction.reset();
      this.strikerKickAction.play();
      this.strikerKickAction.paused = true;
      this.strikerMixer.update(0);
    }
  }
}
