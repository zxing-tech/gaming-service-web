'use client';

import { useState } from 'react';
import { LevelPreview } from './LevelPreview';
import { createObstacleSummary } from '../lib/utils';
import { composeObstacles } from '../../../src/config/Difficulty';
import type { DifficultyLevelConfig } from '../../../src/config/Difficulty';

interface CompositionLevelProps {
  level: DifficultyLevelConfig;
}

export function CompositionLevel({ level }: CompositionLevelProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!level.composition) {
    return null;
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Generate 3 samples
  const samples = Array.from({ length: 3 }, (_, i) => ({
    id: `${refreshKey}-${i}`,
    obstacles: composeObstacles(level.composition!)
  }));

  return (
    <div className="col-span-full bg-gradient-to-br from-blue-900/20 to-slate-900/40 backdrop-blur-sm
                    border-2 border-blue-500/50 rounded-2xl p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-400 mb-2">
            {level.name}
          </h2>
          <div className="flex gap-4 text-sm text-slate-400">
            <span>Threshold · {level.threshold}</span>
            <span>Composition · {level.composition.count} from [{level.composition.from.join(', ')}]</span>
            <span>Unique · {String(level.composition.unique ?? true)}</span>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     transition-colors duration-200 font-medium flex items-center gap-2"
        >
          🔄 Refresh Samples
        </button>
      </div>

      {/* Samples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {samples.map((sample, i) => (
          <div
            key={sample.id}
            className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"
          >
            <h3 className="text-white font-semibold mb-3">
              Sample {i + 1}
            </h3>

            {/* Preview */}
            <div className="mb-3">
              <LevelPreview level={level} obstacleConfigs={sample.obstacles} />
            </div>

            {/* Obstacle List */}
            <div className="flex flex-wrap gap-2">
              {sample.obstacles.length === 0 ? (
                <p className="text-slate-500 text-sm">No obstacles</p>
              ) : (
                sample.obstacles.map((instance, idx) => (
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
        ))}
      </div>
    </div>
  );
}
