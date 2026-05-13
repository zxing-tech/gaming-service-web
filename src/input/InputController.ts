/**

 *




 */

import * as THREE from 'three';
import { SwipeTracker, type SwipeData } from './SwipeTracker';

/**

 */
export interface ShootParams {
  swipeData: SwipeData;
  worldPositions: THREE.Vector3[] | null;
}

/**

 */
export interface InputControllerCallbacks {
  onShoot?: (params: ShootParams) => void;
}

/**

 */
export class InputController {
  private readonly swipeTracker: SwipeTracker;
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: THREE.PerspectiveCamera;
  private callbacks: InputControllerCallbacks = {};

  private isEnabled = true;

  private readonly handleCanvasPointerUpBound = (e: PointerEvent) => this.handleCanvasPointerUp(e);

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    callbacks: InputControllerCallbacks = {}
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.callbacks = callbacks;


    this.swipeTracker = new SwipeTracker(canvas, 24);


    this.attachEventListeners();
  }

  /**

   */
  private attachEventListeners(): void {
    this.canvas.addEventListener('pointerup', this.handleCanvasPointerUpBound);
  }

  /**

   */
  private handleCanvasPointerUp(e: PointerEvent): void {
    if (!this.isEnabled) {
      return;
    }


    if (e.target !== this.canvas) {
      return;
    }

    const swipeData = this.swipeTracker.getLastSwipe();
    if (!swipeData || swipeData.points.length < 2) {
      return;
    }


    const worldPositions = this.swipeTracker.getLastSwipeWorldPositions(this.camera, 0);


    this.callbacks.onShoot?.({
      swipeData,
      worldPositions
    });
  }

  /**

   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**

   */
  isInputEnabled(): boolean {
    return this.isEnabled;
  }

  /**

   */
  getLastSwipe(): SwipeData | null {
    return this.swipeTracker.getLastSwipe();
  }

  /**

   */
  getLastSwipeWorldPositions(camera: THREE.PerspectiveCamera, z: number): THREE.Vector3[] | null {
    return this.swipeTracker.getLastSwipeWorldPositions(camera, z);
  }

  getSwipeVisualizationWorldPositions(camera: THREE.PerspectiveCamera, z: number): THREE.Vector3[] | null {
    return this.swipeTracker.getSwipeVisualizationWorldPositions(camera, z);
  }

  /** Hide ribbon immediately — call after goal / reset so post-shot fade doesn’t overlap gameplay. */
  clearSwipeTrailDisplay(): void {
    this.swipeTracker.clearSwipeTrailDisplay();
  }

  getSwipeSpeedPxPerMs(): number {
    return this.swipeTracker.getSwipeSpeedPxPerMs();
  }

  /**

   */
  setCallbacks(callbacks: InputControllerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**

   */
  destroy(): void {
    this.canvas.removeEventListener('pointerup', this.handleCanvasPointerUpBound);
    this.swipeTracker.destroy();
  }
}
