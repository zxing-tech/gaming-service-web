'use client';

import { useState, useEffect } from 'react';
import { BALL_THEMES } from '@/../src/config/Ball';
import { gameStateService } from '@/../src/core/GameStateService';
import { gameEventBus } from '@/lib/gameEventBus';

// Lock Icon Component
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mb-0.5 text-white/90">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function CustomizeView() {
  const [unlockedThemes, setUnlockedThemes] = useState<Record<string, boolean>>({});
  const [_currentTheme, setCurrentTheme] = useState<string>('Basic');

  useEffect(() => {
    // Initialize unlocked status
    const checkUnlocked = () => {
      const status: Record<string, boolean> = {};
      Object.values(BALL_THEMES).forEach((theme) => {
        status[theme.name] = gameStateService.isThemeUnlocked(theme.unlockScore);
      });
      setUnlockedThemes(status);
      
      // Get current theme from GameStateService or just default?
      // GameStateService doesn't seem to expose 'getCurrentTheme' easily without looking at code.
      // But we can just let the user select.
    };

    checkUnlocked();
  }, []);

  const handleThemeSelect = (themeName: string, unlockScore: number) => {
    if (!gameStateService.isThemeUnlocked(unlockScore)) return;

    setCurrentTheme(themeName);
    gameEventBus.emit({ type: 'THEME_CHANGED', themeName });
  };

  const themes = [
    BALL_THEMES.BASIC,
    BALL_THEMES.BASKETBALL,
    BALL_THEMES.VOLLEYBALL,
    BALL_THEMES.SUN,
    BALL_THEMES.MOON,
    BALL_THEMES.EARTH,
    BALL_THEMES.BEACHBALL,
    BALL_THEMES.MONSTERBALL,
    BALL_THEMES.WORLDCUP2010,
  ];

  return (
    <div className="w-full max-w-md flex flex-col gap-6 pb-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-white/90 font-semibold text-lg">Ball Theme</h3>
        
        <div className="grid grid-cols-3 gap-4">
          {themes.map((theme) => {
            const isUnlocked = unlockedThemes[theme.name];

            return (
              <div key={theme.name} className="relative aspect-square">
                <button
                  type="button"
                  onClick={() => handleThemeSelect(theme.name, theme.unlockScore)}
                  className={`
                    w-full h-full rounded-full
                    bg-white/12 border-2 border-white/15
                    shadow-[0_4px_12px_rgba(0,0,0,0.2)]
                    transition-all duration-150
                    flex items-center justify-center
                    overflow-hidden p-2
                    ${isUnlocked 
                      ? 'hover:bg-white/16 hover:border-white/30 hover:shadow-[0_6px_16px_rgba(0,0,0,0.3)] active:bg-white/10 active:shadow-[0_2px_6px_rgba(0,0,0,0.2)] cursor-pointer' 
                      : 'cursor-not-allowed'}
                  `}
                >
                  {/* We use regular img tag here because assets are in public or src/assets, 
                      but BALL_THEMES.imageUrl likely points to a path. 
                      If it's an imported asset, Next.js Image is better.
                      Let's check BALL_THEMES structure. 
                      Assuming imageUrl is a string path or imported module.
                  */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={theme.imageUrl} 
                    alt={theme.name} 
                    className={`w-full h-full object-contain ${isUnlocked ? '' : 'opacity-30'}`}
                  />
                </button>

                {!isUnlocked && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center pointer-events-none gap-1">
                    <LockIcon />
                    <div className="text-white/90 text-xs font-semibold text-center px-2 leading-tight">
                      Unlock at {theme.unlockScore} goals
                    </div>
                    <div className="text-white/80 text-[10px] text-center px-2">
                      Locked
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
