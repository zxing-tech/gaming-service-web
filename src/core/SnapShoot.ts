import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createRenderer } from '../infra/Graphics';
import { HdrPipeline } from '../infra/HdrPipeline';
import {
  createPerspectiveCamera,
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_LOOKAT,
  BALL_FOLLOW_OFFSET,
  BALL_FOLLOW_LOOKAHEAD_Z,
  BALL_FOLLOW_LERP_IN,
  BALL_FOLLOW_LERP_OUT
} from '../infra/Camera';
import { configureSceneLighting } from '../infra/Lighting';
import { createPhysicsWorld } from '../physics/World';
import { createField } from '../environment/Field';
import type { Field } from '../environment/Field';
import { Ball } from '../entities/ball/Ball';
import { BallController } from '../entities/ball/BallController';
import { Goal } from '../entities/goal/Goal';
import { BALL_RADIUS, BALL_THEMES } from '../config/Ball';
import { GOAL_DEPTH } from '../config/Goal';

import { AudioManager } from '../infra/Audio';

import { InputController } from '../input/InputController';
import { executeShot } from '../shooting/ExecuteShot';
import { ShotType } from '../shooting/ShotAnalyzer';
import { CurveForceSystem } from '../shooting/CurveForceSystem';
import { debugNormalizedSwipe } from '../shooting/SwipeNormalizer';
import { debugShotAnalysis } from '../shooting/ShotAnalyzer';
import { debugShotParameters } from '../shooting/ShotParameters';
import { debugVelocity } from '../shooting/VelocityCalculator';
import { debugAngularVelocity } from '../shooting/SpinCalculator';
import { GameStateManager, GameState } from './GameStateManager';
import { GAME_CONFIG } from '../config/Game';
import { CategoryLogger } from '../utils/Logger';
import { DebugVisualizer } from '../debug/DebugVisualizer';
import { DifficultyManager } from './DifficultyManager';
import { AssetLoader } from './AssetLoader';
import { gameEventBus } from '../../app/lib/gameEventBus';
import { gameStateService } from './GameStateService';
import { CharacterActors } from '../entities/CharacterActors';
import { Jumbotron } from '../entities/Jumbotron';
import {
  DEFAULT_TIER_ID,
  getTierConfig,
  type TierDifficultyConfig,
  type TierId
} from '../config/TierDifficulty';
import {
  buildPrizeAwardResult,
  resolvePrizeTierConfig,
  type PrizeTierConfig
} from '../config/PrizeTiers';
export class SnapShoot {
  private readonly onScoreChange: (score: number) => void;
  private isNewRecord = false;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly hdrPipeline: HdrPipeline;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: CANNON.World;

  private readonly ball: Ball;
  private readonly ballController: BallController;
  private readonly characterActors: CharacterActors;
  private readonly goal: Goal;
  private readonly field: Field;
  private readonly jumbotron: Jumbotron;
  public readonly audio = new AudioManager();

  // Loggers
  private readonly gameLog = new CategoryLogger('Game');
  private readonly shootingLog = new CategoryLogger('Shooting');
  private readonly themeLog = new CategoryLogger('Theme');

  private readonly inputController: InputController;
  private readonly curveForceSystem = new CurveForceSystem();
  private pendingShotLaunch: {
    velocity: CANNON.Vec3;
    angularVelocity: CANNON.Vec3;
    analysis: any;
    predictedTargetX: number;
  } | null = null;

  private debugVisualizer!: DebugVisualizer;
  private difficultyManager!: DifficultyManager;
  private lastBounceSoundTime = 0;
  private score = 0;
  private shotResetTimer: number | null = null;
  private keeperCatchHandledForCurrentShot = false;
  private keeperShotProfile: {
    startMs: number;
    predictedTargetX: number;
    shotSpeed: number;
  } | null = null;
  private readonly preStepBallPosition = new CANNON.Vec3();
  private failCount = 0;
  private isPaused = false;


  private readonly stateManager = new GameStateManager(GameState.INITIALIZING);


  private get isShotInProgress(): boolean {
    return this.stateManager.isShotInProgress();
  }
  private set isShotInProgress(value: boolean) {
    if (value) {
      this.stateManager.setState(GameState.SHOOTING);
    } else if (this.stateManager.isShotInProgress()) {
      this.stateManager.setState(GameState.IDLE);
    }
  }

  private get hasScored(): boolean {
    return this.stateManager.is(GameState.SCORING);
  }
  private set hasScored(value: boolean) {
    if (value) {
      this.stateManager.setState(GameState.SCORING);
    } else if (this.stateManager.is(GameState.SCORING)) {
      this.stateManager.setState(GameState.IDLE);
    }
  }


  private readonly clock = new THREE.Clock();

  private isFollowingBall = false;
  private readonly cameraLookTarget = new THREE.Vector3().copy(DEFAULT_CAMERA_LOOKAT);
  private readonly cameraTargetPos = new THREE.Vector3();
  private readonly cameraLookScratch = new THREE.Vector3();

