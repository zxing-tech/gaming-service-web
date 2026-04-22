'use client';

import { LevelCard } from './LevelCard';
import { CompositionLevel } from './CompositionLevel';
import type { DifficultyLevelConfig } from '../../../src/config/Difficulty';

interface LevelGroupPageProps {
  groupId: string;
  levels: DifficultyLevelConfig[];
  onBack: () => void;
}

export function LevelGroupPage({ groupId, levels, onBack }: LevelGroupPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Level {groupId}
          </h1>
          <p className="text-slate-400 text-lg">
            {levels.length}difficulty variants available.
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-8 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300
                     rounded-lg transition-colors duration-200 font-medium"
        >
          ← Back to list
        </button>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {levels.map((level) => (
            level.composition ? (
              <CompositionLevel key={level.name} level={level} />
            ) : (
              <LevelCard key={level.name} level={level} />
            )
          ))}
        </div>
      </div>
    </div>
  );
}
