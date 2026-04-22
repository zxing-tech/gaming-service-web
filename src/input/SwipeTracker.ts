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
export class SwipeTracker {
  private isTracking = false;
  private currentSwipe: SwipePoint[] = [];
  private lastSwipe: SwipeData | null = null;

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

    const point = this.createPoint(e);
    this.currentSwipe.push(point);
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isTracking) return;
    e.preventDefault();

    const point = this.createPoint(e);


    const lastPoint = this.currentSwipe[this.currentSwipe.length - 1];
    if (lastPoint) {
      const timeDiff = point.timestamp - lastPoint.timestamp;
      const distSq = (point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2;


      if (timeDiff < 1 && distSq < 1) {
        return;
      }
    }

    this.currentSwipe.push(point);
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isTracking) return;
    e.preventDefault();

    const point = this.createPoint(e);


    const lastPoint = this.currentSwipe[this.currentSwipe.length - 1];
    if (lastPoint) {
      const timeDiff = point.timestamp - lastPoint.timestamp;
      const distSq = (point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2;


      if (timeDiff >= 1 || distSq >= 1) {
        this.currentSwipe.push(point);
      }
    } else {
      this.currentSwipe.push(point);
    }

    this.finalizeSwipe();
  }

  private handlePointerCancel() {
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
  public getLastSwipe(): SwipeData | null {
    return this.lastSwipe;
  }

  /**



   */
  public getLastSwipeWorldPositions(camera: THREE.Camera, targetZ = 0): THREE.Vector3[] | null {
    if (!this.lastSwipe) return null;

    const worldPositions: THREE.Vector3[] = [];
    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    for (const point of this.lastSwipe.points) {

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

   */
  public destroy() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDownBound);
    this.canvas.removeEventListener('pointermove', this.handlePointerMoveBound);
    this.canvas.removeEventListener('pointerup', this.handlePointerUpBound);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancelBound);
  }
}
