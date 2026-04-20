'use client';

import { useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TouchGuide } from '@/components/hud/TouchGuide';
import { ShotInfoHud } from '@/components/hud/ShotInfoHud';
import { ScoreDisplay } from '@/components/hud/ScoreDisplay';
import { TermsNotice } from '@/components/hud/TermsNotice';
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

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const load = async () => {
      const { loadGame } = await import('../src/core/GameLoader');
      loadGame(friendScore ? { score: friendScore } : undefined);
    };

    void load();
  }, [friendScore]);

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
        <ScoreDisplay />
        <TermsNotice />
        <PauseButton />
        
        <PauseModal />
        <GameOverModal />
        <ContinueModal />
      </div>
      <Suspense>
        <GameContent />
      </Suspense>
      <Toaster />
    </div>
  );
}
