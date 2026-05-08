import type * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { PLAYERS_CONFIG } from '../config/Players';

export class CharacterActors {
  private static readonly STRIKER_IDLE_OFFSET_X = -0.26;
  private static readonly STRIKER_IDLE_OFFSET_Z = 1.18;
  // Fallback idle hold frame on kick clip when dedicated idle clip is unavailable.
  private static readonly FALLBACK_IDLE_NORMALIZED_TIME = 0.08;
  // Trigger ball launch at early contact frame of this kick animation.
  private static readonly KICK_CONTACT_NORMALIZED_TIME = 0.28;
  private static readonly STRIKER_BLEND_SECONDS = 0.1;
  private readonly scene: THREE.Scene;
  private readonly loadingManager: THREE.LoadingManager;
  private strikerRoot: THREE.Object3D | null = null;
  private strikerIdleRoot: THREE.Object3D | null = null;
  private strikerMixer: THREE.AnimationMixer | null = null;
  private strikerIdleMixer: THREE.AnimationMixer | null = null;
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

      // Prefer an idle clip from the same FBX rig (most reliable).
      const inlineIdleClip = root.animations.find((clip, idx) => {
        if (idx === 0) return false;
        const n = clip.name.toLowerCase();
        return n.includes('idle') || n.includes('stand');
      });
      if (inlineIdleClip && this.strikerMixer && this.strikerRoot) {
        const idleAction = this.strikerMixer.clipAction(inlineIdleClip, this.strikerRoot);
        idleAction.enabled = true;
        idleAction.setLoop(THREE.LoopRepeat, Infinity);
        idleAction.clampWhenFinished = false;
        idleAction.play();
        this.strikerIdleAction = idleAction;
      }

      // Strong fallback: load external idle FBX as a separate actor/root.
      // This avoids rig-mismatch T-pose because we don't retarget animations across rigs.
      if (!this.strikerIdleAction && PLAYERS_CONFIG.kicker.idleAssetUrl) {
        try {
          const idleRoot = await loader.loadAsync(encodeURI(PLAYERS_CONFIG.kicker.idleAssetUrl));
          idleRoot.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = false;
              child.receiveShadow = false;
              if (child.material instanceof THREE.MeshStandardMaterial && child.material.map) {
                child.material.map.colorSpace = THREE.SRGBColorSpace;
              }
            }
          });
          idleRoot.scale.setScalar(0.0085);
          idleRoot.rotation.y = Math.PI;
          idleRoot.visible = false;
          this.scene.add(idleRoot);
          this.strikerIdleRoot = idleRoot;

          this.strikerIdleMixer = new THREE.AnimationMixer(idleRoot);
          const idleClip = idleRoot.animations[0];
          if (idleClip) {
            const idleAction = this.strikerIdleMixer.clipAction(idleClip, idleRoot);
            idleAction.enabled = true;
            idleAction.setLoop(THREE.LoopRepeat, Infinity);
            idleAction.clampWhenFinished = false;
            idleAction.play();
          }
        } catch (error) {
          console.warn('[CharacterActors] Failed to load external striker idle actor', error);
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
      const x = ballPosition.x + CharacterActors.STRIKER_IDLE_OFFSET_X;
      const y = 0;
      const z = ballPosition.z + CharacterActors.STRIKER_IDLE_OFFSET_Z;
      this.strikerRoot.position.set(
        ballPosition.x + CharacterActors.STRIKER_IDLE_OFFSET_X,
        0,
        ballPosition.z + CharacterActors.STRIKER_IDLE_OFFSET_Z
      );
      if (this.strikerIdleRoot) {
        this.strikerIdleRoot.position.set(x, y, z);
      }
      if (!this.isKickPlaying) {
        this.strikerRoot.rotation.y = Math.PI;
        if (this.strikerIdleRoot) this.strikerIdleRoot.rotation.y = Math.PI;
      }
    }

    if (this.strikerMixer) {
      const dt = Math.min(Math.max(deltaTime, 0), 0.05);
      this.strikerMixer.update(dt);
      this.strikerIdleMixer?.update(dt);
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

    // If we are switching from external idle actor, keep transforms aligned
    // before showing kick actor.
    if (this.strikerIdleRoot) {
      this.strikerRoot.position.copy(this.strikerIdleRoot.position);
      this.strikerRoot.quaternion.copy(this.strikerIdleRoot.quaternion);
    }

    this.strikerKickAction.reset();
    this.strikerKickAction.paused = false;
    this.strikerKickAction.setLoop(THREE.LoopOnce, 1);
    this.strikerKickAction.clampWhenFinished = true;
    this.strikerKickAction.fadeIn(CharacterActors.STRIKER_BLEND_SECONDS).play();
    // Pre-warm one tiny step before making the kick rig visible to avoid
    // a one-frame bind/T-pose flash at swipe time.
    this.strikerKickAction.time = 0.02;
    this.strikerMixer.update(0);

    this.strikerRoot.visible = true;
    if (this.strikerIdleRoot) this.strikerIdleRoot.visible = false;

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
    // Avoid hard stop() because it can briefly snap to bind/T-pose
    // before idle fallback is applied.
    if (this.strikerRoot) {
      this.strikerRoot.rotation.y = Math.PI;
    }
    this.playIdleLoop();
  }

  private playIdleLoop(): void {
    if (!this.strikerMixer) return;
    if (this.strikerIdleRoot) {
      this.strikerIdleRoot.visible = true;
      if (this.strikerRoot) this.strikerRoot.visible = false;
      return;
    }
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
      // Fallback when idle clip is unavailable: hold a pre-kick neutral frame
      // so striker looks idle both before and after kick.
      const duration = this.strikerKickAction.getClip().duration;
      this.strikerKickAction.enabled = true;
      this.strikerKickAction.play();
      this.strikerKickAction.time = THREE.MathUtils.clamp(
        duration * CharacterActors.FALLBACK_IDLE_NORMALIZED_TIME,
        0,
        Math.max(duration - 0.02, 0)
      );
      this.strikerKickAction.paused = true;
      this.strikerKickAction.clampWhenFinished = true;
      this.strikerMixer.update(0);
    }
  }
}
