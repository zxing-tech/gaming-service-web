'use client';

import { BALL_THEMES } from '@/../src/config/Ball';

export function CustomizeView() {
  const theme = BALL_THEMES.BASIC;

  return (
    <div className="w-full max-w-md flex flex-col gap-6 pb-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-white/90 font-semibold text-lg">Ball</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="relative aspect-square max-w-[180px] mx-auto">
            <div
              className="
                w-full h-full rounded-full
                bg-white/12 border-2 border-white/25
                shadow-[0_4px_12px_rgba(0,0,0,0.2)]
                flex items-center justify-center
                overflow-hidden p-2
              "
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme.imageUrl}
                alt={theme.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
