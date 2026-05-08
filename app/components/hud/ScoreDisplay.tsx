'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';

export function ScoreDisplay() {
  const [displayScore, setDisplayScore] = useState(0);
  const [lives, setLives] = useState({ remaining: 2, total: 2 });
  const [tierTimer, setTierTimer] = useState({ remainingMs: 60_000, totalMs: 60_000, tierId: 1 as 1 | 2 | 3 });
  const animationFrameRef = useRef<number | null>(null);

  useGameEvent('SCORE_CHANGED', (event) => {
    animateScore(displayScore, event.score);
  });

  useGameEvent('LIVES_CHANGED', (event) => {
    setLives({ remaining: event.livesRemaining, total: event.totalLives });
  });

  useGameEvent('TIER_TIMER_UPDATED', (event) => {
    setTierTimer({
      remainingMs: event.remainingMs,
      totalMs: event.totalMs,
      tierId: event.tierId
    });
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
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Lives — compact on narrow phones; inset from notch / curved edges */}
      <div
        className="pointer-events-none absolute z-[7] inline-flex max-w-[42vw] items-center gap-1.5 rounded-[14px] border border-white/10 bg-[#0000008A] px-2 py-1 shadow-[0_6px_18px_rgba(0,0,0,0.45)] max-[380px]:gap-1 max-[380px]:rounded-[12px] max-[380px]:px-1.5"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 10px)'
        }}
      >
        {Array.from({ length: lives.total }).map((_, idx) => (
          <img
            key={idx}
            src="/assets/soccer_ball.svg"
            alt=""
            role="presentation"
            className={`h-7 w-7 shrink-0 object-contain max-[380px]:h-6 max-[380px]:w-6 ${idx < lives.remaining ? 'opacity-100' : 'opacity-25 grayscale'}`}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute z-[7] inline-flex items-center gap-2 rounded-[14px] border border-white/15 bg-[#00000096] px-2.5 py-1 shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 10px)'
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
          T{tierTimer.tierId}
        </span>
        <span className="font-mono text-[16px] font-extrabold leading-none tabular-nums text-white">
          {formatMsToClock(tierTimer.remainingMs)}
        </span>
      </div>

      {/* Sponsor strip + score — width capped so it never spills past rounded displays */}
      <div
        className="pointer-events-none absolute left-1/2 z-[6] flex w-[min(280px,calc(100vw-16px))] max-w-[92vw] -translate-x-1/2 flex-col items-center px-1"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + max(6px, 1vh))'
        }}
      >
        <div className="flex h-9 w-[min(170px,min(48vw,170px))] shrink-0 items-center justify-center rounded border border-black/25 bg-[#B90E28] px-2 shadow-[0_8px_18px_rgba(0,0,0,0.4)] landscape-xs:h-7 landscape-xs:max-w-[min(130px,40vw)]">
          <img
            src="/assets/ads/image.png"
            alt=""
            className="max-h-full w-full object-contain"
          />
        </div>

        <div
          id="scoreboard-container"
          className="mt-1.5 w-full max-w-[248px] rounded border border-black/20 bg-[#D31738] shadow-[0_16px_30px_rgba(0,0,0,0.45)] landscape-xs:mt-1"
          style={{
            maxHeight: 'min(210px, 38svh)'
          }}
        >
          <div className="flex min-h-0 w-full flex-col items-center justify-center gap-1 overflow-hidden px-2 pb-3 pt-2 landscape-xs:gap-0.5 landscape-xs:pb-2 landscape-xs:pt-1.5">
            <img
              src="/assets/ads/image-white.png"
              alt=""
              className="mb-1 w-[min(90px,26vw)] shrink-0 object-contain opacity-95 landscape-xs:mb-0.5 landscape-xs:w-[min(66px,22vw)]"
            />
            <div className="font-montserrat text-[clamp(1.75rem,10.5vw,3.5rem)] font-black leading-none tracking-wide text-white drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)] landscape-xs:text-[clamp(1.5rem,9vw,2.25rem)] tabular-nums">
              {displayScore}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function formatMsToClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
