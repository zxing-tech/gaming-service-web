/**
 * AssetLoader - 에셋 로딩 관리 클래스
 *
 * Three.js와 오디오 에셋 로딩을 추적하고 진행률을 관리합니다:
 * - Three.js DefaultLoadingManager 이벤트 처리
 * - 오디오 로딩 진행률 추적
 * - 통합 로딩 진행률 계산 (Three.js 85% + Audio 15%)
 * - 로딩 완료 시 콜백 실행
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gameEventBus } from '../../app/lib/gameEventBus';
import { CategoryLogger } from '../utils/Logger';
import { BALL_THEMES } from '../config/Ball';
import { OBSTACLE_BLUEPRINTS } from '../config/Obstacles';
import { PLAYERS_CONFIG } from '../config/Players';
import { getAssetPath } from '../utils/assetPath';

const grassColorUrl = getAssetPath('/assets/grass/Grass005_1K-JPG_Color.jpeg');
const crowdTextureUrl = getAssetPath('/assets/crowd/crowd.webp');

/**
 * AssetLoader 생성자 매개변수
 */
export interface AssetLoaderConfig {

  gameLog: CategoryLogger;
  onAllAssetsLoaded: () => void;
}

/**
 * 에셋 로딩 관리 클래스
 */
export class AssetLoader {

  private readonly gameLog: CategoryLogger;
  private readonly onAllAssetsLoaded: () => void;

  private threeAssetsProgress = 0;
  private audioProgress = 0;
  private isGameReady = false;

  constructor(config: AssetLoaderConfig) {

    this.gameLog = config.gameLog;
    this.onAllAssetsLoaded = config.onAllAssetsLoaded;
  }

