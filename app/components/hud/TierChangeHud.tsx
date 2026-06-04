'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';

const TIER_LABEL: Record<2 | 3, string> = {
  2: 'Intermediate',
  3: 'Hard',
};

export function TierChangeHud() {
  const [label, setLabel] = useState('');
  const [phase, setPhase] = useState<'hidden' | 'in' | 'hold' | 'out'>('hidden');
  const timerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useGameEvent('TIER_CHANGED', (event) => {
    if (event.tierId === 1) return;
    clearTimers();
    setLabel(TIER_LABEL[event.tierId as 2 | 3]);
    setPhase('in');

    timerRef.current = window.setTimeout(() => {
      setPhase('hold');
      timerRef.current = window.setTimeout(() => {
        setPhase('out');
        timerRef.current = window.setTimeout(() => setPhase('hidden'), 600);
      }, 2000);
    }, 600);
  });

  useEffect(() => () => clearTimers(), []);

  if (phase === 'hidden') return null;

  const isVisible = phase === 'in' || phase === 'hold';

  return (
    <div
      className="fixed left-0 right-0 z-[30] pointer-events-none flex justify-center"
      style={{ top: 'max(env(safe-area-inset-top, 0px), 52px)' }}
    >
      <div
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0.9)',
          transition: phase === 'out'
            ? 'opacity 0.5s ease, transform 0.5s ease'
            : 'opacity 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        className="flex flex-col items-center"
      >
        {/* Double chevrons */}
        <div className="flex flex-col items-center gap-0 mb-1">
          <svg width="48" height="16" viewBox="0 0 48 16" fill="none"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.4s ease 0.15s, transform 0.4s ease 0.15s',
            }}
          >
            <polyline points="4,14 24,3 44,14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.5" />
          </svg>
          <svg width="48" height="16" viewBox="0 0 48 16" fill="none"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.4s ease 0.05s, transform 0.4s ease 0.05s',
            }}
          >
            <polyline points="4,14 24,3 44,14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        {/* Border box */}
        <div
          className="flex flex-col items-center px-8 py-3 rounded-2xl"
          style={{
            border: '2px solid rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* LEVEL */}
          <div
            className="font-russo text-white leading-none tracking-[0.2em]"
            style={{
              fontSize: 'clamp(22px, 7vw, 36px)',
              textShadow: '0 0 20px rgba(255,255,255,0.6)',
            }}
          >
            LEVEL
          </div>

          {/* UP with arrow */}
          <div className="flex items-center gap-1 leading-none">
            <svg width="22" height="28" viewBox="0 0 22 28" fill="none" className="shrink-0"
              style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7))' }}
            >
              <line x1="11" y1="26" x2="11" y2="6" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <polyline points="4,13 11,5 18,13" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <div
              className="font-russo text-white leading-none tracking-[0.15em]"
              style={{
                fontSize: 'clamp(30px, 10vw, 52px)',
                textShadow: '0 0 24px rgba(255,255,255,0.7)',
              }}
            >
              UP
            </div>
          </div>

          {/* Tier name */}
          <div
            className="font-russo text-white/70 tracking-widest uppercase mt-1"
            style={{ fontSize: 'clamp(10px, 3vw, 13px)', letterSpacing: '0.3em' }}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
