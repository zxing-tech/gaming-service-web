import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';

const LOGO_URL = getAssetPath('/assets/ads/image-white.png');

const CANVAS_SIZE = 1024;
const TOP_BANNER_CANVAS_W = 512;
const TOP_BANNER_CANVAS_H = 128;
const BG_COLOR = '#D31738';
const TOP_BANNER_BG_COLOR = '#B90E28';
const TEXT_COLOR = '#FFFFFF';
const BORDER_COLOR = '#0a0a0a';

function formatMsTimer(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface JumbotronOptions {
  width?: number;
  height?: number;
  position?: { x: number; y: number; z: number };
  /** Downward tilt in radians (positive = looks down toward the pitch). */
  tiltRadians?: number;
}

/**
 * In-world score jumbotron mounted behind the goal. Coca-Cola wordmark on top,
 * live score number below. Texture is a dynamic CanvasTexture redrawn on score change.
 */
export class Jumbotron {
  public readonly mesh: THREE.Mesh;
  public readonly shadowMesh: THREE.Mesh;
  public readonly topBannerMesh: THREE.Mesh;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly shadowTexture: THREE.CanvasTexture;
  private readonly shadowMaterial: THREE.MeshBasicMaterial;
  private readonly topBannerCanvas: HTMLCanvasElement;
  private readonly topBannerCtx: CanvasRenderingContext2D;
  private readonly topBannerTexture: THREE.CanvasTexture;
  private readonly topBannerMaterial: THREE.MeshBasicMaterial;
  private logoImage: HTMLImageElement | null = null;

  private currentScore = 0;
  private currentTimerMs = 60_000;

  constructor(scene: THREE.Scene, options: JumbotronOptions = {}) {
    const width = options.width ?? 2.4;
    const height = options.height ?? 2.4;
    const pos = options.position ?? { x: 0, y: 5.2, z: -12.2 };
    const tilt = options.tiltRadians ?? 0.12;

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      toneMapped: false,
      // Single-sided plane: default shadowSide for FrontSide is BackSide, which faces
      // away from the directional light → no shadow would render. Force FrontSide.
      shadowSide: THREE.FrontSide,
    });

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      this.material
    );
    this.mesh.position.set(pos.x, pos.y, pos.z);
    this.mesh.rotation.x = tilt;
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Soft drop shadow on the crowd behind: a slightly larger plane with a radial-gradient
    // alpha mask, parked just behind and below the jumbotron. Cheaper and more visible than
    // real shadow maps under the scene's high ambient lighting.
    this.shadowTexture = createShadowTexture();
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      map: this.shadowTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    // Pin the shadow ONTO the stands surface so it reads as "shadow projected on the
     // crowd", not a floating halo. The stands plane is centered at z ≈ -33 with a -12° tilt
     // (see STANDS_CONFIG). The shadow plane sits a hair in front of that surface, sized up
     // to compensate for its greater distance from the camera.
    const STANDS_TILT_RAD = (-12 * Math.PI) / 180;
    const standsSurfaceZ = -32;
    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 2.0, height * 2.0),
      this.shadowMaterial
    );
    this.shadowMesh.position.set(pos.x, pos.y + 3.5, standsSurfaceZ);
    this.shadowMesh.rotation.x = STANDS_TILT_RAD;
    scene.add(this.shadowMesh);

    // Top sponsor strip: smaller red banner sitting just above the main jumbotron,
    // showing the Coca-Cola wordmark (the colored variant, /assets/ads/image.png).
    this.topBannerCanvas = document.createElement('canvas');
    this.topBannerCanvas.width = TOP_BANNER_CANVAS_W;
    this.topBannerCanvas.height = TOP_BANNER_CANVAS_H;
    this.topBannerCtx = this.topBannerCanvas.getContext('2d')!;
    this.topBannerTexture = new THREE.CanvasTexture(this.topBannerCanvas);
    this.topBannerTexture.colorSpace = THREE.SRGBColorSpace;
    this.topBannerTexture.anisotropy = 4;
    this.topBannerMaterial = new THREE.MeshBasicMaterial({
      map: this.topBannerTexture,
      toneMapped: false,
    });
    const topBannerWidth = width * 0.72;
    const topBannerHeight = height * 0.16;
    this.topBannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(topBannerWidth, topBannerHeight),
      this.topBannerMaterial
    );
    // Park it just above the main jumbotron with a small gap.
    const topBannerY = pos.y + height / 2 + topBannerHeight / 2 + 0.15;
    this.topBannerMesh.position.set(pos.x, topBannerY, pos.z);
    this.topBannerMesh.rotation.x = tilt;
    scene.add(this.topBannerMesh);

    this.drawTopBanner();

    this.draw();

    const img = new Image();
    img.onload = () => {
      this.logoImage = img;
      this.draw();
    };
    img.src = LOGO_URL;
  }

  setScore(score: number): void {
    if (score === this.currentScore) return;
    this.currentScore = score;
    this.draw();
  }

  setTimer(remainingMs: number): void {
    this.currentTimerMs = remainingMs;
    this.drawTopBanner();
  }

  private draw(): void {
    const ctx = this.ctx;
    const size = CANVAS_SIZE;

    // Black bezel fills the whole canvas; red panel sits inside with ~12% margin.
    ctx.fillStyle = BORDER_COLOR;
    ctx.fillRect(0, 0, size, size);

    const bezel = Math.round(size * 0.02);
    const panelX = bezel;
    const panelY = bezel;
    const panelW = size - bezel * 2;
    const panelH = size - bezel * 2;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(panelX, panelY, panelW, panelH);

    drawInsetShadow(ctx, panelX, panelY, panelW, panelH, Math.round(panelW * 0.06));

    if (this.logoImage) {
      const logoMaxW = panelW * 0.82;
      const logoMaxH = panelH * 0.42;
      const scale = Math.min(
        logoMaxW / this.logoImage.width,
        logoMaxH / this.logoImage.height
      );
      const w = this.logoImage.width * scale;
      const h = this.logoImage.height * scale;
      const x = panelX + (panelW - w) / 2;
      const y = panelY + panelH * 0.08;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.logoImage, x, y, w, h);
    }

    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 320px Montserrat, "Arial Black", Arial, sans-serif';
    ctx.fillText(String(this.currentScore), panelX + panelW / 2, panelY + panelH * 0.72);

    this.texture.needsUpdate = true;
  }

  private drawTopBanner(): void {
    const ctx = this.topBannerCtx;
    const w = TOP_BANNER_CANVAS_W;
    const h = TOP_BANNER_CANVAS_H;

    ctx.fillStyle = BORDER_COLOR;
    ctx.fillRect(0, 0, w, h);

    const bezel = Math.round(Math.min(w, h) * 0.06);
    const panelX = bezel;
    const panelY = bezel;
    const panelW = w - bezel * 2;
    const panelH = h - bezel * 2;
    ctx.fillStyle = TOP_BANNER_BG_COLOR;
    ctx.fillRect(panelX, panelY, panelW, panelH);

    drawInsetShadow(ctx, panelX, panelY, panelW, panelH, Math.round(Math.min(panelW, panelH) * 0.12));

    // Timer — large and centered so it reads clearly from the pitch
    const timerText = formatMsTimer(this.currentTimerMs);
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(panelH * 0.70)}px Montserrat, "Arial Black", Arial, sans-serif`;
    ctx.fillText(timerText, panelX + panelW / 2, panelY + panelH / 2);

    this.topBannerTexture.needsUpdate = true;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    scene.remove(this.shadowMesh);
    scene.remove(this.topBannerMesh);
    this.texture.dispose();
    this.material.dispose();
    this.shadowTexture.dispose();
    this.shadowMaterial.dispose();
    this.topBannerTexture.dispose();
    this.topBannerMaterial.dispose();
    this.mesh.geometry.dispose();
    this.shadowMesh.geometry.dispose();
    this.topBannerMesh.geometry.dispose();
  }
}

/**
 * Paints a 4-sided inset shadow on top of a filled panel so it reads as recessed
 * behind the surrounding bezel. Top/left edges are darker (key light convention from
 * upper-left), bottom/right are lighter.
 */
function drawInsetShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number
): void {
  // Top — darkest
  const top = ctx.createLinearGradient(0, y, 0, y + depth);
  top.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  top.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, depth);

  // Left — dark
  const left = ctx.createLinearGradient(x, 0, x + depth, 0);
  left.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  left.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = left;
  ctx.fillRect(x, y, depth, h);

  // Right — softer
  const right = ctx.createLinearGradient(x + w - depth, 0, x + w, 0);
  right.addColorStop(0, 'rgba(0, 0, 0, 0)');
  right.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = right;
  ctx.fillRect(x + w - depth, y, depth, h);

  // Bottom — softer
  const bottom = ctx.createLinearGradient(0, y + h - depth, 0, y + h);
  bottom.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottom.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = bottom;
  ctx.fillRect(x, y + h - depth, w, depth);
}

function createShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size * 0.55,
    0,
    size / 2,
    size * 0.55,
    size * 0.55
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
  gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.75)');
  gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
  gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
