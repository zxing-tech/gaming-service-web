'use client';

import { useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TouchGuide } from '@/components/hud/TouchGuide';
import { ShotInfoHud } from '@/components/hud/ShotInfoHud';
import { ScoreDisplay } from '@/components/hud/ScoreDisplay';
import { TierChangeHud } from '@/components/hud/TierChangeHud';
import { GoalCelebration } from '@/components/hud/GoalCelebration';
import { LoadingScreen } from './components/screens/LoadingScreen';
import { PauseButton } from './components/hud/PauseButton';
import { PauseModal } from './components/modals/PauseModal';
import { GameOverModal } from './components/modals/GameOverModal';
import { ContinueModal } from './components/modals/ContinueModal';
import { Toaster } from '@/lib/toast';

function GameContent() {
  const searchParams = useSearchParams();
  const initializationRef = useRef(false);

  const friendScore = useMemo(() => {
    const scoreParam = searchParams?.get('score');
    if (!scoreParam) return undefined;
    const parsed = Number.parseInt(scoreParam, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [searchParams]);

  const uuidOverride = useMemo(() => {
    const uuid = searchParams?.get('uuid');
    return uuid && uuid.length > 0 ? uuid : undefined;
  }, [searchParams]);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const load = async () => {
      const { loadGame } = await import('../src/core/GameLoader');
      await loadGame({
        score: friendScore,
        uuid: uuidOverride,
      });
    };

    void load();
  }, [friendScore, uuidOverride]);

  return null;
}

export default function HomePage() {
  return (
    <div id="game-container">
      <LoadingScreen />
      <canvas id="game-canvas" />
      <div id="ui" className="pointer-events-none">
        <TouchGuide />
        <ShotInfoHud />
        <TierChangeHud />
        <ScoreDisplay />
        <GoalCelebration />
        <PauseButton />
        
        <PauseModal />
        <GameOverModal />
        <ContinueModal />
      </div>
      <Suspense>
        <GameContent />
      </Suspense>
      <Toaster
        position="top-center"
        containerStyle={{
          top: 'calc(10px + env(safe-area-inset-top, 0px))'
        }}
      />
    </div>
  );
}
