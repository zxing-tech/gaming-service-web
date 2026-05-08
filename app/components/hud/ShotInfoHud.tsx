'use client';

import { useState } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';
import type { ShotInfo } from '@/types/gameEvents';

export function ShotInfoHud() {
  const [visible, setVisible] = useState(false);
  const [shotInfo, setShotInfo] = useState<ShotInfo | null>(null);

  useGameEvent('DEBUG_MODE_CHANGED', (event) => {
    setVisible(event.enabled);
  });

  useGameEvent('SHOT_INFO_UPDATED', (event) => {
    setShotInfo(event.data);
  });

  if (!visible || !shotInfo) return null;

  const getShotTypeColor = (type: string): string => {
    switch (type) {
      case 'NORMAL': return '#81a1c1';
      case 'CURVE': return '#b48ead';
      case 'INVALID': return '#d08770';
      default: return '#ffffff';
    }
  };

  const formatCurveDirection = (direction: number): string => {
    if (direction === 1) return 'R';
    if (direction === -1) return 'L';
    return '-';
  };

  return (
    <div
      className="fixed left-1/2 z-[5] max-w-[min(95vw,520px)] -translate-x-1/2 rounded-lg border border-blue-400/40 bg-black/70 px-3 py-2 font-mono text-[11px] text-blue-100 shadow-lg backdrop-blur max-[380px]:px-2 max-[380px]:text-[10px] sm:px-4 sm:py-2.5 sm:text-xs"
      style={{
        bottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))'
      }}
    >
      <div className="flex justify-center flex-wrap gap-x-3 gap-y-1.5 mb-1.5">
        <span className="whitespace-nowrap">
          <span className="text-sky-400 font-bold">TYPE: </span>
          <span style={{ color: getShotTypeColor(shotInfo.type) }}>{shotInfo.type}</span>
        </span>
        <span className="whitespace-nowrap">
          <span className="text-sky-400 font-bold">PWR: </span>
          <span className="text-white">{Math.round(shotInfo.power * 100)}%</span>
        </span>
        <span className="whitespace-nowrap">
          <span className="text-sky-400 font-bold">CRV: </span>
          <span className="text-white">
            {Math.round(shotInfo.curveAmount * 100)}% {formatCurveDirection(shotInfo.curveDirection)}
          </span>
        </span>
        <span className="whitespace-nowrap">
          <span className="text-sky-400 font-bold">HGT: </span>
          <span className="text-white">{Math.round(shotInfo.heightFactor * 100)}%</span>
        </span>
      </div>
      <div className="flex justify-center flex-wrap gap-x-3 gap-y-1.5">
        <span className="whitespace-nowrap">
          <span className="text-sky-400 font-bold">SPD: </span>
          <span className="text-white">{shotInfo.speed.toFixed(1)} m/s</span>
        </span>
        <span className="whitespace-nowrap">
          <span className="text-sky-400 font-bold">TGT: </span>
          <span className="text-white">
            ({shotInfo.targetPosition.x.toFixed(1)}, {shotInfo.targetPosition.y.toFixed(1)})
          </span>
        </span>
      </div>
    </div>
  );
}
