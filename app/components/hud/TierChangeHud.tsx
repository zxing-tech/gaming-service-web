'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';

interface TierToast {
  tierId: 1 | 2 | 3;
  difficultyName: 'Easy' | 'Intermediate' | 'Hard';
}

const LABEL_BY_TIER: Record<1 | 2 | 3, string> = {
  1: 'Easy',
  2: 'Intermediate',
  3: 'Hard'
};

export function TierChangeHud() {
  const [toast, setToast] = useState<TierToast | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useGameEvent('TIER_CHANGED', (event) => {
    setToast({ tierId: event.tierId, difficultyName: event.difficultyName });
    setVisible(true);

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, 1500);
  });

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!toast || !visible) return null;

  return (
    <div className="fixed left-1/2 top-[max(0.9rem,calc(env(safe-area-inset-top,0px)+0.65rem))] z-[12] -translate-x-1/2 rounded-full border border-cyan-300/40 bg-black/70 px-4 py-1.5 text-sm font-semibold tracking-wide text-cyan-100 shadow-lg backdrop-blur sm:text-base">
      Tier {toast.tierId}: {LABEL_BY_TIER[toast.tierId]} ({toast.difficultyName})
    </div>
  );
}
