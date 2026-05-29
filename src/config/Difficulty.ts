import type { ObstacleInstanceConfig } from './Obstacles';

export interface CompositionConfig {

  count: number;

  from: string[];

  unique?: boolean;
}

export interface DifficultyLevelConfig {

  threshold: number;
  name: string;
  obstacles?: ObstacleInstanceConfig[];
  composition?: CompositionConfig;
}

/**


 *






 */
export const DIFFICULTY_LEVELS: DifficultyLevelConfig[] = [
  /* ============================================

   * ============================================ */
  {
    threshold: 0,
    name: '0-0-no-obstacles',
    obstacles: []
  },

  /* ============================================

   * ============================================ */


  {
    threshold: 1,
    name: '1-0-left-keeperWall',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: { position: { x: -0.8, z: -5.2 } },
        behavior: { type: 'static' }
      }
    ]
  },
  {
    threshold: 1,
    name: '1-0-right-keeperWall',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: { position: { x: 0.8, z: -5.2 } },
        behavior: { type: 'static' }
      }
    ]
  },


  {
    threshold: 2,
    name: '1-0-middle-keeperWall',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: { position: { z: -5.2 } },
        behavior: { type: 'static' }
      }
    ]
  },
  {
    threshold: 3,
    name: '1-0-diagonal-keeperWall',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: {
          position: { z: -5.4 },
          positionRange : { x: [-1.5, 1.5] },
          rotationRange : { z: [0, Math.PI] }
          },
        behavior: { type: 'static' }
      }
    ]
  },
  {
    threshold: 4,
    name: '1-1-patrol-keeperWall',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: {
          position: { z: -5.4 }
        },
        behavior: {
          type: 'patrol',
          axis: 'x',
          range: [-1.2, 1.2],
          speed: 1.0,
          waveform: 'sine'
        }
      }
    ]
  },
  {
    threshold: 7,
    name: '1-2-patrol-keeperWall',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: {
          position: { z: -5.4 }
        },
        behavior: {
          type: 'patrol',
          axis: 'x',
          range: [-1.2, 1.2],
          speed: 2.0,
          waveform: 'sine'
        }
      }
    ]
  },
  {
    threshold: 10,
    name: '1-3-spin-keeperWall',
    obstacles: [
      {
        blueprintId: 'keeperWall',
        transform: {
          position: { z: -5.4 }
        },
        behavior: {
          type: 'spin',
          axis: 'z',
          speed: 2.0,
          orbit: {
            axis: 'x',
            range: [-1.5, 1.5],
            speed: 2.0
          },
          radius: 0,
          startAngle: 0,
        }
      }
    ]
  },
  /* ============================================



   * ============================================ */


  { threshold: 15, name: '2-0-composition', composition: { count: 2, from: ['1-0'], unique: true } },
  { threshold: 18, name: '2-1-composition', composition: { count: 2, from: ['1-1'], unique: true } },
  { threshold: 21, name: '2-2-composition', composition: { count: 2, from: ['1-2'], unique: true } },
  { threshold: 25, name: '2-3-composition', composition: { count: 2, from: ['1-3'], unique: true } },


  { threshold: 30, name: '3-0-composition', composition: { count: 3, from: ['1-0'], unique: true } },
  { threshold: 33, name: '3-1-composition', composition: { count: 3, from: ['1-1'], unique: true } },
  { threshold: 36, name: '3-2-composition', composition: { count: 3, from: ['1-2'], unique: true } },
  { threshold: 40, name: '3-3-composition', composition: { count: 3, from: ['1-3'], unique: true } },


  { threshold: 45, name: '4-0-composition', composition: { count: 4, from: ['1-0'], unique: true } },
  { threshold: 48, name: '4-1-composition', composition: { count: 4, from: ['1-1'], unique: true } },
  { threshold: 51, name: '4-2-composition', composition: { count: 4, from: ['1-2'], unique: true } },
  { threshold: 55, name: '4-3-composition', composition: { count: 4, from: ['1-3'], unique: true } },


  { threshold: 60, name: '5-0-composition', composition: { count: 5, from: ['1-0'], unique: true } },
  { threshold: 63, name: '5-1-composition', composition: { count: 5, from: ['1-1'], unique: true } },
  { threshold: 66, name: '5-2-composition', composition: { count: 5, from: ['1-2'], unique: true } },
  { threshold: 70, name: '5-3-composition', composition: { count: 5, from: ['1-3'], unique: true } },


  { threshold: 75, name: '6-0-composition', composition: { count: 6, from: ['1-0'], unique: true } },
  { threshold: 78, name: '6-1-composition', composition: { count: 6, from: ['1-1'], unique: true } },
  { threshold: 81, name: '6-2-composition', composition: { count: 6, from: ['1-2'], unique: true } },
  { threshold: 85, name: '6-3-composition', composition: { count: 6, from: ['1-3'], unique: true } },


  { threshold: 90, name: '7-0-composition', composition: { count: 7, from: ['1-0'], unique: true } },
  { threshold: 93, name: '7-1-composition', composition: { count: 7, from: ['1-1'], unique: true } },
  { threshold: 96, name: '7-2-composition', composition: { count: 7, from: ['1-2'], unique: true } },
  { threshold: 100, name: '7-3-composition', composition: { count: 7, from: ['1-3'], unique: true } },


  { threshold: 105, name: '8-0-composition', composition: { count: 8, from: ['1-0'], unique: true } },
  { threshold: 108, name: '8-1-composition', composition: { count: 8, from: ['1-1'], unique: true } },
  { threshold: 111, name: '8-2-composition', composition: { count: 8, from: ['1-2'], unique: true } },
  { threshold: 115, name: '8-3-composition', composition: { count: 8, from: ['1-3'], unique: true } },


  { threshold: 120, name: '9-0-composition', composition: { count: 9, from: ['1-0'], unique: true } },
  { threshold: 123, name: '9-1-composition', composition: { count: 9, from: ['1-1'], unique: true } },
  { threshold: 126, name: '9-2-composition', composition: { count: 9, from: ['1-2'], unique: true } },
  { threshold: 130, name: '9-3-composition', composition: { count: 9, from: ['1-3'], unique: true } },


  { threshold: 135, name: '10-0-composition', composition: { count: 10, from: ['1-0'], unique: true } },
  { threshold: 138, name: '10-1-composition', composition: { count: 10, from: ['1-1'], unique: true } },
  { threshold: 141, name: '10-2-composition', composition: { count: 10, from: ['1-2'], unique: true } },
  { threshold: 145, name: '10-3-composition', composition: { count: 10, from: ['1-3'], unique: true } },

];

