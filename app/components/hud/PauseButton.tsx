'use client';

import { gameEventBus } from '@/lib/gameEventBus';

import { Pause } from '@phosphor-icons/react';

export function PauseButton() {
  const handleClick = () => {
    gameEventBus.emit({ type: 'SHOW_PAUSE_MODAL', show: true });
  };

  return (
    <button
      id="pause-button"
      title="Pause"
      onClick={handleClick}
      className={`
        absolute bottom-4 left-4
        w-12 h-12
        flex items-center justify-center
        rounded-2xl
        border border-white/10
        bg-[#0000009A]
        shadow-[0_6px_18px_rgba(0,0,0,0.35)]
        transition-all duration-150
        hover:bg-[#000000b0]
        hover:shadow-[0_10px_24px_rgba(0,0,0,0.45)]
        active:bg-[#0000008c]
        active:shadow-[0_2px_8px_rgba(0,0,0,0.35)]
        pointer-events-auto
        cursor-pointer
        z-[10]
        touch-manipulation
      `}
      style={{
        bottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))',
        left: 'max(1rem, calc(env(safe-area-inset-left, 0px) + 1rem))'
      }}
    >
      <Pause weight="fill" className="text-2xl text-white" />
    </button>
  );
}
