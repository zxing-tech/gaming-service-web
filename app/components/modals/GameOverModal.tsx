'use client';

import { useState } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';
import { gameEventBus } from '@/lib/gameEventBus';
import { showToast } from '@/lib/toast';
import { TOSS_CONFIG } from '@/../src/config/TossConfig';
import { isTossApp, isTossGameCenterAvailable } from '@/../src/utils/TossEnvironment';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/Modal';
import { StyledIconButton } from '@/components/common/StyledIconButton';
import { ArrowClockwise, Ranking, ShareNetwork } from '@phosphor-icons/react';

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

  useGameEvent('SHOW_GAME_OVER_MODAL', (event) => {
    setIsOpen(true);
    setScore(event.score);
    setPoints(event.points ?? event.score);
    setTokenId(event.tokenId ?? '-');
    setRedeemedReward(event.redeemedReward ?? 'Not Redeemed');
  });

  const handleRestart = () => {
    setIsOpen(false);
    gameEventBus.emit({ type: 'RESTART_GAME' } as any);
  };

  const handleShare = async () => {
    try {

      const currentScore = score;


      const message = getRandomShareMessage(currentScore);


      if (isTossApp()) {

        const environment = typeof process !== 'undefined'
          ? process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development'
          : 'development';
        const scheme = environment === 'production' ? 'intoss' : 'intoss-private';
        const deepLink = `${scheme}://snapshoot?score=${currentScore}`;

      console.log(`📤 Share started (Toss app) - env: ${environment}, deepLink: ${deepLink}`);

        const { getTossShareLink, share } = await import('@apps-in-toss/web-framework');
        const tossShareLink = await getTossShareLink(deepLink);
        await share({
          message: `${message}\\n${tossShareLink}`
        });

        console.log('✅ Share successful! (Toss app)');
      } else {

        const webLink =
          (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WEB_SHARE_URL) ||
          'https://github.com/zxing-tech/gaming-service-web';
        const shareText = `${message}\\n${webLink}`;

        console.log(`📤 Share started (web) - link: ${webLink}`);


        if (navigator.share) {
          await navigator.share({
            text: shareText
          });
          console.log('✅ Share successful! (Web Share API)');
        } else {

          await navigator.clipboard.writeText(shareText);
          showToast.success('Share message copied to clipboard!\\nPaste it anywhere you like.');
          console.log('✅ Clipboard copy complete!');
        }
      }
    } catch (error) {
      console.error('❌ Share failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('cancel') || error.name === 'AbortError') {
          console.log('ℹ️ User canceled sharing.');
        } else {
          console.error('Share error:', error.message);
          showToast.error('An error occurred while sharing.\\nPlease try again.');
        }
      }
    }
  };

  const handleRanking = async () => {

    if (!TOSS_CONFIG.GAME_CENTER_ENABLED) {
      console.warn('ℹ️ Game Center is not enabled yet.');
      showToast.info('Ranking is coming soon.\\nPlease check back later!');
      return;
    }


    if (!isTossGameCenterAvailable()) {
      console.warn('ℹ️ Ranking is only available in the Toss app.');
      showToast.info('Ranking is only available in the Toss app.\\nPlease run the game in Toss.');
      return;
    }

    try {
      const { openGameCenterLeaderboard } = await import('@apps-in-toss/web-framework');
      await openGameCenterLeaderboard();
      console.log('✅ Opened Toss Game Center leaderboard');
    } catch (error) {
      console.error('❌ Failed to open leaderboard:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} closeOnEsc={false} closeOnBackdrop={false}>
      <ModalHeader 
        title="GAME OVER"
      />
      
      <ModalContent centered={false} className="px-5 sm:px-6">
          <>
            {/* Score Display */}
            <div className="flex flex-col items-center gap-1 py-5 animate-fade-in">
              <div className="text-white/70 font-semibold text-[11px] uppercase tracking-[0.22em]">Final Score</div>
              <div className="text-white font-russo font-black tracking-tight drop-shadow-lg text-[clamp(52px,11vw,74px)] leading-none">
                {score.toLocaleString()}
              </div>
            </div>

            <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_100%)] px-4 py-3.5 text-white/95 shadow-[0_10px_26px_rgba(0,0,0,0.35)] backdrop-blur-md">
              <div className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-white">Reward Summary</div>
              <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2.5">
                <div className="grid grid-cols-[98px_1fr] items-center gap-x-3 gap-y-2 text-[15px] leading-tight sm:grid-cols-[118px_1fr]">
                  <div className="text-white/65 text-[13px] font-semibold">Token ID</div>
                  <div className="font-mono text-[12px] sm:text-[13px] break-all">{tokenId}</div>
                  <div className="text-white/65 text-[13px] font-semibold">Points</div>
                  <div className="font-extrabold text-[20px]">{points.toLocaleString()}</div>
                  <div className="text-white/65 text-[13px] font-semibold">Redeemed Reward</div>
                  <div className="font-semibold text-[14px] sm:text-[15px]">{redeemedReward}</div>
                </div>
              </div>
            </div>

            {/* Top Buttons */}
            <div className="mt-4 flex gap-5 w-full max-w-lg justify-center">
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
            </div>
          </>
      </ModalContent>

      <ModalFooter>
          <button
            onClick={handleRestart}
            className="
              flex items-center gap-2
              px-16 py-4 rounded-full
              backdrop-blur-sm
              text-white font-bold text-lg
              transition-all duration-150
              relative overflow-hidden
              bg-gradient-to-br from-white/25 to-white/15
              border-2 border-white/40
              shadow-[0_12px_32px_rgba(0,0,0,0.4)]
              active:scale-95
              group
            "
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent pointer-events-none"></div>
            <div className="relative z-[2] flex items-center gap-2">
              <ArrowClockwise weight="fill" className="text-2xl drop-shadow-md group-active:scale-90 transition-transform" />
              <span>Restart</span>
            </div>
          </button>
        </ModalFooter>
    </Modal>
  );
}
