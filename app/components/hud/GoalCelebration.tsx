'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';

const DURATION_MS = 1600;

export function GoalCelebration() {
  const [animationKey, setAnimationKey] = useState(0);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useGameEvent('GOAL_SCORED', () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    setAnimationKey((k) => k + 1);
    setVisible(true);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, DURATION_MS);
  });

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      key={animationKey}
      className="goal-celebration pointer-events-none absolute inset-0 z-[15] flex items-center justify-center"
    >
      <span className="goal-celebration__text font-black uppercase tracking-tight text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.75)]">
        GOAL!
      </span>
    </div>
  );
}
