'use client';

import { LevelPreview } from './LevelPreview';
import { createObstacleSummary } from '../lib/utils';
import type { DifficultyLevelConfig } from '../../../src/config/Difficulty';

interface LevelCardProps {
  level: DifficultyLevelConfig;
}

export function LevelCard({ level }: LevelCardProps) {
  const obstacleCount = level.obstacles?.length ?? 0;

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm
                    border border-slate-700/50 rounded-2xl p-5
                    transition-all duration-300 hover:border-blue-500/50 hover:-translate-y-1
                    hover:shadow-lg hover:shadow-blue-500/10">
      {/* Header */}
      <h2 className="text-xl font-bold text-white mb-3">
        {level.name}
      </h2>

      {/* Meta */}
      <div className="flex justify-between text-sm text-slate-400 pb-3 mb-4 border-b border-slate-700/50">
        <span>Threshold · {level.threshold}</span>
        <span>Obstacles · {obstacleCount}</span>
      </div>

      {/* Preview */}
      <div className="mb-4">
        <LevelPreview level={level} />
      </div>

      {/* Obstacle List */}
      <div className="flex flex-wrap gap-2">
        {obstacleCount === 0 ? (
          <p className="text-slate-500 text-sm">No obstacles are placed.</p>
        ) : (
          level.obstacles!.map((instance, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-xs font-medium"
            >
              {createObstacleSummary(instance)}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