  /**
   * 모든 Ball 테마와 Obstacle 에셋을 프리로드
   * 각 단계별로 진행도를 업데이트하여 부드러운 로딩 경험 제공
   *
   * 새로운 Ball 테마나 Obstacle을 추가할 때:
   * - BALL_THEMES에 추가하면 자동으로 프리로드됨
   * - OBSTACLE_BLUEPRINTS에 추가하면 자동으로 프리로드됨
   */
  public async preloadAssets(): Promise<void> {
    const gltfLoader = new GLTFLoader(THREE.DefaultLoadingManager);
    const textureLoader = new THREE.TextureLoader(THREE.DefaultLoadingManager);
    const imageLoader = new THREE.ImageLoader(THREE.DefaultLoadingManager);

    // 전체 에셋 개수 계산
    const ballThemes = Object.values(BALL_THEMES);
    const obstacleBlueprints = Object.values(OBSTACLE_BLUEPRINTS);

    const ballModelCount = ballThemes.length;
    const ballImageCount = ballThemes.length;
    const obstacleModelCount = obstacleBlueprints.filter(b => b.render.kind === 'model').length;
    const obstacleTextureCount = obstacleBlueprints.filter(
      b => b.render.kind === 'primitive' && b.render.material?.textureUrl
    ).length;
    const playerModelCount = 2;
    const environmentTextureCount = 2; // 잔디 + 관중석

    const totalAssets =
      ballModelCount +
      ballImageCount +
      obstacleModelCount +
      obstacleTextureCount +
      playerModelCount +
      environmentTextureCount;
    let loadedAssets = 0;

    // 진행도 업데이트 헬퍼
    const updateProgress = () => {
      loadedAssets++;
      // Three.js 에셋은 전체의 85% 비중
      const progress = (loadedAssets / totalAssets) * 0.85;
      this.threeAssetsProgress = Math.min(progress, 0.85);
      this.gameLog.info(`Asset ${loadedAssets}/${totalAssets} loaded, progress: ${(progress * 100).toFixed(1)}%`);
      this.updateLoadingProgress();
    };

    const loadPromises: Promise<unknown>[] = [];

    // 모든 Ball 테마 프리로드 (GLB + PNG)
    ballThemes.forEach((theme) => {
      // GLB 모델 로드
      loadPromises.push(
        gltfLoader.loadAsync(theme.modelUrl)
          .then(() => updateProgress())
          .catch((error) => {
            this.gameLog.warn(`Failed to preload ball model: ${theme.name}`, error);
            updateProgress();
          })
      );

      // PNG 이미지 로드
      loadPromises.push(
        imageLoader.loadAsync(theme.imageUrl)
          .then(() => updateProgress())
          .catch((error) => {
            this.gameLog.warn(`Failed to preload ball image: ${theme.name}`, error);
            updateProgress();
          })
      );
    });

    // 모든 Obstacle 에셋 프리로드
    obstacleBlueprints.forEach((blueprint) => {
      const render = blueprint.render;

      // 모델 파일 로드
      if (render.kind === 'model') {
        loadPromises.push(
          gltfLoader.loadAsync(render.assetUrl)
            .then(() => updateProgress())
            .catch((error) => {
              this.gameLog.warn(`Failed to preload obstacle model: ${blueprint.id}`, error);
              updateProgress();
            })
        );
      }

      // 텍스처 파일 로드
      if (render.kind === 'primitive' && render.material?.textureUrl) {
        loadPromises.push(
          textureLoader.loadAsync(render.material.textureUrl)
            .then(() => updateProgress())
            .catch((error) => {
              this.gameLog.warn(`Failed to preload obstacle texture: ${blueprint.id}`, error);
              updateProgress();
            })
        );
      }
    });

    // 플레이어 캐릭터 모델 프리로드 (키커 + 골키퍼)
    [PLAYERS_CONFIG.kicker.assetUrl, PLAYERS_CONFIG.goalkeeper.assetUrl].forEach((assetUrl) => {
      loadPromises.push(
        gltfLoader.loadAsync(assetUrl)
          .then(() => updateProgress())
          .catch((error) => {
            this.gameLog.warn(`Failed to preload player model: ${assetUrl}`, error);
            updateProgress();
          })
      );
    });

    // 환경 텍스처 프리로드 (잔디, 관중석)
    loadPromises.push(
      textureLoader.loadAsync(grassColorUrl)
        .then(() => updateProgress())
        .catch((error) => {
          this.gameLog.warn('Failed to preload grass texture', error);
          updateProgress();
        })
    );

    loadPromises.push(
      textureLoader.loadAsync(crowdTextureUrl)
        .then(() => updateProgress())
        .catch((error) => {
          this.gameLog.warn('Failed to preload crowd texture', error);
          updateProgress();
        })
    );

    // 모든 프리로드 완료 대기
    await Promise.all(loadPromises);
    this.gameLog.info('All assets preloaded successfully');
  }


  /**
   * 통합 로딩 진행률 업데이트
   */
  private updateLoadingProgress(): void {
    // threeAssetsProgress는 이미 0~0.85 범위, audioProgress는 0~1 범위
    const combined = Math.min(this.threeAssetsProgress + this.audioProgress * 0.15, 1);
    gameEventBus.emit({ type: 'LOADING_PROGRESS', progress: combined });

    if (!this.isGameReady && this.threeAssetsProgress >= 0.85 && this.audioProgress >= 1) {
      this.handleAllAssetsLoaded();
    }
  }

  /**
   * 모든 에셋 로딩 완료 처리
   */
  private handleAllAssetsLoaded(): void {
    this.isGameReady = true;
    this.gameLog.info('All assets loaded, game ready!');
    gameEventBus.emit({ type: 'LOADING_COMPLETE' });
    this.onAllAssetsLoaded();
  }

  /**
   * 오디오 로딩 완료 설정
   */
  public setAudioLoaded(): void {
    this.gameLog.info('Audio loading completed, updating progress');
    this.audioProgress = 1;
    this.updateLoadingProgress();
    this.gameLog.info(`Final progress: three=${this.threeAssetsProgress}, audio=${this.audioProgress}`);
  }

  /**
   * 게임 준비 상태 확인
   */
  public isReady(): boolean {
    return this.isGameReady;
  }
}
