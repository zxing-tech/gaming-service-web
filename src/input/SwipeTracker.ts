import * as THREE from 'three';

export interface SwipePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeData {
  points: SwipePoint[];
  startTime: number;
  endTime: number;
  duration: number;
}

/**

 */
const SWIPE_LINE_POST_RELEASE_MS = 350;

/** Ignore duplicate samples only when the finger barely moved (sub-pixel). */
const MIN_MOVE_DIST_SQ = 0.36; // 0.6px — keeps dense paths on fast swipes; drops noise

export class SwipeTracker {
  private isTracking = false;
  private currentSwipe: SwipePoint[] = [];
  private lastSwipe: SwipeData | null = null;
  private lastSwipeDisplayDeadline = 0;
  private activePointerId: number | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly maxPoints: number;

  private readonly handlePointerDownBound = (e: PointerEvent) => this.handlePointerDown(e);
  private readonly handlePointerMoveBound = (e: PointerEvent) => this.handlePointerMove(e);
  private readonly handlePointerUpBound = (e: PointerEvent) => this.handlePointerUp(e);
  private readonly handlePointerCancelBound = () => this.handlePointerCancel();

  constructor(canvas: HTMLCanvasElement, maxPoints = 10) {
    this.canvas = canvas;
    this.maxPoints = maxPoints;
    this.attachEventListeners();
  }

  private attachEventListeners() {
    this.canvas.addEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.addEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.addEventListener('pointerup', this.handlePointerUpBound);
    this.canvas.addEventListener('pointercancel', this.handlePointerCancelBound);
  }

  private handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    this.isTracking = true;
    this.currentSwipe = [];

    try {
      this.canvas.setPointerCapture(e.pointerId);
      this.activePointerId = e.pointerId;
    } catch {
      this.activePointerId = null;
    }

