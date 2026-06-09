'use client';

import { useState } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';
import { gameEventBus } from '@/lib/gameEventBus';
import { showToast } from '@/lib/toast';
// import { TOSS_CONFIG } from '@/../src/config/TossConfig';
// import { isTossApp, isTossGameCenterAvailable } from '@/../src/utils/TossEnvironment';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/Modal';
// import { StyledIconButton } from '@/components/common/StyledIconButton';
import { ArrowClockwise } from '@phosphor-icons/react';
// import { Ranking, ShareNetwork } from '@phosphor-icons/react';

const SHARE_MESSAGES = [
  'SnapShoot ⚽️ {score} points! Think you can beat me?\n\nTry now 👇',
  'SnapShoot ⚽️ {score} points! Your turn to challenge me 👇',
  'Locked in today... scored {score} in SnapShoot ⚽️\n\nPlay now 👇',
  'Curler master mode ON 😎 SnapShoot ⚽️ {score} points!\n\nTake your shot 👇'
] as const;

export function getRandomShareMessage(score: number): string {
  const randomIndex = Math.floor(Math.random() * SHARE_MESSAGES.length);
  const template = SHARE_MESSAGES[randomIndex];
  return template.replace('{score}', score.toLocaleString('en-US'));
}

export function GameOverModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [tokenId, setTokenId] = useState('-');
  const [redeemedReward, setRedeemedReward] = useState('Not Redeemed');

  const isWinner = score > 0;

  useGameEvent('SHOW_GAME_OVER_MODAL', (event) => {
    setIsOpen(true);
    setScore(event.score ?? 0);
    setPoints(event.points ?? event.score ?? 0);
    setTokenId(event.tokenId ?? '-');
    setRedeemedReward(event.redeemedReward ?? 'Not Redeemed');
  });

  // Backend reward (from the admin inventory) arrives async after score submit;
  // overwrite the client-side placeholder reward + token once it does.
  useGameEvent('UPDATE_REDEEMED_REWARD', (event) => {
    if (event.redeemedReward) setRedeemedReward(event.redeemedReward);
    if (event.tokenId) setTokenId(event.tokenId);
    if (event.points !== undefined) setPoints(event.points);
  });

  const handleRestart = () => {
    setIsOpen(false);
    gameEventBus.emit({ type: 'RESTART_GAME' } as any);
  };

  /* handleShare and handleRanking commented out — buttons hidden */
  /*
  const handleShare = async () => { ... };
  const handleRanking = async () => { ... };
  */

  return (
    <Modal isOpen={isOpen} closeOnEsc={false} closeOnBackdrop={false}>
      <ModalHeader
        title={isWinner ? '🏆 YOU WON!' : 'GAME OVER'}
      />

      <ModalContent centered={false} className="px-5 sm:px-6">
          <>
            {/* Score Display */}
            <div className="flex flex-col items-center gap-1 py-5 animate-fade-in">
              {isWinner && (
                <div className="winner-title mb-1 text-[13px] font-extrabold uppercase tracking-[0.2em] text-yellow-300">
                  Amazing! 🎉
                </div>
              )}
              <div className="text-white/70 font-semibold text-[11px] uppercase tracking-[0.22em]">Final Score</div>
              <div className={`font-russo font-black tracking-tight drop-shadow-lg text-[clamp(52px,11vw,74px)] leading-none ${isWinner ? 'winner-score' : 'text-white'}`}>
                {score.toLocaleString()}
              </div>
            </div>

            <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_100%)] px-4 py-3.5 text-white/95 shadow-[0_10px_26px_rgba(0,0,0,0.35)] backdrop-blur-md">
              <div className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-white">Reward Summary</div>
              <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2.5">
                <div className="grid grid-cols-[98px_1fr] items-center gap-x-3 gap-y-2 text-[15px] leading-tight sm:grid-cols-[118px_1fr]">
                  <div className="text-white/65 text-[13px] font-semibold">Token ID</div>
                  <button
                    type="button"
                    title={tokenId}
                    onClick={async () => {
                      if (tokenId === '-') return;
                      try {
                        await navigator.clipboard.writeText(tokenId);
                        showToast.success('Token ID copied');
                      } catch {
                        showToast.error('Copy failed');
                      }
                    }}
                    className="font-mono text-[12px] sm:text-[13px] text-left underline-offset-2 hover:underline focus:outline-none"
                  >
                    {tokenId.length > 16 ? `${tokenId.slice(0, 8)}…${tokenId.slice(-4)}` : tokenId}
                  </button>
                  <div className="text-white/65 text-[13px] font-semibold">Points</div>
                  <div className="font-extrabold text-[20px]">{points.toLocaleString()}</div>
                  <div className="text-white/65 text-[13px] font-semibold">Redeemed Reward</div>
                  <div className="font-semibold text-[14px] sm:text-[15px]">{redeemedReward}</div>
                </div>
              </div>
            </div>

            {/* Top Buttons — hidden for now */}
            {/* <div className="mt-4 flex gap-5 w-full max-w-lg justify-center">
              <StyledIconButton
                Icon={Ranking}
                label="Ranking"
                variant="ranking"
                onClick={handleRanking}
              />
              <StyledIconButton
                Icon={ShareNetwork}
                label="Share"
                variant="share"
                onClick={handleShare}
              />
            </div> */}
          </>
      </ModalContent>

      <ModalFooter>
          <button
            onClick={handleRestart}
            className={`
              flex items-center gap-2
              px-10 py-4 rounded-full
              text-white font-bold text-lg
              transition-all duration-150
              relative overflow-hidden
              active:scale-95
              group
              ${isWinner
                ? 'bg-gradient-to-br from-yellow-400/90 to-orange-500/90 border-2 border-yellow-300/60 shadow-[0_12px_32px_rgba(255,180,0,0.45)]'
                : 'backdrop-blur-sm bg-gradient-to-br from-white/25 to-white/15 border-2 border-white/40 shadow-[0_12px_32px_rgba(0,0,0,0.4)]'
              }
            `}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
            <div className="relative z-[2] flex items-center gap-2">
              <ArrowClockwise weight="fill" className="text-2xl drop-shadow-md group-active:scale-90 transition-transform" />
              <span>Return to Grab</span>
            </div>
          </button>
        </ModalFooter>
    </Modal>
  );
}
