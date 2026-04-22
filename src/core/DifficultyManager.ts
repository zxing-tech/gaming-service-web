/**

 *




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

 */
export interface DifficultyManagerConfig {
  scene: THREE.Scene;
  world: CANNON.World;
  gameLog: CategoryLogger;
}

/**

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
      position: { x: 0, y: 0, z: -5.35 },
    },
    behavior: {
      type: 'static',
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

   */
  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  /**

   */
  public getCurrentDifficulty(): DifficultyLevelConfig | null {
    return this.currentDifficulty;
  }

  /**

   */
  public updateDifficulty(_score: number, forceRefresh = false): void {
    const tierConfig = getTierConfig(this.currentTier);
    const nextDifficulty = getDifficultyForScore(tierConfig.difficultyAnchorScore);
    const levelChanged = this.currentDifficulty !== nextDifficulty;

    if (forceRefresh || levelChanged) {
      const goalkeeperConfig: ObstacleInstanceConfig = {
        ...this.goalkeeperConfig,
        behavior: { type: 'static' },
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

   */
  private syncObstacles(configs: ObstacleInstanceConfig[]): void {

    if (this.obstacles.length > configs.length) {
      for (let i = configs.length; i < this.obstacles.length; i++) {
        this.obstacles[i].dispose();
      }
      this.obstacles.length = configs.length;
    }


    configs.forEach((config, index) => {
      let obstacle = this.obstacles[index];
      if (!obstacle || obstacle.blueprintId !== config.blueprintId) {

        if (obstacle) {
          obstacle.dispose();
        }
        const blueprintId = config.blueprintId;
        const blueprint = this.resolveBlueprint(blueprintId);
        obstacle = new Obstacle(this.scene, this.world, blueprint, config);
        this.obstacles[index] = obstacle;
      } else {

        obstacle.configure(config);
      }
      obstacle.startTracking();
    });

    this.obstacles.length = configs.length;
  }

  /**

   */
  private resolveBlueprint(id: string): ObstacleBlueprint {
    const blueprint = getObstacleBlueprint(id);
    if (!blueprint) {
      throw new Error(`Unknown obstacle blueprint: ${id}`);
    }
    return blueprint;
  }

  /**

   */
  public setColliderDebugVisible(visible: boolean): void {
    this.obstacles.forEach((obstacle) => obstacle.setColliderDebugVisible(visible));
  }

  /**

   */
  public stopAllTracking(): void {
    this.obstacles.forEach((obstacle) => obstacle.stopTracking());
  }

  /**

   */
  public resetAllTracking(): void {
    this.obstacles.forEach((obstacle) => obstacle.resetTracking());
  }

  /**

   */
  public dispose(): void {
    this.obstacles.forEach((obstacle) => obstacle.dispose());
    this.obstacles = [];
    this.currentDifficulty = null;
  }
}