    const point = this.createPoint(e);
    this.currentSwipe.push(point);
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isTracking) return;
    e.preventDefault();

    // High-frequency / fast strokes: the UA may coalesce moves — replay every sample
    // so the ribbon matches the finger (see PointerEvent.getCoalescedEvents).
    const coalesced =
      typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    const toProcess: PointerEvent[] = coalesced.length > 0 ? coalesced : [e];

    for (const ev of toProcess) {
      this.tryAppendSwipePoint(this.createPoint(ev));
    }
  }

  private tryAppendSwipePoint(point: SwipePoint): void {
    const lastPoint = this.currentSwipe[this.currentSwipe.length - 1];
    if (!lastPoint) {
      this.currentSwipe.push(point);
      return;
    }

    const distSq = (point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2;
    if (distSq < MIN_MOVE_DIST_SQ) {
      return;
    }

    this.currentSwipe.push(point);
  }

  private releasePointerCaptureIfNeeded(): void {
    if (this.activePointerId == null) return;
    try {
      this.canvas.releasePointerCapture(this.activePointerId);
    } catch {
      /* already released */
    }
    this.activePointerId = null;
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isTracking) return;
    e.preventDefault();

    this.releasePointerCaptureIfNeeded();

    const point = this.createPoint(e);

    const lastPoint = this.currentSwipe[this.currentSwipe.length - 1];
    if (lastPoint) {
      const distSq = (point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2;
      if (distSq >= MIN_MOVE_DIST_SQ) {
        this.currentSwipe.push(point);
      }
    } else {
      this.currentSwipe.push(point);
    }

    this.finalizeSwipe();
  }

  private handlePointerCancel() {
    this.releasePointerCaptureIfNeeded();
    this.isTracking = false;
    this.currentSwipe = [];
  }

  private createPoint(e: PointerEvent): SwipePoint {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      timestamp: performance.now()
    };
  }

  private finalizeSwipe() {
    this.isTracking = false;

    if (this.currentSwipe.length < 2) {
      this.currentSwipe = [];
      return;
    }


    const sampledPoints = this.samplePoints(this.currentSwipe, this.maxPoints);

    const startTime = this.currentSwipe[0].timestamp;
    const endTime = this.currentSwipe[this.currentSwipe.length - 1].timestamp;

    this.lastSwipe = {
      points: sampledPoints,
      startTime,
      endTime,
      duration: endTime - startTime
    };
    this.lastSwipeDisplayDeadline = performance.now() + SWIPE_LINE_POST_RELEASE_MS;

    // console.log('Swipe captured:', {
    //   totalPoints: this.currentSwipe.length,
    //   sampledPoints: sampledPoints.length,
    //   points: sampledPoints
    // });

    this.currentSwipe = [];
  }

  /**


   */
  private samplePoints(points: SwipePoint[], targetCount: number): SwipePoint[] {
    if (points.length <= targetCount) {
      return [...points];
    }

    const startPoint = points[0];
    const endPoint = points[points.length - 1];


    const cumulativeDistances: number[] = [0];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      cumulativeDistances.push(cumulativeDistances[i - 1] + dist);
    }

    const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];


    if (totalDistance === 0) {
      const step = (points.length - 1) / (targetCount - 1);
      const sampled: SwipePoint[] = [];
      for (let i = 0; i < targetCount; i++) {
        const index = Math.round(i * step);
        sampled.push(points[index]);
      }
      sampled[0] = startPoint;
      sampled[sampled.length - 1] = endPoint;
      return sampled;
    }



    const sampled: SwipePoint[] = [startPoint];
    let lastIndex = 0;

    for (let i = 1; i < targetCount - 1; i++) {
      const targetRatio = i / (targetCount - 1);
      const targetDistance = totalDistance * targetRatio;


      const minIndex = lastIndex + 1;
      const maxIndex = points.length - 1 - (targetCount - i - 1);


      let candidateIndex = minIndex;
      while (
        candidateIndex < points.length - 1 &&
        cumulativeDistances[candidateIndex] < targetDistance
      ) {
        candidateIndex++;
      }


      candidateIndex = Math.max(minIndex, Math.min(candidateIndex, maxIndex));


      const prevIndex = Math.max(minIndex, candidateIndex - 1);
      if (prevIndex > lastIndex) {
        const prevDiff = Math.abs(cumulativeDistances[prevIndex] - targetDistance);
        const currDiff = Math.abs(cumulativeDistances[candidateIndex] - targetDistance);
        if (prevDiff < currDiff) {
          candidateIndex = prevIndex;
        }
      }

      sampled.push(points[candidateIndex]);
      lastIndex = candidateIndex;
    }

    sampled.push(endPoint);

    return sampled;
  }

  /**

   */
  /**
   * Stops showing the completed swipe ribbon (e.g. after a goal or round reset)
   * so it doesn’t linger over the celebration.
   */
  public clearSwipeTrailDisplay(): void {
    this.lastSwipe = null;
    this.lastSwipeDisplayDeadline = 0;
  }

  public getLastSwipe(): SwipeData | null {
    return this.lastSwipe;
  }

  /**



   */
  public getLastSwipeWorldPositions(camera: THREE.Camera, targetZ = 0): THREE.Vector3[] | null {
    if (!this.lastSwipe) return null;
    return this.pointsToWorldPositions(this.lastSwipe.points, camera, targetZ);
  }

  /**
   * Active swipe path while dragging, then the completed path briefly after release.
   */
  public getSwipeVisualizationWorldPositions(camera: THREE.Camera, targetZ = 0): THREE.Vector3[] | null {
    if (this.isTracking) {
      if (this.currentSwipe.length >= 2) {
        return this.pointsToWorldPositions(this.currentSwipe, camera, targetZ);
      }
      return null;
    }
    if (
      this.lastSwipe &&
      this.lastSwipe.points.length >= 2 &&
      performance.now() < this.lastSwipeDisplayDeadline
    ) {
      return this.pointsToWorldPositions(this.lastSwipe.points, camera, targetZ);
    }
    return null;
  }

  private pointsToWorldPositions(
    points: SwipePoint[],
    camera: THREE.Camera,
    targetZ: number
  ): THREE.Vector3[] {
    const worldPositions: THREE.Vector3[] = [];
    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    for (const point of points) {
      const ndcX = (point.x / canvasWidth) * 2 - 1;
      const ndcY = -(point.y / canvasHeight) * 2 + 1;

      const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
      vector.unproject(camera);

      const cameraPosition = camera.position.clone();
      const direction = vector.sub(cameraPosition).normalize();

      const distance = (targetZ - cameraPosition.z) / direction.z;
      const worldPoint = cameraPosition.clone().add(direction.multiplyScalar(distance));

      worldPositions.push(worldPoint);
    }

    return worldPositions;
  }

  /**

   */
  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Approximate finger speed along the stroke (canvas px / ms). Used to tighten the aim ribbon on fast swipes.
   */
  public getSwipeSpeedPxPerMs(): number {
    const pts =
      this.isTracking && this.currentSwipe.length >= 2
        ? this.currentSwipe
        : this.lastSwipe && this.lastSwipe.points.length >= 2
          ? this.lastSwipe.points
          : null;
    if (!pts || pts.length < 2) return 0;

    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    const dt = pts[pts.length - 1].timestamp - pts[0].timestamp;
    if (dt <= 0) return 0;
    return len / dt;
  }

  /**

   */
  public destroy() {
    this.releasePointerCaptureIfNeeded();
    this.canvas.removeEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.removeEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.removeEventListener('pointerup', this.handlePointerUpBound);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancelBound);
  }
}
