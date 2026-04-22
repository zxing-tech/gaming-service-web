'use client';

import { GroupCard } from './GroupCard';
import { groupLevelsByPrefix, sortGroupEntries } from '../lib/utils';
import type { DifficultyLevelConfig } from '../../../src/config/Difficulty';

interface IndexPageProps {
  levels: DifficultyLevelConfig[];
  onNavigate: (prefix: string) => void;
}

export function IndexPage({ levels, onNavigate }: IndexPageProps) {
  const groups = groupLevelsByPrefix(levels);
  const sortedGroups = sortGroupEntries(Array.from(groups.entries()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Difficulty Preview Admin
          </h1>
          <p className="text-slate-400 text-lg">
            Review obstacle layouts by difficulty group.
          </p>
        </div>

        {/* Group Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedGroups.map(([prefix, groupLevels]) => (
            <GroupCard
              key={prefix}
              prefix={prefix}
              levels={groupLevels}
              onClick={() => onNavigate(prefix)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