  private readonly handleResizeBound = () => this.handleResize();
  private readonly handleBallCollideBound = (event: { body: CANNON.Body }) => this.handleBallCollide(event);
  private readonly handleGoalCollisionBound = (event: { body: CANNON.Body }) => this.handleGoalCollision(event);
  private hasGameStarted = false;
  private touchGuideTimer: number | null = null;
  private touchGuideDeadlineMs = 0;
  private idleTimer: number | null = null;
  private idleTimerDeadlineMs = 0;
  private shotResetDeadlineMs = 0;
  private tierTimer: number | null = null;
  private tierTimerInterval: number | null = null;
  private tierTimerDeadlineMs = 0;
  private tierTimerTotalMs = 0;
  private pausedTierRemainingMs: number | null = null;
  private pausedIdleRemainingMs: number | null = null;
  private pausedShotResetRemainingMs: number | null = null;
  private pausedTouchGuideRemainingMs: number | null = null;
  private livesRemaining: number = GAME_CONFIG.session.totalLives;
  private activeTierConfig: TierDifficultyConfig = getTierConfig(DEFAULT_TIER_ID);
  private activePrizeTierConfig: PrizeTierConfig = resolvePrizeTierConfig(DEFAULT_TIER_ID);
  private assetLoader!: AssetLoader;

  constructor(
    canvas: HTMLCanvasElement,
    onScoreChange: (score: number) => void
  ) {
    this.onScoreChange = onScoreChange;

    // Modal Event Listeners
    gameEventBus.on('RESTART_GAME', () => this.restartGame());
    gameEventBus.on('CONTINUE_GIVE_UP', () => this.gameOver());
    gameEventBus.on('CONTINUE_GAME_SUCCESS', () => this.continueGame());
    
    gameEventBus.on('GAME_PAUSED', () => {
      this.isPaused = true;
      this.pauseAudio();
      this.pauseTimers();
    });

    gameEventBus.on('GAME_RESUMED', () => {
      this.isPaused = false;
      this.resumeAudio();
      this.resumeTimers();
    });

    gameEventBus.on('UNLOCK_AUDIO', () => {
      this.audio.unlockAudioContext();
    });

    gameEventBus.on('GAME_STARTED', () => {
      if (this.hasGameStarted) return;
      this.hasGameStarted = true;
      this.resetIdleTimer();
      this.resetTierTimer();
    });


    this.assetLoader = new AssetLoader({

      gameLog: this.gameLog,
      onAllAssetsLoaded: () => this.onAllAssetsLoaded()
    });



    void this.assetLoader.preloadAssets();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a22);
    this.renderer = createRenderer(canvas);
    this.camera = createPerspectiveCamera(canvas);
    this.hdrPipeline = new HdrPipeline(this.renderer, this.scene, this.camera);
    configureSceneLighting(this.scene);

    const { world, materials } = createPhysicsWorld();
    this.world = world;

    this.field = createField(this.scene, this.world, materials.ground, {
      goalDepth: GOAL_DEPTH
    });

    this.jumbotron = new Jumbotron(this.scene);

    this.ball = new Ball(this.world, materials.ball);
    this.ball.body.addEventListener('collide', this.handleBallCollideBound);
    this.ballController = new BallController(this.ball);
    this.characterActors = new CharacterActors(this.scene, THREE.DefaultLoadingManager);
    void this.characterActors.load();

    void this.ball.load(this.scene, THREE.DefaultLoadingManager).catch((error) => {
      this.gameLog.error('Failed to load ball model', error);
    });

    this.goal = new Goal(this.scene, this.world, materials.ball);
    this.goal.setNetAnimationEnabled(true);
    this.goal.bodies.sensor.addEventListener('collide', this.handleGoalCollisionBound);

    void this.audio.loadAll().then(() => {
      this.assetLoader.setAudioLoaded();
    }).catch((error) => {
      this.gameLog.warn('Failed to preload audio', error);
      this.assetLoader.setAudioLoaded();
    });


    this.inputController = new InputController(canvas, this.camera, {
      onShoot: (params) => this.handleShoot(params)
    });


    this.debugVisualizer = new DebugVisualizer({
      scene: this.scene,
      camera: this.camera,
      world: this.world,
      ball: this.ball,
      goal: this.goal,
      inputController: this.inputController,
      canvas,
    });


    this.difficultyManager = new DifficultyManager({
      scene: this.scene,
      world: this.world,
      gameLog: this.gameLog
    });
    this.applyTierDifficulty(gameStateService.getEffectiveTier());

