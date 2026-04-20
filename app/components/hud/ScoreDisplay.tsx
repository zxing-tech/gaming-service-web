'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';

export function ScoreDisplay() {

  const [bestScore, setBestScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [lives, setLives] = useState({ remaining: 2, total: 2 });
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('snapshoot.bestScore');
      if (saved) {
        setBestScore(parseInt(saved));
      }
    }
  }, []);

  useGameEvent('SCORE_CHANGED', (event) => {
    animateScore(displayScore, event.score);
  });

  useGameEvent('BEST_SCORE_UPDATED', (event) => {
    setBestScore(event.bestScore);
    const bestEl = document.getElementById('best-score-number');
    if (bestEl) {
      bestEl.classList.add('animate-best-score-pop');
      setTimeout(() => {
        bestEl.classList.remove('animate-best-score-pop');
      }, 800);
    }
  });

  useGameEvent('LIVES_CHANGED', (event) => {
    setLives({ remaining: event.livesRemaining, total: event.totalLives });
  });

  const animateScore = (from: number, to: number) => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const duration = 300;
    const startTime = Date.now();
    const range = to - from;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(from + range * easeOut);

      setDisplayScore(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    const scoreboard = document.getElementById('scoreboard-container');
    if (scoreboard) {
      scoreboard.classList.add('animate-scoreboard-pulse');
      setTimeout(() => {
        scoreboard.classList.remove('animate-scoreboard-pulse');
      }, 400);
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const isAppInToss = typeof navigator !== 'undefined' && /TossApp/i.test(navigator.userAgent);

  return (
    <>
      <div
        className="pointer-events-none absolute top-0 left-3 z-[5] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[36px] border border-white/10 bg-[#0000009A] shadow-[0_6px_18px_rgba(0,0,0,0.45)] font-montserrat text-base font-semibold text-white landscape-xs:top-0 landscape-xs:px-3 landscape-xs:py-1.5 landscape-xs:text-sm"
        style={isAppInToss ? {} : {
          top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          left: 'calc(env(safe-area-inset-left, 0px) + 1rem)'
        }}
      >
        <span className="text-[#FFEE00] drop-shadow-[0_0_6px_rgba(255,238,0,0.45)]">
          Best:
        </span>
        <span
          id="best-score-number"
          className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.45)]"
        >
          {bestScore}
        </span>
      </div>

      <div
        id="scoreboard-container"
        className="pointer-events-none absolute top-[12%] left-1/2 -translate-x-1/2 flex flex-col items-center justify-center w-[148px] px-6 py-4 rounded-[24px] border border-white/10 bg-[#00000099] shadow-[0_12px_28px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.35)] transition-all duration-300 landscape-xs:w-[140px] landscape-xs:px-5 landscape-xs:py-3"
      >
        <div className="mb-1 font-montserrat text-xs font-bold uppercase tracking-[0.16em] text-white/75 landscape-xs:text-[10px]">
          Lives {lives.remaining}/{lives.total}
        </div>
        <div className="font-montserrat text-[72px] font-black tracking-wide leading-none text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.7)] landscape-xs:text-[32px]">
          {displayScore}
        </div>
      </div>
    </>
  );
}
