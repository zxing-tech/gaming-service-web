import type { SwipeData } from '../input/SwipeTracker';

/**


 */
export interface NormalizedPoint {
  x: number;
  y: number;
}

/**

 */
export interface NormalizedSwipeData {
  points: NormalizedPoint[];
  originalDistance: number;
  duration: number;
  speed: number;
  angle: number;
  horizontalDistance: number;
  verticalDistance: number;
}

/**

 *





 */
export function normalizeSwipeData(swipeData: SwipeData): NormalizedSwipeData {
  const { points, duration } = swipeData;

  if (points.length < 2) {
    throw new Error('At least 2 points required for normalization');
  }

  const startPoint = points[0];
  const endPoint = points[points.length - 1];


  const translatedPoints = points.map(p => ({
    x: p.x - startPoint.x,
    y: p.y - startPoint.y
  }));


  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {

    return {
      points: points.map(() => ({ x: 0, y: 0 })),
      originalDistance: 0,
      duration,
      speed: 0,
      angle: 0,
      horizontalDistance: 0,
      verticalDistance: 0
    };
  }


  const angle = Math.atan2(dy, dx);


  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);


  const normalizedPoints: NormalizedPoint[] = translatedPoints.map(p => {

    const rotatedX = p.x * cos - p.y * sin;
    const rotatedY = p.x * sin + p.y * cos;


    return {
      x: rotatedX / distance,
      y: rotatedY / distance
    };
  });


  const speed = duration > 0 ? (distance / duration) * 1000 : 0;


  const horizontalDistance = dx;
  const verticalDistance = dy;

  return {
    points: normalizedPoints,
    originalDistance: distance,
    duration,
    speed,
    angle,
    horizontalDistance,
    verticalDistance
  };
}

/**

 */
export function debugNormalizedSwipe(normalized: NormalizedSwipeData): string {
  const pointsStr = normalized.points
    .map((p, i) => `  [${i + 1}] (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`)
    .join('\n');

  return `
Normalized Swipe Data:
${pointsStr}
Distance: ${normalized.originalDistance.toFixed(1)}px
Duration: ${normalized.duration.toFixed(0)}ms
Speed: ${normalized.speed.toFixed(1)}px/s
Angle: ${(normalized.angle * 180 / Math.PI).toFixed(1)}°
Horizontal: ${normalized.horizontalDistance.toFixed(1)}px
Vertical: ${normalized.verticalDistance.toFixed(1)}px
  `.trim();
}