    this.attachEventListeners();
    this.emitLivesChanged();
    this.resetBall();
    this.resetIdleTimer();
    this.animate();
  }

  private onAllAssetsLoaded(): void {

    this.stateManager.setState(GameState.IDLE);



  }

  private handleGoalCollision(event: { body: CANNON.Body }) {
    if (event.body !== this.ball.body) return;
    if (!this.isShotInProgress) return;
    if (this.hasScored) return;

    this.gameLog.info(`⚽ GOAL! Score: ${this.score + 1}`);

    this.score += 1;
    this.applyAutoTierByScore(this.score);
    this.updateScore(this.score);
    this.resetIdleTimer();
    gameEventBus.emit({ type: 'GOAL_SCORED', score: this.score });

    if (this.touchGuideTimer !== null) {
      clearTimeout(this.touchGuideTimer);
      this.touchGuideTimer = null;
    }
    gameEventBus.emit({ type: 'SHOW_TOUCH_GUIDE', show: false });
    this.hasScored = true;
    this.difficultyManager.stopAllTracking();
    const tempBallPosition = this.ballController.copyPositionToTemp();
    this.goal.triggerNetPulse(tempBallPosition, 1);

    const isNewRecord = this.isNewRecord;
    if (isNewRecord) {
      this.audio.playSound('record');
    } else {
      this.audio.playSound('goal');
    }

    if (isNewRecord) {
      this.field.adBoard.switchAdSet('record');
    } else {
      this.field.adBoard.switchAdSet('goal');
    }
    this.field.adBoard.startBlinking();

    this.inputController.clearSwipeTrailDisplay();
  }

  private handleBallCollide(event: { body: CANNON.Body }) {
    if (event.body === this.field.groundBody) {
      const now = performance.now();
      if (now - this.lastBounceSoundTime < GAME_CONFIG.bounceSound.cooldownMs) return;
      const vy = Math.abs(this.ball.body.velocity.y);
      if (vy < GAME_CONFIG.bounceSound.minVerticalSpeed) return;
      this.lastBounceSoundTime = now;


      const bounceSound = this.ball.getTheme().sounds?.bounce ?? 'bounce';
      this.audio.playSound(bounceSound);
    } else if (this.difficultyManager.getObstacles().some((obstacle) => obstacle.body === event.body)) {
      const hitObstacle = this.difficultyManager.getObstacles().find((obstacle) => obstacle.body === event.body);
      if (hitObstacle?.blueprintId === 'keeperWall') {
        // Direct physics contact with keeper always counts as a save.
        this.handleKeeperCatch(false);
      } else {
        this.audio.playSound('save');
      }
    } else if (
      event.body === this.goal.bodies.leftPost ||
      event.body === this.goal.bodies.rightPost ||
      event.body === this.goal.bodies.rearLeftPost ||
      event.body === this.goal.bodies.rearRightPost ||
      event.body === this.goal.bodies.topLeftBar ||
      event.body === this.goal.bodies.topRightBar ||
      event.body === this.goal.bodies.floorLeft ||
      event.body === this.goal.bodies.floorRight ||
      event.body === this.goal.bodies.floorBack ||
      event.body === this.goal.bodies.crossbar
    ) {
      this.audio.playSound('post');
    } else if (this.goal.isNetCollider(event.body)) {
      this.goal.handleNetCollision(this.ball.body);
      this.audio.playSound('net');
    }
  }

  private handleKeeperCatch(applySideLock = true): void {
    if (!this.isShotInProgress || this.hasScored || this.keeperCatchHandledForCurrentShot) return;

    const keeper = this.difficultyManager
      .getObstacles()
      .find((obstacle) => obstacle.blueprintId === 'keeperWall');
    if (!keeper) return;

    // Side lock: if keeper commits to one dive side, opposite-side ball contact should not become a "catch".
    if (applySideLock) {
      const diveSide = keeper.getKeeperCommittedDiveSide();
      if (diveSide !== 0) {
        const dx = this.ball.body.position.x - keeper.body.position.x;
        const deadZone = 0.4;
        const ballSide = dx > deadZone ? 1 : dx < -deadZone ? -1 : 0;
        if (ballSide !== 0 && ballSide !== diveSide) {
          const movingAway = this.ball.body.velocity.x * ballSide > 0;
          if (movingAway) return;
        }
      }
    }

    this.keeperCatchHandledForCurrentShot = true;
    this.audio.playSound('save');

    // Keeper catch: absorb shot momentum so the ball is secured.
    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);
    this.ball.body.force.set(0, 0, 0);
    this.ball.body.torque.set(0, 0, 0);

    this.curveForceSystem.stopCurveShot();

    this.inputController.clearSwipeTrailDisplay();

    // Quick reset after save feels like an actual catch.
    if (this.shotResetTimer !== null) {
      clearTimeout(this.shotResetTimer);
    }
    this.pausedShotResetRemainingMs = null;
    this.shotResetDeadlineMs = performance.now() + 700;
    this.shotResetTimer = window.setTimeout(() => {
      this.resetAfterShot();
    }, 700);
  }

  private attachEventListeners() {
    window.addEventListener('resize', this.handleResizeBound);


  }

  private handleResize() {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.hdrPipeline.setSize(width, height);
    this.debugVisualizer.handleResize(width, height);
    this.field.resizeGroundLogoForViewport();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    if (this.isPaused) return;

    // Kick / pending launch first so ball velocity exists before integration.
    this.characterActors.update(deltaTime, this.ball.body.position, this.isShotInProgress);
    this.flushPendingShotLaunch();
    // Curve forces then kinematic obstacles (keeper) must match the frame *before* world.step,
    // otherwise the ball is integrated against the keeper's previous pose and can tunnel.
    this.curveForceSystem.update(deltaTime, this.ball.body);
    this.difficultyManager.getObstacles().forEach((obstacle) => obstacle.update(deltaTime));
    this.preStepBallPosition.copy(this.ball.body.position);
    const ballSpeed = this.ball.body.velocity.length();
    const dynamicSubsteps =
      ballSpeed > 20 ? 16 : ballSpeed > 10 ? 8 : GAME_CONFIG.physics.substeps;
    this.world.step(GAME_CONFIG.physics.timeStep, deltaTime, dynamicSubsteps);
    this.tryKeeperProximityCatch(this.preStepBallPosition);
    this.goal.update(deltaTime);
    this.field.update(deltaTime);

    this.ball.syncVisuals();
    this.updateCameraFollow(deltaTime);
    this.debugVisualizer.updateColliderVisuals();
    this.debugVisualizer.updateSwipeDebugLine();

    this.hdrPipeline.render();
  };

  private updateCameraFollow(deltaTime: number): void {
    const lerpBase = this.isFollowingBall ? BALL_FOLLOW_LERP_IN : BALL_FOLLOW_LERP_OUT;
    // Frame-rate independent smoothing: matches `lerpBase` per frame at 60fps, decays from there.
    const t = 1 - Math.pow(1 - lerpBase, deltaTime * 60);

    if (this.isFollowingBall) {
      const ballPos = this.ball.body.position;
      this.cameraTargetPos.set(
        ballPos.x + BALL_FOLLOW_OFFSET.x,
        ballPos.y + BALL_FOLLOW_OFFSET.y,
        ballPos.z + BALL_FOLLOW_OFFSET.z
      );
      this.cameraLookScratch.set(ballPos.x, ballPos.y, ballPos.z + BALL_FOLLOW_LOOKAHEAD_Z);
    } else {
      this.cameraTargetPos.copy(DEFAULT_CAMERA_POSITION);
      this.cameraLookScratch.copy(DEFAULT_CAMERA_LOOKAT);
    }

    this.camera.position.lerp(this.cameraTargetPos, t);
    this.cameraLookTarget.lerp(this.cameraLookScratch, t);
    this.camera.lookAt(this.cameraLookTarget);
  }

  /**
   * Fallback catch window so diving/body-block animations reliably translate into saves
   * even when high-speed contact events are missed by discrete collision steps.
   */
  private tryKeeperProximityCatch(preStepBallPos: CANNON.Vec3): void {
    if (!this.isShotInProgress || this.hasScored || this.keeperCatchHandledForCurrentShot) return;

    const keeper = this.difficultyManager
      .getObstacles()
      .find((obstacle) => obstacle.blueprintId === 'keeperWall');
    if (!keeper) return;

    const shot = this.keeperShotProfile;
    if (!shot) return;
    const ballPos = this.ball.body.position;
    const keeperX = keeper.getKeeperPatrolX();
    const keeperZ = keeper.body.position.z;
    const keeperFeetY = keeper.body.position.y;
    const isFastShot = shot.shotSpeed > 12;
    if (!isFastShot) {
      const elapsedMs = performance.now() - shot.startMs;
      const reactionDelayMs = THREE.MathUtils.clamp(120 - shot.shotSpeed * 1.5, 40, 120);
      if (elapsedMs < reactionDelayMs) return;
    }

    const diveSide = keeper.getKeeperCommittedDiveSide();
    const upperCX = diveSide === 0 ? keeperX : keeperX + diveSide * 0.48;
    const upperCY = keeperFeetY + 1.05;
    const upperCZ = keeperZ;
    const upperHXDiveSide = 0.85 + BALL_RADIUS;
    const upperHXOtherSide = 0.18 + BALL_RADIUS;
    const upperHY = 0.75 + BALL_RADIUS;
    const upperHZ = 0.45 + BALL_RADIUS;

    const lowerCX = diveSide === 0 ? keeperX : keeperX + diveSide * 0.22;
    const lowerCY = keeperFeetY + 0.4;
    const lowerCZ = keeperZ;
    const lowerHXDiveSide = 0.5 + BALL_RADIUS;
    const lowerHXOtherSide = 0.18 + BALL_RADIUS;
    const lowerHY = 0.42 + BALL_RADIUS;
    const lowerHZ = 0.45 + BALL_RADIUS;

    const inUpper = (px: number, py: number, pz: number) => {
      const dx = px - upperCX;
      const maxDx = diveSide === 0
        ? upperHXDiveSide
        : (Math.sign(dx) === diveSide ? upperHXDiveSide : upperHXOtherSide);
      return Math.abs(dx) <= maxDx &&
        py >= upperCY - upperHY &&
        py <= upperCY + upperHY &&
        Math.abs(pz - upperCZ) <= upperHZ;
    };
    const inLower = (px: number, py: number, pz: number) => {
      const dx = px - lowerCX;
      const maxDx = diveSide === 0
        ? lowerHXDiveSide
        : (Math.sign(dx) === diveSide ? lowerHXDiveSide : lowerHXOtherSide);
      return Math.abs(dx) <= maxDx &&
        py >= lowerCY - lowerHY &&
        py <= lowerCY + lowerHY &&
        Math.abs(pz - lowerCZ) <= lowerHZ;
    };
    const inBody = (px: number, py: number, pz: number) => inUpper(px, py, pz) || inLower(px, py, pz);

    if (
      inBody(ballPos.x, ballPos.y, ballPos.z) ||
      inBody(preStepBallPos.x, preStepBallPos.y, preStepBallPos.z)
    ) {
      this.handleKeeperCatch(false);
      return;
    }

    const segDx = ballPos.x - preStepBallPos.x;
    const segDy = ballPos.y - preStepBallPos.y;
    const segDz = ballPos.z - preStepBallPos.z;
    const segLenSq = segDx * segDx + segDy * segDy + segDz * segDz;
    if (segLenSq > 1e-6) {
      const sweepTest = (cx: number, cy: number, cz: number): boolean => {
        const relX = preStepBallPos.x - cx;
        const relY = preStepBallPos.y - cy;
        const relZ = preStepBallPos.z - cz;
        const t = THREE.MathUtils.clamp(
          -(relX * segDx + relY * segDy + relZ * segDz) / segLenSq,
          0,
          1
        );
        return inBody(
          preStepBallPos.x + segDx * t,
          preStepBallPos.y + segDy * t,
          preStepBallPos.z + segDz * t
        );
      };

      if (
        sweepTest(upperCX, upperCY, upperCZ) ||
        sweepTest(lowerCX, lowerCY, lowerCZ)
      ) {
        this.handleKeeperCatch(false);
      }
    }
  }

  public destroy() {
    if (this.shotResetTimer !== null) {
      clearTimeout(this.shotResetTimer);
    }
    if (this.touchGuideTimer !== null) {
      clearTimeout(this.touchGuideTimer);
    }
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
    }
    this.clearTierTimer();
    window.removeEventListener('resize', this.handleResizeBound);
    this.inputController.destroy();
    this.goal.bodies.sensor.removeEventListener('collide', this.handleGoalCollisionBound);
    this.ball.body.removeEventListener('collide', this.handleBallCollideBound);
    this.characterActors.reset();
    this.debugVisualizer.dispose();
    this.difficultyManager.dispose();
    this.difficultyManager.dispose();
    this.hdrPipeline.dispose();


    this.audio.stopMusic();
  }

  /**

   */
  public setMusicEnabled(enabled: boolean): void {
    this.audio.setMusicEnabled(enabled);
  }

  /**

   */
  public setSfxEnabled(enabled: boolean): void {
    this.audio.setSfxEnabled(enabled);
  }

  /**

   */
  public setMasterVolume(volume: number): void {
    this.audio.setMasterVolume(volume);
  }

  /** Auto tier ramp by current run score. */
  private resolveTierByScore(score: number): TierId {
    // 2 tiers: Medium (0–19), Hard (20+)
    if (score >= 20) return 3;
    return 1;
  }

  private applyAutoTierByScore(score: number): void {
    const nextTier = this.resolveTierByScore(score);
    if (this.activeTierConfig.tierId === nextTier) return;
    this.applyTierDifficulty(nextTier);
    this.gameLog.info(`🎚️ Auto-tier switched at score ${score}: ${this.activeTierConfig.difficultyName}`);
  }

  public applyTierDifficulty(tierId: TierId): void {
    this.activeTierConfig = getTierConfig(tierId);
    this.activePrizeTierConfig = resolvePrizeTierConfig(tierId);
    this.difficultyManager.setTier(tierId);
    this.resetTierTimer();
    gameEventBus.emit({
      type: 'TIER_CHANGED',
      tierId: this.activeTierConfig.tierId,
      difficultyName: this.activeTierConfig.difficultyName
    });
    this.gameLog.info(
      `🎚️ Applied ${this.activeTierConfig.tierName} (${this.activeTierConfig.difficultyName})`
    );
  }

  private updateScore(newScore: number): void {
    this.onScoreChange(newScore);
    this.jumbotron.setScore(newScore);
    gameEventBus.emit({ type: 'SCORE_CHANGED', score: newScore });

    const bestScore = gameStateService.getBestScore();
    if (newScore > bestScore) {
      this.isNewRecord = true;
      gameStateService.setBestScore(newScore);
      gameEventBus.emit({ type: 'BEST_SCORE_UPDATED', bestScore: newScore });
    }
  }

  public getScore(): number {
    return this.score;
  }

  public resetNewRecordFlag(): void {
    this.isNewRecord = false;
  }

  public toggleDebugMode(enabled?: boolean): boolean {
    this.debugVisualizer.toggleDebugMode(enabled);
    this.debugVisualizer.applyDebugVisibility(this.difficultyManager.getObstacles());
    if (this.debugVisualizer.isDebugMode()) {
      this.debugVisualizer.updateColliderVisuals();
    }
    const isEnabled = this.debugVisualizer.isDebugMode();
    gameEventBus.emit({ type: 'DEBUG_MODE_CHANGED', enabled: isEnabled });
    return isEnabled;
  }

  /**

   */
  private handleShoot(params: { swipeData: any; worldPositions: THREE.Vector3[] | null }): void {
    const { swipeData } = params;


    const shot = executeShot(swipeData, this.activeTierConfig.tierId);


    this.shootingLog.debug(debugNormalizedSwipe(shot.debugInfo.normalized));
    this.shootingLog.debug(debugShotAnalysis(shot.debugInfo.analysis));
    this.shootingLog.debug(debugShotParameters(shot.debugInfo.shotParams));
    this.shootingLog.debug(debugVelocity(shot.velocity));
    this.shootingLog.debug(debugAngularVelocity(shot.angularVelocity));

    if (shot.shotType !== ShotType.INVALID) {
      this.debugVisualizer.setTargetMarkerPosition(shot.targetPosition);



      const speed = Math.sqrt(
        shot.velocity.x ** 2 +
        shot.velocity.y ** 2 +
        shot.velocity.z ** 2
      );

      gameEventBus.emit({
        type: 'SHOT_INFO_UPDATED',
        data: {
          type: shot.debugInfo.analysis.type,
          power: shot.debugInfo.analysis.power,
          curveAmount: shot.debugInfo.analysis.curveAmount,
          curveDirection: shot.debugInfo.analysis.curveDirection,
          heightFactor: shot.debugInfo.analysis.heightFactor,
          speed,
          targetPosition: {
            x: shot.debugInfo.shotParams.targetPosition.x,
            y: shot.debugInfo.shotParams.targetPosition.y
          }
        }
      });

      this.executeShooting(
        shot.velocity.clone(),
        shot.angularVelocity.clone(),
        shot.debugInfo.analysis,
        shot.targetPosition.x
      );
    }
  }

  /**

   */
  private executeShooting(
    velocity: CANNON.Vec3,
    angularVelocity: CANNON.Vec3,
    analysis: any,
    predictedTargetX: number
  ) {

    if (this.isShotInProgress) return;
    this.resetIdleTimer();


    this.isShotInProgress = true;
    this.keeperCatchHandledForCurrentShot = false;
    this.hasScored = false;
    // Hide swipe ribbon as soon as shot is committed.
    this.inputController.clearSwipeTrailDisplay();


    this.characterActors.triggerKick();
    // Trigger keeper reaction on the same kick-start frame (not after ball launch).
    const keeper = this.difficultyManager.getObstacles().find((o) => o.blueprintId === 'keeperWall');
    const shotSpeed = Math.sqrt(
      velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
    );
    this.keeperShotProfile = {
      startMs: performance.now(),
      predictedTargetX,
      shotSpeed
    };
    keeper?.setKeeperPredictedTargetX(predictedTargetX);
    keeper?.setKeeperIncomingShotSpeed(shotSpeed);
    keeper?.prepareKeeperForIncomingShot();
    keeper?.setKeeperMovementArmed(true);

    this.pendingShotLaunch = { velocity, angularVelocity, analysis, predictedTargetX };

    if (this.touchGuideTimer !== null) {
      clearTimeout(this.touchGuideTimer);
      this.touchGuideTimer = null;
    }
    gameEventBus.emit({ type: 'SHOW_TOUCH_GUIDE', show: false });
  }

  private flushPendingShotLaunch(): void {
    if (!this.pendingShotLaunch) return;
    if (!this.characterActors.hasReachedKickContactMoment()) return;

    const { velocity, angularVelocity, analysis } = this.pendingShotLaunch;
    this.pendingShotLaunch = null;

    // Kick contact frame: enable physics and launch in same tick for tighter sync.
    this.ballController.prepareBallForShot();

    this.ball.body.velocity.copy(velocity);
    this.ball.body.angularVelocity.copy(angularVelocity);
    this.curveForceSystem.startCurveShot(analysis);
    this.isFollowingBall = true;
    gameEventBus.emit({ type: 'CINEMATIC_CAMERA_CHANGED', active: true });
    if (this.keeperShotProfile) {
      // Start keeper reaction timing when ball actually leaves foot.
      this.keeperShotProfile.startMs = performance.now();
    }

    this.difficultyManager.getObstacles().forEach((obstacle) => obstacle.startTracking());

    this.pausedShotResetRemainingMs = null;
    this.shotResetDeadlineMs = performance.now() + this.activeTierConfig.shotResetMs;
    this.shotResetTimer = window.setTimeout(() => {
      this.resetAfterShot();
    }, this.activeTierConfig.shotResetMs);
  }

  /**

   */
  private resetAfterShot() {
    console.log('Reset after shot - Scored:', this.hasScored);

    this.inputController.clearSwipeTrailDisplay();

    if (!this.hasScored) {

      this.audio.playSound('reset');


      this.failCount++;
      this.livesRemaining = Math.max(0, this.livesRemaining - 1);
      this.emitLivesChanged();
      console.log(`⚠️ Missed! Lives left: ${this.livesRemaining}/${GAME_CONFIG.session.totalLives}`);

      if (this.livesRemaining <= 0) {
        this.gameOver();
        return;
      }
    }


    this.resetBall();


    this.debugVisualizer.hideTargetMarker();


    this.isShotInProgress = false;
    this.hasScored = false;
    this.shotResetTimer = null;
    this.pendingShotLaunch = null;
    this.keeperCatchHandledForCurrentShot = false;
    this.keeperShotProfile = null;


    this.curveForceSystem.stopCurveShot();
  }

  /**

   */
  private resetBall() {

    if (this.isFollowingBall) {
      this.isFollowingBall = false;
      gameEventBus.emit({ type: 'CINEMATIC_CAMERA_CHANGED', active: false });
    }
    this.ballController.resetBall();
    this.characterActors.reset();

    this.applyAutoTierByScore(this.score);

    this.difficultyManager.resetAllTracking();
    this.difficultyManager.updateDifficulty(this.score, true);
    // Keeper centered / idle until the next kick; mixer still ticks while tracking is off.
    this.difficultyManager.stopAllTracking();
    this.difficultyManager
      .getObstacles()
      .find((o) => o.blueprintId === 'keeperWall')
      ?.resetKeeperBetweenRounds();
    this.difficultyManager.setColliderDebugVisible(this.debugVisualizer.isDebugMode());

    this.field.adBoard.stopBlinking();
    this.field.adBoard.switchAdSet('default');

    if (this.score === 0) {
      this.pausedTouchGuideRemainingMs = null;
      this.touchGuideDeadlineMs = performance.now() + GAME_CONFIG.timing.touchGuideDelayMs;
      this.touchGuideTimer = window.setTimeout(() => {
        gameEventBus.emit({ type: 'SHOW_TOUCH_GUIDE', show: true });
      }, GAME_CONFIG.timing.touchGuideDelayMs);
    }
  }

  /**

   */
  public continueGame(): void {
    console.log('▶️ Continue game');


    this.gameLog.info('Continue disabled for 3-life session rule');




    this.isShotInProgress = false;
    this.hasScored = false;
    this.pendingShotLaunch = null;


    this.curveForceSystem.stopCurveShot();


    this.debugVisualizer.hideTargetMarker();


    this.ballController.resetBallOnly();


    this.difficultyManager.resetAllTracking();

    console.log('✅ Continue complete');
  }


  /**

   */
  public restartGame(): void {
    console.log('🔄 Restart game');
    this.resetTierTimer();

    if (this.shotResetTimer !== null) {
      clearTimeout(this.shotResetTimer);
      this.shotResetTimer = null;
    }

    this.score = 0;
    this.applyAutoTierByScore(this.score);
    this.updateScore(this.score);
    this.resetNewRecordFlag();

    this.failCount = 0;
    this.livesRemaining = GAME_CONFIG.session.totalLives;
    this.emitLivesChanged();
    this.resetIdleTimer();


    this.isShotInProgress = false;
    this.hasScored = false;
    this.pendingShotLaunch = null;


    this.curveForceSystem.stopCurveShot();


    this.debugVisualizer.hideTargetMarker();


    this.resetBall();

    console.log('✅ Restart complete');
  }

  /**

   */
  public gameOver(): void {
    console.log('💀 Game over');
    this.clearTierTimer();


    const finalScore = this.score;
    const prizeAward = buildPrizeAwardResult(this.activePrizeTierConfig.tierId, finalScore);
    gameEventBus.emit({
      type: 'PRIZE_AWARDED',
      score: finalScore,
      tierId: prizeAward.tierId,
      tierName: prizeAward.tierName,
      prizePoolLabel: prizeAward.prizePoolLabel,
      topPrizeReached: prizeAward.topPrizeReached,
      topPrizePoints: prizeAward.topPrizePoints,
      topPrizeCode: prizeAward.topPrizeCode,
      topPrizeLabel: prizeAward.topPrizeLabel
    });


    const tokenId = `${prizeAward.topPrizeCode}-${Date.now().toString(36).toUpperCase()}`;
    gameEventBus.emit({
      type: 'SHOW_GAME_OVER_MODAL',
      score: finalScore,
      points: finalScore,
      tokenId,
      redeemedReward: prizeAward.topPrizeLabel
    });

    this.score = 0;
    this.applyAutoTierByScore(this.score);
    this.updateScore(this.score);
    this.resetNewRecordFlag();

    this.failCount = 0;
    this.livesRemaining = GAME_CONFIG.session.totalLives;
    this.emitLivesChanged();
    this.resetIdleTimer();


    this.resetBall();
    this.pendingShotLaunch = null;

    console.log('✅ Game over handling complete');
  }

  /**

   */
  public async switchToNextTheme(): Promise<void> {
    const currentTheme = this.ball.getTheme();
    const themeKeys = Object.keys(BALL_THEMES) as Array<keyof typeof BALL_THEMES>;
    const currentIndex = themeKeys.findIndex(key => BALL_THEMES[key].name === currentTheme.name);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    const nextTheme = BALL_THEMES[themeKeys[nextIndex]];

    this.themeLog.info(`🎨 Switching theme: ${currentTheme.name} -> ${nextTheme.name}`);

    try {
      await this.ball.changeTheme(nextTheme);
      this.themeLog.info(`✅ Theme switched to: ${nextTheme.name}`);
    } catch (error) {
      this.themeLog.error('Failed to switch theme:', error);
    }
  }

  /**

   */
  public async switchToTheme(themeName: string): Promise<void> {
    const themeKeys = Object.keys(BALL_THEMES) as Array<keyof typeof BALL_THEMES>;
    const themeKey = themeKeys.find(key => BALL_THEMES[key].name === themeName);

    if (!themeKey) {
      this.themeLog.error(`Theme '${themeName}' not found`);
      return;
    }

    const newTheme = BALL_THEMES[themeKey];
    const currentTheme = this.ball.getTheme();

    if (currentTheme.name === newTheme.name) {
      this.themeLog.info(`Already using theme: ${themeName}`);
      return;
    }

    this.themeLog.info(`🎨 Switching to theme: ${themeName}`);

    try {
      await this.ball.changeTheme(newTheme);
      this.themeLog.info(`✅ Theme switched to: ${newTheme.name}`);
    } catch (error) {
      this.themeLog.error('Failed to switch theme:', error);
    }
  }

  /**

   */
  public pauseAudio(): void {
    this.audio.pauseAll();
  }

  /**

   */
  public resumeAudio(): void {
    this.audio.resumeAll();
  }

  private emitLivesChanged(): void {
    gameEventBus.emit({
      type: 'LIVES_CHANGED',
      livesRemaining: this.livesRemaining,
      totalLives: GAME_CONFIG.session.totalLives
    });
  }

  private resetIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.pausedIdleRemainingMs = null;
    if (!this.hasGameStarted) return;
    this.startIdleTimer(this.activeTierConfig.idleTimeoutMs);
  }

  private startIdleTimer(remainingMs: number): void {
    this.idleTimerDeadlineMs = performance.now() + remainingMs;
    this.idleTimer = window.setTimeout(() => {
      this.gameLog.info('⏱️ Session ended due to inactivity');
      this.gameOver();
    }, remainingMs);
  }

  private clearTierTimer(): void {
    if (this.tierTimer !== null) {
      clearTimeout(this.tierTimer);
      this.tierTimer = null;
    }
    if (this.tierTimerInterval !== null) {
      clearInterval(this.tierTimerInterval);
      this.tierTimerInterval = null;
    }
    this.tierTimerDeadlineMs = 0;
    this.tierTimerTotalMs = 0;
    this.pausedTierRemainingMs = null;
  }

  private resetTierTimer(): void {
    this.clearTierTimer();
    if (!this.hasGameStarted) return;
    const totalMs = this.activeTierConfig.tierDurationMs;
    this.tierTimerTotalMs = totalMs;
    this.startTierTimer(totalMs, totalMs);
  }

  private startTierTimer(remainingMs: number, totalMs: number): void {
    this.tierTimerDeadlineMs = performance.now() + remainingMs;
    this.tierTimerTotalMs = totalMs;
    this.emitTierTimerUpdated(remainingMs, totalMs);
    this.tierTimerInterval = window.setInterval(() => {
      if (this.tierTimerDeadlineMs <= 0) return;
      const r = Math.max(0, Math.ceil(this.tierTimerDeadlineMs - performance.now()));
      this.emitTierTimerUpdated(r, totalMs);
      if (r <= 0 && this.tierTimerInterval !== null) {
        clearInterval(this.tierTimerInterval);
        this.tierTimerInterval = null;
      }
    }, 250);
    this.tierTimer = window.setTimeout(() => {
      this.gameLog.info(
        `⏱️ ${this.activeTierConfig.tierName} timer completed. Ending current run.`
      );
      this.gameOver();
    }, remainingMs);
  }

  private pauseTimers(): void {
    const now = performance.now();

    if (this.tierTimer !== null) {
      this.pausedTierRemainingMs = Math.max(0, this.tierTimerDeadlineMs - now);
      clearTimeout(this.tierTimer);
      this.tierTimer = null;
    }
    if (this.tierTimerInterval !== null) {
      clearInterval(this.tierTimerInterval);
      this.tierTimerInterval = null;
    }

    if (this.idleTimer !== null) {
      this.pausedIdleRemainingMs = Math.max(0, this.idleTimerDeadlineMs - now);
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.shotResetTimer !== null) {
      this.pausedShotResetRemainingMs = Math.max(0, this.shotResetDeadlineMs - now);
      clearTimeout(this.shotResetTimer);
      this.shotResetTimer = null;
    }

    if (this.touchGuideTimer !== null) {
      this.pausedTouchGuideRemainingMs = Math.max(0, this.touchGuideDeadlineMs - now);
      clearTimeout(this.touchGuideTimer);
      this.touchGuideTimer = null;
    }
  }

  private resumeTimers(): void {
    if (this.pausedTierRemainingMs !== null) {
      const remaining = this.pausedTierRemainingMs;
      this.pausedTierRemainingMs = null;
      this.startTierTimer(remaining, this.tierTimerTotalMs || this.activeTierConfig.tierDurationMs);
    }

    if (this.pausedIdleRemainingMs !== null) {
      const remaining = this.pausedIdleRemainingMs;
      this.pausedIdleRemainingMs = null;
      this.startIdleTimer(remaining);
    }

    if (this.pausedShotResetRemainingMs !== null) {
      const remaining = this.pausedShotResetRemainingMs;
      this.pausedShotResetRemainingMs = null;
      this.shotResetDeadlineMs = performance.now() + remaining;
      this.shotResetTimer = window.setTimeout(() => {
        this.resetAfterShot();
      }, remaining);
    }

    if (this.pausedTouchGuideRemainingMs !== null) {
      const remaining = this.pausedTouchGuideRemainingMs;
      this.pausedTouchGuideRemainingMs = null;
      this.touchGuideDeadlineMs = performance.now() + remaining;
      this.touchGuideTimer = window.setTimeout(() => {
        gameEventBus.emit({ type: 'SHOW_TOUCH_GUIDE', show: true });
      }, remaining);
    }
  }

  private emitTierTimerUpdated(remainingMs: number, totalMs: number): void {
    gameEventBus.emit({
      type: 'TIER_TIMER_UPDATED',
      tierId: this.activeTierConfig.tierId,
      remainingMs,
      totalMs
    });
  }

}
