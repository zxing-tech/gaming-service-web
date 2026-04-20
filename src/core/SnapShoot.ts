import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createRenderer } from '../infra/Graphics';
import { createPerspectiveCamera } from '../infra/Camera';
import { configureSceneLighting } from '../infra/Lighting';
import { createPhysicsWorld } from '../physics/World';
import { createField } from '../environment/Field';
import type { Field } from '../environment/Field';
import { Ball } from '../entities/ball/Ball';
import { BallController } from '../entities/ball/BallController';
import { Goal } from '../entities/goal/Goal';
import { BALL_THEMES } from '../config/Ball';
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
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world: CANNON.World;

  private readonly ball: Ball;
  private readonly ballController: BallController;
  private readonly goal: Goal;
  private readonly field: Field;
  public readonly audio = new AudioManager(); // public: unlockAudioContext() 접근 위해

  // Loggers
  private readonly gameLog = new CategoryLogger('Game');
  private readonly shootingLog = new CategoryLogger('Shooting');
  private readonly themeLog = new CategoryLogger('Theme');

  private readonly inputController: InputController;
  private readonly curveForceSystem = new CurveForceSystem();

  private debugVisualizer!: DebugVisualizer; // 초기화는 생성자에서 (의존성 필요)
  private difficultyManager!: DifficultyManager; // 초기화는 생성자에서 (의존성 필요)
  private lastBounceSoundTime = 0;
  private score = 0;
  private shotResetTimer: number | null = null;
  private failCount = 0; // 현재 게임에서 실패한 횟수
  private isPaused = false;

  // 게임 상태 관리자
  private readonly stateManager = new GameStateManager(GameState.INITIALIZING);

  // 기존 플래그들을 stateManager로 위임 (하위 호환성)
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

  // 🔍 궤적 추적
  private isTrackingBall = false;
  private trackingStartTime = 0;

  private readonly clock = new THREE.Clock();

  private readonly handleResizeBound = () => this.handleResize();
  private readonly handleBallCollideBound = (event: { body: CANNON.Body }) => this.handleBallCollide(event);
  private readonly handleGoalCollisionBound = (event: { body: CANNON.Body }) => this.handleGoalCollision(event);
  private touchGuideTimer: number | null = null;
  private idleTimer: number | null = null;
  private livesRemaining: number = GAME_CONFIG.session.totalLives;
  private activeTierConfig: TierDifficultyConfig = getTierConfig(DEFAULT_TIER_ID);
  private activePrizeTierConfig: PrizeTierConfig = resolvePrizeTierConfig(DEFAULT_TIER_ID);
  private assetLoader!: AssetLoader; // 초기화는 생성자에서 (의존성 필요)

  constructor(
    canvas: HTMLCanvasElement,
    onScoreChange: (score: number) => void
  ) {
    this.onScoreChange = onScoreChange;

    // Modal Event Listeners
    gameEventBus.on('RESTART_GAME', () => this.restartGame());
    gameEventBus.on('CONTINUE_GIVE_UP', () => this.gameOver());
    gameEventBus.on('CONTINUE_GAME_SUCCESS', () => this.continueGame());
    
    gameEventBus.on('THEME_CHANGED', (event: any) => {
      void this.switchToTheme(event.themeName);
    });

    gameEventBus.on('GAME_PAUSED', () => {
      this.isPaused = true;
      this.pauseAudio();
    });

    gameEventBus.on('GAME_RESUMED', () => {
      this.isPaused = false;
      this.resumeAudio();
    });

    gameEventBus.on('UNLOCK_AUDIO', () => {
      this.audio.unlockAudioContext();
    });

    // 에셋 로더 초기화
    this.assetLoader = new AssetLoader({

      gameLog: this.gameLog,
      onAllAssetsLoaded: () => this.onAllAssetsLoaded()
    });

    // 모든 Ball 테마와 Obstacle 에셋을 프리로드 (비동기로 시작)
    // preloadAssets()가 진행도를 직접 관리하므로 setupAssetLoadingTracker()는 불필요
    void this.assetLoader.preloadAssets();

    this.scene = new THREE.Scene();
    this.scene.background = null; // HTML 배경(빨강-녹색 그라디언트)이 보이도록 투명
    this.renderer = createRenderer(canvas);
    this.camera = createPerspectiveCamera();
    configureSceneLighting(this.scene);

    const { world, materials } = createPhysicsWorld();
    this.world = world;

    this.field = createField(this.scene, this.world, materials.ground, {
      goalDepth: GOAL_DEPTH
    });

    this.ball = new Ball(this.world, materials.ball);
    this.ball.body.addEventListener('collide', this.handleBallCollideBound);
    this.ballController = new BallController(this.ball);

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

    // 입력 컨트롤러 초기화
    this.inputController = new InputController(canvas, this.camera, {
      onShoot: (params) => this.handleShoot(params)
    });

    // 디버그 시각화 초기화
    this.debugVisualizer = new DebugVisualizer({
      scene: this.scene,
      camera: this.camera,
      world: this.world,
      ball: this.ball,
      goal: this.goal,
      inputController: this.inputController,

    });

    // 난이도 관리자 초기화
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
    // 게임 상태를 IDLE로 전환 (슈팅 가능)
    this.stateManager.setState(GameState.IDLE);

    // 로딩 화면은 사용자가 축구공을 스와이프할 때까지 대기
    // loadingScreen의 내부 로직에서 처리됨
  }

  private handleGoalCollision(event: { body: CANNON.Body }) {
    if (event.body !== this.ball.body) return;
    if (!this.isShotInProgress) return; // 슈팅 중이 아니면 무시
    if (this.hasScored) return; // 이미 골 처리했으면 무시 (중복 방지)

    this.gameLog.info(`⚽ GOAL! Score: ${this.score + 1}`);

    this.score += 1;
    this.updateScore(this.score);
    this.resetIdleTimer();

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

    // 광고판 효과: 최고 기록이면 record, 아니면 goal
    if (isNewRecord) {
      this.field.adBoard.switchAdSet('record');
    } else {
      this.field.adBoard.switchAdSet('goal');
    }
    this.field.adBoard.startBlinking();

    if (this.score >= this.activePrizeTierConfig.topPrizePoints) {
      this.gameLog.info(
        `🏆 Top prize reached: score=${this.score}, tier=${this.activePrizeTierConfig.tierName}, threshold=${this.activePrizeTierConfig.topPrizePoints}`
      );
      this.gameOver();
    }
  }

  private handleBallCollide(event: { body: CANNON.Body }) {
    if (event.body === this.field.groundBody) {
      const now = performance.now();
      if (now - this.lastBounceSoundTime < GAME_CONFIG.bounceSound.cooldownMs) return;
      const vy = Math.abs(this.ball.body.velocity.y);
      if (vy < GAME_CONFIG.bounceSound.minVerticalSpeed) return;
      this.lastBounceSoundTime = now;

      // 테마별 바운스 사운드 사용 (지정되지 않으면 기본 'bounce' 사용)
      const bounceSound = this.ball.getTheme().sounds?.bounce ?? 'bounce';
      this.audio.playSound(bounceSound);
    } else if (this.difficultyManager.getObstacles().some((obstacle) => obstacle.body === event.body)) {
      this.audio.playSound('save');
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

  private attachEventListeners() {
    window.addEventListener('resize', this.handleResizeBound);
    // InputController가 입력 이벤트를 관리
    // AudioContext unlock은 InputController의 SwipeTracker에서 처리
  }

  private handleResize() {
    // 전체 화면 크기로 리사이즈
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.debugVisualizer.handleResize(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    if (this.isPaused) return;

    // Tunneling 방지: 더 작은 timestep, 더 많은 substeps
    // 빠른 슛(40 m/s)도 얇은 골대(0.1m)와 정확히 충돌
    this.world.step(GAME_CONFIG.physics.timeStep, deltaTime, GAME_CONFIG.physics.substeps);
    this.curveForceSystem.update(deltaTime, this.ball.body);
    this.difficultyManager.getObstacles().forEach((obstacle) => obstacle.update(deltaTime));
    this.goal.update(deltaTime);
    this.field.update(deltaTime);

    // 궤적 추적 중지 체크 (디버그 로그는 제거됨)
    if (this.isTrackingBall) {
      const now = performance.now();
      const elapsed = (now - this.trackingStartTime) / 1000;
      if (elapsed > 1.0 || !this.isShotInProgress) {
        this.isTrackingBall = false;
      }
    }

    this.ball.syncVisuals();
    this.debugVisualizer.updateColliderVisuals();
    this.debugVisualizer.updateSwipeDebugLine();

    this.renderer.render(this.scene, this.camera);
  };

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
    window.removeEventListener('resize', this.handleResizeBound);
    this.inputController.destroy();
    this.goal.bodies.sensor.removeEventListener('collide', this.handleGoalCollisionBound);
    this.ball.body.removeEventListener('collide', this.handleBallCollideBound);
    this.debugVisualizer.dispose();
    this.difficultyManager.dispose();
    this.difficultyManager.dispose();

    // 배경음악 중지
    this.audio.stopMusic();
  }

  /**
   * 설정: 배경음악 on/off
   */
  public setMusicEnabled(enabled: boolean): void {
    this.audio.setMusicEnabled(enabled);
  }

  /**
   * 설정: 효과음 on/off
   */
  public setSfxEnabled(enabled: boolean): void {
    this.audio.setSfxEnabled(enabled);
  }

  /**
   * 설정: 마스터 볼륨 (0.0~1.0)
   */
  public setMasterVolume(volume: number): void {
    this.audio.setMasterVolume(volume);
  }

  public applyTierDifficulty(tierId: TierId): void {
    this.activeTierConfig = getTierConfig(tierId);
    this.activePrizeTierConfig = resolvePrizeTierConfig(tierId);
    this.difficultyManager.setTier(tierId);
    this.gameLog.info(
      `🎚️ Applied ${this.activeTierConfig.tierName} (${this.activeTierConfig.difficultyName})`
    );
  }

  private updateScore(newScore: number): void {
    this.onScoreChange(newScore);
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
   * 슈팅 처리 (InputController에서 호출)
   */
  private handleShoot(params: { swipeData: any; worldPositions: THREE.Vector3[] | null }): void {
    const { swipeData } = params;

    // 슈팅 파이프라인 실행
    const shot = executeShot(swipeData);

    // 디버그 정보 출력
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

      this.isTrackingBall = true;
      this.trackingStartTime = performance.now();

      this.executeShooting(shot.velocity, shot.angularVelocity, shot.debugInfo.analysis);
    }
  }

  /**
   * 슈팅 실행
   */
  private executeShooting(velocity: CANNON.Vec3, angularVelocity: CANNON.Vec3, analysis: any) {
    // 이미 슈팅 진행 중이면 무시
    if (this.isShotInProgress) return;
    this.resetIdleTimer();

    // 슈팅 상태 설정
    this.isShotInProgress = true;
    this.hasScored = false;

    this.ballController.prepareBallForShot();

    // 공의 velocity 설정
    this.ball.body.velocity.copy(velocity);

    // 공의 angular velocity (회전) 설정
    this.ball.body.angularVelocity.copy(angularVelocity);

    // 커브 힘 시스템 시작
    this.curveForceSystem.startCurveShot(analysis);

    this.difficultyManager.getObstacles().forEach((obstacle) => obstacle.startTracking());

    if (this.touchGuideTimer !== null) {
      clearTimeout(this.touchGuideTimer);
      this.touchGuideTimer = null;
    }
    gameEventBus.emit({ type: 'SHOW_TOUCH_GUIDE', show: false });

    // 2.5초 후 리셋 타이머 설정
    this.shotResetTimer = window.setTimeout(() => {
      this.resetAfterShot();
    }, this.activeTierConfig.shotResetMs);
  }

  /**
   * 슈팅 후 리셋
   */
  private resetAfterShot() {
    console.log('Reset after shot - Scored:', this.hasScored);

    // 골을 넣지 못했으면
    if (!this.hasScored) {
      // 실패시 항상 리셋 사운드
      this.audio.playSound('reset');

      // 미스 시 라이프 차감
      this.failCount++;
      this.livesRemaining = Math.max(0, this.livesRemaining - 1);
      this.emitLivesChanged();
      console.log(`⚠️ 실패! 남은 라이프: ${this.livesRemaining}/${GAME_CONFIG.session.totalLives}`);

      if (this.livesRemaining <= 0) {
        this.gameOver();
        return;
      }
    }

    // 공 및 환경 리셋 (난이도/광고판 포함)
    this.resetBall();

    // 타겟 마커 숨김
    this.debugVisualizer.hideTargetMarker();

    // 상태 초기화
    this.isShotInProgress = false;
    this.hasScored = false;
    this.shotResetTimer = null;

    // 커브 힘 시스템 중지
    this.curveForceSystem.stopCurveShot();
  }

  /**
   * 공을 초기 위치로 리셋
   */
  private resetBall() {
    // 공 리셋 (BallController에 위임)
    this.ballController.resetBall();

    // 게임 환경 리셋
    this.difficultyManager.resetAllTracking();
    this.difficultyManager.updateDifficulty(this.score, true);
    // Keeper should stand still until the next shot starts.
    this.difficultyManager.stopAllTracking();
    this.difficultyManager.setColliderDebugVisible(this.debugVisualizer.isDebugMode());

    this.field.adBoard.stopBlinking();
    this.field.adBoard.switchAdSet('default');

    if (this.score === 0) {
      this.touchGuideTimer = window.setTimeout(() => {
        gameEventBus.emit({ type: 'SHOW_TOUCH_GUIDE', show: true });
      }, GAME_CONFIG.timing.touchGuideDelayMs);
    }
  }

  /**
   * 게임 이어하기 (저장된 상태로 복원, 공만 원위치)
   */
  public continueGame(): void {
    console.log('▶️ 게임 이어하기');

    // 3-라이프 규칙에서는 continue를 제공하지 않음
    this.gameLog.info('Continue disabled for 3-life session rule');

    // 실패 카운트는 그대로 유지 (다시 실패하면 게임오버)

    // 상태 초기화
    this.isShotInProgress = false;
    this.hasScored = false;

    // 커브 힘 시스템 중지
    this.curveForceSystem.stopCurveShot();

    // 타겟 마커 숨김
    this.debugVisualizer.hideTargetMarker();

    // 공만 원위치로 (난이도와 점수는 유지)
    this.ballController.resetBallOnly();

    // 장애물은 리셋하지 않음 (난이도 유지)
    this.difficultyManager.resetAllTracking();

    console.log('✅ 게임 이어하기 완료');
  }


  /**
   * 게임을 처음부터 재시작 (점수 초기화 포함)
   */
  public restartGame(): void {
    console.log('🔄 게임 재시작');

    if (this.shotResetTimer !== null) {
      clearTimeout(this.shotResetTimer);
      this.shotResetTimer = null;
    }

    this.score = 0;
    this.updateScore(this.score);
    this.resetNewRecordFlag();

    this.failCount = 0;
    this.livesRemaining = GAME_CONFIG.session.totalLives;
    this.emitLivesChanged();
    this.resetIdleTimer();

    // 상태 초기화
    this.isShotInProgress = false;
    this.hasScored = false;

    // 커브 힘 시스템 중지
    this.curveForceSystem.stopCurveShot();

    // 타겟 마커 숨김
    this.debugVisualizer.hideTargetMarker();

    // 공 및 환경 리셋
    this.resetBall();

    console.log('✅ 게임 재시작 완료');
  }

  /**
   * 게임오버 처리 (점수 초기화)
   */
  public gameOver(): void {
    console.log('💀 게임오버');

    // 점수 저장 (모달 표시용)
    const finalScore = this.score;
    const prizeAward = buildPrizeAwardResult(this.activePrizeTierConfig.tierId, finalScore);
    gameEventBus.emit({
      type: 'PRIZE_AWARDED',
      score: finalScore,
      tierId: prizeAward.tierId,
      tierName: prizeAward.tierName,
      topPrizeReached: prizeAward.topPrizeReached,
      topPrizePoints: prizeAward.topPrizePoints,
      topPrizeCode: prizeAward.topPrizeCode,
      topPrizeLabel: prizeAward.topPrizeLabel
    });

    // 게임오버 모달 표시
    gameEventBus.emit({ type: 'SHOW_GAME_OVER_MODAL', score: finalScore });

    this.score = 0;
    this.updateScore(this.score);
    this.resetNewRecordFlag();

    this.failCount = 0;
    this.livesRemaining = GAME_CONFIG.session.totalLives;
    this.emitLivesChanged();
    this.resetIdleTimer();

    // 공 및 환경 리셋
    this.resetBall();

    console.log('✅ 게임오버 처리 완료');
  }

  /**
   * 다음 테마로 전환
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
   * 특정 테마로 전환
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
   * 모든 오디오 일시정지 (광고 재생 시 사용)
   */
  public pauseAudio(): void {
    this.audio.pauseAll();
  }

  /**
   * 모든 오디오 재개 (광고 종료 시 사용)
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
    }

    this.idleTimer = window.setTimeout(() => {
      this.gameLog.info('⏱️ Session ended due to inactivity');
      this.gameOver();
    }, this.activeTierConfig.idleTimeoutMs);
  }

}
