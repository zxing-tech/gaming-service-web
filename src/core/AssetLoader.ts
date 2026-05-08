
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gameEventBus } from '../../app/lib/gameEventBus';
import { CategoryLogger } from '../utils/Logger';
import { BALL_THEMES } from '../config/Ball';
import { OBSTACLE_BLUEPRINTS } from '../config/Obstacles';
import { PLAYERS_CONFIG } from '../config/Players';
import { getAssetPath } from '../utils/assetPath';

/** GLB obstacles — load on first spawn instead of blocking initial load. */
const DEFERRED_OBSTACLE_MODEL_IDS = new Set([
  'drum',
  'shark',
  'van',
  'cokeBottle'
]);

const grassColorUrl = getAssetPath('/assets/grass/Grass005_1K-JPG_Color.jpeg');
const crowdTextureUrl = getAssetPath('/assets/crowd/Gemini_Generated_Image_a8cqxoa8cqxoa8cq.png');


export interface AssetLoaderConfig {

  gameLog: CategoryLogger;
  onAllAssetsLoaded: () => void;
}


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


  public async preloadAssets(): Promise<void> {
    const gltfLoader = new GLTFLoader(THREE.DefaultLoadingManager);
    const fbxLoader = new FBXLoader(THREE.DefaultLoadingManager);
    const textureLoader = new THREE.TextureLoader(THREE.DefaultLoadingManager);


    const ballThemes = Object.values(BALL_THEMES);
    const obstacleBlueprints = Object.values(OBSTACLE_BLUEPRINTS);

    const ballModelCount = ballThemes.length;
    const ballImageCount = 0;
    let obstacleModelAssetCount = 0;
    obstacleBlueprints.forEach((b) => {
      if (b.render.kind !== 'model') return;
      if (DEFERRED_OBSTACLE_MODEL_IDS.has(b.id)) return;
      const r = b.render;
      obstacleModelAssetCount +=
        r.sourceFormat === 'fbx' ? 1 + (r.extraAnimationUrls?.length ?? 0) : 1;
    });
    const obstacleTextureCount = obstacleBlueprints.filter(
      b => b.render.kind === 'primitive' && b.render.material?.textureUrl
    ).length;
    const kickerAssetCount =
      1 +
      (PLAYERS_CONFIG.kicker.idleAssetUrl ? 1 : 0);
    const playerModelCount = kickerAssetCount;
    const environmentTextureCount = 2;

    const totalAssets =
      ballModelCount +
      ballImageCount +
      obstacleModelAssetCount +
      obstacleTextureCount +
      playerModelCount +
      environmentTextureCount;
    let loadedAssets = 0;


    const updateProgress = () => {
      loadedAssets++;

      const progress = (loadedAssets / totalAssets) * 0.85;
      this.threeAssetsProgress = Math.min(progress, 0.85);
      this.gameLog.info(`Asset ${loadedAssets}/${totalAssets} loaded, progress: ${(progress * 100).toFixed(1)}%`);
      this.updateLoadingProgress();
    };

    const loadPromises: Promise<unknown>[] = [];


    ballThemes.forEach((theme) => {
      const ballModelLoader = theme.sourceFormat === 'fbx' ? fbxLoader : gltfLoader;
      const modelUrl = theme.sourceFormat === 'fbx' ? encodeURI(theme.modelUrl) : theme.modelUrl;
      loadPromises.push(
        ballModelLoader.loadAsync(modelUrl)
          .then(() => updateProgress())
          .catch((error) => {
            this.gameLog.warn(`Failed to preload ball model: ${theme.name}`, error);
            updateProgress();
          })
      );


      // UI thumbnail only — skip to speed first load (single ball mode).
    });


    obstacleBlueprints.forEach((blueprint) => {
      const render = blueprint.render;


      if (render.kind === 'model' && DEFERRED_OBSTACLE_MODEL_IDS.has(blueprint.id)) {
        return;
      }

      if (render.kind === 'model') {
        const urls =
          render.sourceFormat === 'fbx'
            ? [render.assetUrl, ...(render.extraAnimationUrls ?? [])]
            : [render.assetUrl];
        const loader = render.sourceFormat === 'fbx' ? fbxLoader : gltfLoader;
        urls.forEach((url) => {
          loadPromises.push(
            loader.loadAsync(encodeURI(url))
              .then(() => updateProgress())
              .catch((error) => {
                this.gameLog.warn(`Failed to preload obstacle model: ${blueprint.id} ${url}`, error);
                updateProgress();
              })
          );
        });
      }


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


    const kickerIsFbx = PLAYERS_CONFIG.kicker.sourceFormat === 'fbx';
    const kickerLoader = kickerIsFbx ? fbxLoader : gltfLoader;
    const kickerUrl = kickerIsFbx
      ? encodeURI(PLAYERS_CONFIG.kicker.assetUrl)
      : PLAYERS_CONFIG.kicker.assetUrl;
    loadPromises.push(
      kickerLoader.loadAsync(kickerUrl)
        .then(() => updateProgress())
        .catch((error) => {
          this.gameLog.warn(`Failed to preload kicker model`, error);
          updateProgress();
        })
    );
    if (kickerIsFbx && PLAYERS_CONFIG.kicker.idleAssetUrl) {
      loadPromises.push(
        fbxLoader.loadAsync(encodeURI(PLAYERS_CONFIG.kicker.idleAssetUrl))
          .then(() => updateProgress())
          .catch((error) => {
            this.gameLog.warn(`Failed to preload kicker idle model`, error);
            updateProgress();
          })
      );
    }
    // Goalkeeper FBX is already loaded via keeperWall blueprint (same files).

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


    await Promise.all(loadPromises);
    this.gameLog.info('All assets preloaded successfully');
  }


  /**

   */
  private updateLoadingProgress(): void {

    const combined = Math.min(this.threeAssetsProgress + this.audioProgress * 0.15, 1);
    gameEventBus.emit({ type: 'LOADING_PROGRESS', progress: combined });

    if (!this.isGameReady && this.threeAssetsProgress >= 0.85 && this.audioProgress >= 1) {
      this.handleAllAssetsLoaded();
    }
  }

  /**

   */
  private handleAllAssetsLoaded(): void {
    this.isGameReady = true;
    this.gameLog.info('All assets loaded, game ready!');
    gameEventBus.emit({ type: 'LOADING_COMPLETE' });
    this.onAllAssetsLoaded();
  }

  /**

   */
  public setAudioLoaded(): void {
    this.gameLog.info('Audio loading completed, updating progress');
    this.audioProgress = 1;
    this.updateLoadingProgress();
    this.gameLog.info(`Final progress: three=${this.threeAssetsProgress}, audio=${this.audioProgress}`);
  }

  /**

   */
  public isReady(): boolean {
    return this.isGameReady;
  }
}