/**

 */
export function getDifficultyForScore(score: number): DifficultyLevelConfig {
  let bestThreshold = Number.NEGATIVE_INFINITY;
  let candidates: DifficultyLevelConfig[] = [];

  for (const level of DIFFICULTY_LEVELS) {
    if (score < level.threshold) {
      break;
    }

    if (level.threshold > bestThreshold) {
      bestThreshold = level.threshold;
      candidates = [level];
    } else if (level.threshold === bestThreshold) {
      candidates.push(level);
    }
  }

  if (candidates.length === 0) {
    return DIFFICULTY_LEVELS[0];
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
}

/**

 */
export function composeObstacles(composition: CompositionConfig): ObstacleInstanceConfig[] {
  const { count, from, unique = true } = composition;


  const pool: DifficultyLevelConfig[] = [];
  for (const level of DIFFICULTY_LEVELS) {
    if (!level.obstacles || level.obstacles.length === 0) continue;

    // Check whether the level name starts with one of the "from" group prefixes.
    const matchesGroup = from.some(groupPrefix => level.name.startsWith(groupPrefix));
    if (matchesGroup) {
      pool.push(level);
    }
  }

  if (pool.length === 0) {
    console.warn(`No levels found for groups: ${from.join(', ')}`);
    return [];
  }

  const result: ObstacleInstanceConfig[] = [];
  const used = new Set<number>();

  for (let i = 0; i < count; i++) {
    let selectedLevel: DifficultyLevelConfig;

    if (unique && pool.length > used.size) {

      let attempts = 0;
      do {
        const index = Math.floor(Math.random() * pool.length);
        if (!used.has(index)) {
          selectedLevel = pool[index];
          used.add(index);
          break;
        }
        attempts++;
      } while (attempts < 100);

      if (!selectedLevel!) {

        selectedLevel = pool[Math.floor(Math.random() * pool.length)];
      }
    } else {

      selectedLevel = pool[Math.floor(Math.random() * pool.length)];
    }


    if (selectedLevel.obstacles) {
      result.push(...selectedLevel.obstacles);
    }
  }

  return result;
}
