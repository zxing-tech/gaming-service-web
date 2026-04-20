'use client';

import { useState } from 'react';

export function TermsNotice() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="pointer-events-auto absolute right-3 top-3 z-[8] rounded-full border border-white/30 bg-black/45 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_22px_rgba(0,0,0,0.4)]"
      >
        Terms & Conditions
      </button>

      {isOpen && (
        <div className="pointer-events-auto absolute inset-x-3 top-14 z-[8] rounded-2xl border border-white/20 bg-black/70 p-4 text-left text-xs leading-relaxed text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
          <div className="mb-2 text-sm font-bold">Terms & Conditions</div>
          <p>1. The game is played with 3 lives. Each miss costs 1 life.</p>
          <p>2. Score as many goals as possible with available lives. Session score totals all goals across the 3 lives.</p>
          <p>3. The game ends automatically when top prize points are achieved.</p>
          <p>4. Difficulty is fixed at standard for the full session.</p>
          <p>5. If idle for 1 minute, the game auto-terminates and current score is awarded as-is.</p>
          <p>6. In the event of dispute, resolution is at Grab&apos;s discretion.</p>
          <p>7. Terms & Conditions must be displayed on Grab first and can also be shown on this platform.</p>
        </div>
      )}
    </>
  );
}
