'use client';

import { useState, useEffect } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';
import { gameEventBus } from '@/lib/gameEventBus';

// ms each step is shown before transitioning to next
const STEP_DURATIONS = [850, 850, 850, 1400];
const STEPS = ['3', '2', '1', "Let's\nPlay!"];

export function CountdownOverlay() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useGameEvent('GAME_STARTED', () => {
    setActive(true);
    setStepIndex(0);
  });

  useEffect(() => {
    if (!active) return;

    if (stepIndex >= STEPS.length) {
      setActive(false);
      gameEventBus.emit({ type: 'COUNTDOWN_COMPLETE' });
      return;
    }

    const t = window.setTimeout(() => {
      setStepIndex((i) => i + 1);
    }, STEP_DURATIONS[stepIndex]);

    return () => clearTimeout(t);
  }, [active, stepIndex]);

  if (!active || stepIndex >= STEPS.length) return null;

  const isLetPlay = stepIndex === 3;
  const lines = STEPS[stepIndex].split('\n');

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center">
      {/* semi-dark backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* countdown content */}
      <div
        key={stepIndex}
        className={`relative z-10 flex flex-col items-center gap-1 text-center ${isLetPlay ? 'countdown__letsplay' : 'countdown__step'}`}
      >
        {isLetPlay ? (
          <>
            {lines.map((line, i) => (
              <span
                key={i}
                className="block font-black leading-none tracking-wide text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
                style={{ fontSize: 'clamp(2.6rem, 11vw, 4.4rem)' }}
              >
                {line}
              </span>
            ))}
          </>
        ) : (
          <span
            className="block font-black leading-none text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.85)]"
            style={{ fontSize: 'clamp(7rem, 32vw, 13rem)' }}
          >
            {STEPS[stepIndex]}
          </span>
        )}
      </div>
    </div>
  );
}
