import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AD_BOARD_CONFIG, type AdItem, type AdTextItem } from '../config/AdBoard';

export class AdBoard {
  public readonly mesh: THREE.Mesh;
  public readonly body: CANNON.Body;

  private readonly material: THREE.MeshStandardMaterial;
  private canvasTexture: THREE.CanvasTexture | null = null;
  private scrollOffset = 0;
  private currentAdSet: 'default' | 'goal' | 'record' = 'default';
  private autoResetTimer: number | null = null;
  private isBlinking = false;
  private blinkTimer = 0;
  private readonly blinkInterval = 0.2;
  private isInverted = false;
  private readonly adImageCache = new Map<string, HTMLImageElement>();
  private readonly adImageLoading = new Set<string>();

  constructor(scene: THREE.Scene, world: CANNON.World, depth: number) {
    this.material = new THREE.MeshStandardMaterial({
      roughness: AD_BOARD_CONFIG.material.roughness,
      metalness: AD_BOARD_CONFIG.material.metalness,
      emissive: new THREE.Color(AD_BOARD_CONFIG.material.emissive),
      emissiveIntensity: AD_BOARD_CONFIG.material.emissiveIntensity
    });

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        AD_BOARD_CONFIG.size.width,
        AD_BOARD_CONFIG.size.height,
        AD_BOARD_CONFIG.size.depth
      ),
      this.material
    );
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.position.set(AD_BOARD_CONFIG.position.x, AD_BOARD_CONFIG.position.y, depth);
    scene.add(this.mesh);

    this.body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          AD_BOARD_CONFIG.size.width / 2,
          AD_BOARD_CONFIG.size.height / 2,
          AD_BOARD_CONFIG.size.depth / 2
        )
      ),
      position: new CANNON.Vec3(
        AD_BOARD_CONFIG.position.x,
        AD_BOARD_CONFIG.position.y,
        depth
      )
    });
    world.addBody(this.body);

    this.createAdTexture();
  }

  update(deltaTime: number) {
    if (!this.canvasTexture) return;


    this.scrollOffset = (this.scrollOffset - deltaTime * AD_BOARD_CONFIG.scrollSpeed) % 1;
    this.canvasTexture.offset.x = this.scrollOffset;


    if (this.isBlinking) {
      this.blinkTimer += deltaTime;
      if (this.blinkTimer >= this.blinkInterval) {
        this.blinkTimer = 0;
        this.isInverted = !this.isInverted;
        this.createAdTexture();
      }
    }
  }

  reset() {
    this.scrollOffset = 0;
    if (this.canvasTexture) {
      this.canvasTexture.offset.x = 0;
    }
  }

  /**

   */
  startBlinking() {
    this.isBlinking = true;
    this.blinkTimer = 0;
    this.isInverted = false;
  }

  /**

   */
  stopBlinking() {
    this.isBlinking = false;
    this.blinkTimer = 0;
    this.isInverted = false;
    this.createAdTexture();
  }

  /**



   */
  switchAdSet(adSetName: 'default' | 'goal' | 'record', autoResetMs = 0) {
    if (this.currentAdSet === adSetName) return;


    if (this.autoResetTimer !== null) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }

    this.currentAdSet = adSetName;
    this.createAdTexture();


    if (autoResetMs > 0 && adSetName !== 'default') {
      this.autoResetTimer = window.setTimeout(() => {
        this.currentAdSet = 'default';
        this.createAdTexture();
        this.autoResetTimer = null;
      }, autoResetMs);
    }
  }

  /**

   */
  private createAdTexture() {
    const ads = AD_BOARD_CONFIG.adSets[this.currentAdSet];


    const canvases = ads.map(ad => this.createAdCanvas(ad));


    this.combineCanvases(canvases);
  }


  /**

   */
  private createAdCanvas(config: AdItem): HTMLCanvasElement {
    if (config.kind === 'image') {
      return this.createImageAd(config.imageUrl, config.backgroundColor);
    }
    return this.createTextAd(config);
  }

  private createTextAd(config: AdTextItem): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = AD_BOARD_CONFIG.canvas.width;
    canvas.height = AD_BOARD_CONFIG.canvas.height;
    const ctx = canvas.getContext('2d')!;


    const bgColor = this.isInverted ? config.textColor : config.backgroundColor;
    const txtColor = this.isInverted ? config.backgroundColor : config.textColor;


    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    const fontWeight = config.fontWeight || 'bold';
    const fontFamily = config.fontFamily || 'Arial, sans-serif';
    ctx.font = `${fontWeight} ${config.fontSize}px ${fontFamily}`;
    ctx.fillStyle = txtColor;
    ctx.textAlign = config.textAlign || 'center';
    ctx.textBaseline = 'middle';


    const x = config.textAlign === 'left'
      ? 20
      : config.textAlign === 'right'
      ? canvas.width - 20
      : canvas.width / 2;

    ctx.fillText(config.text, x, canvas.height / 2);

    return canvas;
  }

  private createImageAd(imageUrl: string, backgroundColor = '#000000'): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = AD_BOARD_CONFIG.canvas.width;
    canvas.height = AD_BOARD_CONFIG.canvas.height;
    const ctx = canvas.getContext('2d')!;


    const bg = this.isInverted ? '#FFFFFF' : backgroundColor;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cached = this.adImageCache.get(imageUrl);
    if (cached) {
      const maxW = canvas.width * 0.98;
      const maxH = canvas.height * 0.98;
      const scale = Math.min(
        maxW / Math.max(cached.width, 1),
        maxH / Math.max(cached.height, 1)
      );
      const targetW = cached.width * scale;
      const targetH = cached.height * scale;
      const x = (canvas.width - targetW) * 0.5;
      const y = (canvas.height - targetH) * 0.5;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cached, x, y, targetW, targetH);
      return canvas;
    }

    if (!this.adImageLoading.has(imageUrl)) {
      this.adImageLoading.add(imageUrl);
      const img = new Image();
      img.onload = () => {
        this.adImageCache.set(imageUrl, img);
        this.adImageLoading.delete(imageUrl);
        this.createAdTexture();
      };
      img.onerror = () => {
        this.adImageLoading.delete(imageUrl);
      };
      img.src = imageUrl;
    }

    return canvas;
  }

  /**

   */
  private combineCanvases(canvases: HTMLCanvasElement[]) {
    if (canvases.length === 0) return;

    const canvasWidth = AD_BOARD_CONFIG.canvas.width;
    const canvasHeight = AD_BOARD_CONFIG.canvas.height;


    const combined = document.createElement('canvas');
    combined.width = canvasWidth * canvases.length;
    combined.height = canvasHeight;
    const ctx = combined.getContext('2d');
    if (!ctx) return;


    canvases.forEach((canvas, index) => {
      ctx.drawImage(canvas, canvasWidth * index, 0, canvasWidth, canvasHeight);
    });


    const preservedOffset = this.scrollOffset;


    const texture = new THREE.CanvasTexture(combined);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(AD_BOARD_CONFIG.display.repeatX, AD_BOARD_CONFIG.display.repeatY);


    if (this.canvasTexture) {
      this.canvasTexture.dispose();
    }

    this.canvasTexture = texture;
    this.material.map = texture;
    this.material.needsUpdate = true;


    this.scrollOffset = preservedOffset;
    this.canvasTexture.offset.x = preservedOffset;
  }

  /**

   */
  destroy() {
    if (this.autoResetTimer !== null) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }

    if (this.canvasTexture) {
      this.canvasTexture.dispose();
      this.canvasTexture = null;
    }
  }
}
