/**
 * DifficultyManager - 난이도 및 장애물 관리 클래스
 *
 * 점수에 따른 난이도 조정 및 장애물 생성/관리를 담당합니다:
 * - 점수에 따른 난이도 레벨 자동 조정
 * - 장애물 생성/제거/업데이트
 * - 블루프린트 기반 장애물 인스턴스 생성
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Obstacle } from '../entities/Obstacle';
import { composeObstacles, getDifficultyForScore, type DifficultyLevelConfig } from '../config/Difficulty';
import { getObstacleBlueprint } from '../config/Obstacles';
import type { ObstacleBlueprint, ObstacleInstanceConfig } from '../config/Obstacles';
import { CategoryLogger } from '../utils/Logger';
import { DEFAULT_TIER_ID, getTierConfig, type TierId } from '../config/TierDifficulty';

/**
 * DifficultyManager 생성자 매개변수
 */
export interface DifficultyManagerConfig {
  scene: THREE.Scene;
  world: CANNON.World;
  gameLog: CategoryLogger;
}

/**
 * 난이도 및 장애물 관리 클래스
 */
export class DifficultyManager {
  private readonly scene: THREE.Scene;
  private readonly world: CANNON.World;
  private readonly gameLog: CategoryLogger;

  private obstacles: Obstacle[] = [];
  private currentDifficulty: DifficultyLevelConfig | null = null;
  private currentTier: TierId = DEFAULT_TIER_ID;
  private readonly goalkeeperConfig: ObstacleInstanceConfig = {
    blueprintId: 'keeperWall',
    transform: {
      position: { x: 0, y: 1.0, z: -5.25 },
    },
    behavior: {
      type: 'patrol',
      axis: 'x',
      range: [-1.45, 1.45],
      speed: 1.8,
      waveform: 'sine',
    },
  };

  constructor(config: DifficultyManagerConfig) {
    this.scene = config.scene;
    this.world = config.world;
    this.gameLog = config.gameLog;
  }

  public setTier(tierId: TierId): void {
    this.currentTier = tierId;
  }

  public getTier(): TierId {
    return this.currentTier;
  }

  /**
   * 현재 장애물 목록 반환
   */
  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  /**
   * 현재 난이도 설정 반환
   */
  public getCurrentDifficulty(): DifficultyLevelConfig | null {
    return this.currentDifficulty;
  }

  /**
   * 난이도 업데이트 (점수에 따라 자동 조정)
   */
  public updateDifficulty(_score: number, forceRefresh = false): void {
    const tierConfig = getTierConfig(this.currentTier);
    const nextDifficulty = getDifficultyForScore(tierConfig.difficultyAnchorScore);
    const levelChanged = this.currentDifficulty !== nextDifficulty;

    if (forceRefresh || levelChanged) {
      const goalkeeperConfig: ObstacleInstanceConfig = {
        ...this.goalkeeperConfig,
        behavior: {
          type: 'patrol',
          axis: 'x',
          range: [...tierConfig.keeperPatrolRange],
          speed: tierConfig.keeperPatrolSpeed,
          waveform: 'sine',
        },
      };

      const configs: ObstacleInstanceConfig[] = [goalkeeperConfig];
      const levelObstacles = this.extractLevelObstacles(nextDifficulty)
        .filter((obstacle) => obstacle.blueprintId !== 'keeperWall');

      if (tierConfig.additionalObstacleCount > 0 && levelObstacles.length > 0) {
        const selected = levelObstacles.slice(0, tierConfig.additionalObstacleCount);
        configs.push(...selected);
      }

      this.syncObstacles(configs);
      if (levelChanged) {
        this.gameLog.info(
          `🧤 Tier ${tierConfig.tierId}(${tierConfig.difficultyName}) applied with ${configs.length} obstacle(s)`
        );
      }
    }

    this.currentDifficulty = nextDifficulty;
  }

  private extractLevelObstacles(level: DifficultyLevelConfig): ObstacleInstanceConfig[] {
    if (level.obstacles && level.obstacles.length > 0) {
      return level.obstacles.map((obstacle) => ({
        ...obstacle,
        transform: obstacle.transform ? { ...obstacle.transform } : undefined,
        collider: obstacle.collider ? { ...obstacle.collider } : undefined,
        behavior: obstacle.behavior ? { ...obstacle.behavior } : undefined,
      }));
    }
    if (level.composition) {
      return composeObstacles(level.composition);
    }
    return [];
  }

  /**
   * 장애물 동기화 (설정에 맞게 생성/제거/업데이트)
   */
  private syncObstacles(configs: ObstacleInstanceConfig[]): void {
    // 초과된 장애물 제거
    if (this.obstacles.length > configs.length) {
      for (let i = configs.length; i < this.obstacles.length; i++) {
        this.obstacles[i].dispose();
      }
      this.obstacles.length = configs.length;
    }

    // 장애물 생성/업데이트
    configs.forEach((config, index) => {
      let obstacle = this.obstacles[index];
      if (!obstacle || obstacle.blueprintId !== config.blueprintId) {
        // 블루프린트가 다르면 새로 생성
        if (obstacle) {
          obstacle.dispose();
        }
        const blueprintId = config.blueprintId;
        const blueprint = this.resolveBlueprint(blueprintId);
        obstacle = new Obstacle(this.scene, this.world, blueprint, config);
        this.obstacles[index] = obstacle;
      } else {
        // 같은 블루프린트면 설정만 업데이트
        obstacle.configure(config);
      }
      obstacle.startTracking();
    });

    this.obstacles.length = configs.length;
  }

  /**
   * 블루프린트 ID로 블루프린트 객체 찾기
   */
  private resolveBlueprint(id: string): ObstacleBlueprint {
    const blueprint = getObstacleBlueprint(id);
    if (!blueprint) {
      throw new Error(`Unknown obstacle blueprint: ${id}`);
    }
    return blueprint;
  }

  /**
   * 모든 장애물의 디버그 콜라이더 가시성 설정
   */
  public setColliderDebugVisible(visible: boolean): void {
    this.obstacles.forEach((obstacle) => obstacle.setColliderDebugVisible(visible));
  }

  /**
   * 모든 장애물의 추적 정지
   */
  public stopAllTracking(): void {
    this.obstacles.forEach((obstacle) => obstacle.stopTracking());
  }

  /**
   * 모든 장애물의 추적 리셋
   */
  public resetAllTracking(): void {
    this.obstacles.forEach((obstacle) => obstacle.resetTracking());
  }

  /**
   * 리소스 정리
   */
  public dispose(): void {
    this.obstacles.forEach((obstacle) => obstacle.dispose());
    this.obstacles = [];
    this.currentDifficulty = null;
  }
}
