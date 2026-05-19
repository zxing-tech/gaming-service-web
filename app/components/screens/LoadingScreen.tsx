'use client';

import { useState, useRef } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';
import { gameEventBus } from '@/lib/gameEventBus';
import Image from 'next/image';
import { getAssetPath } from '@/../src/utils/assetPath';

const FOOTBALL_MESSAGES = [
  'Putting on socks...',
  'Tying football boots...',
  'Wearing shin guards...',
  'Putting on the kit...',
  'Stretching...',
  'Checking the pitch...',
  'Getting into game mode...',
  'Greeting the referee...',
];

export function LoadingScreen() {
  const loadingBackgroundUrl = getAssetPath('/assets/pexels-boom-12585891.jpg');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(FOOTBALL_MESSAGES[0]);
  const [stage, setStage] = useState<'loading' | 'tap' | 'swipe' | 'hiding' | 'hidden'>('loading');
  
  // Animation states
  const [ballTransform, setBallTransform] = useState('');
  const [titleTransform, setTitleTransform] = useState('');
  const [containerOpacity, setContainerOpacity] = useState(1);
  const [tapOpacity, setTapOpacity] = useState(0);
  const [ballOpacity, setBallOpacity] = useState(0);
  const [isShooting, setIsShooting] = useState(false);

  // Swipe logic
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeStartTimeRef = useRef<number>(0);

  useGameEvent('LOADING_PROGRESS', (event) => {
    const newProgress = Math.min(Math.max(event.progress * 100, 0), 100);
    setProgress(newProgress);

    // Update message
    const messageIndex = Math.min(
      Math.floor((event.progress * FOOTBALL_MESSAGES.length)),
      FOOTBALL_MESSAGES.length - 1
    );
    setMessage(FOOTBALL_MESSAGES[messageIndex]);

    if (newProgress >= 100 && stage === 'loading') {
      transitionToStage2();
    }
  });

  useGameEvent('LOADING_COMPLETE', () => {
    if (stage === 'loading') {
      setProgress(100);
      transitionToStage2();
    }
  });

  // When the game-over modal appears, we must not be sitting on top of the
  // canvas demanding a tap/swipe (covers the "already submitted" short-circuit
  // and any other path that opens the modal before loading finishes).
  useGameEvent('SHOW_GAME_OVER_MODAL', () => {
    setStage('hidden');
  });

  const transitionToStage2 = () => {
    setStage('tap');
    setTimeout(() => setTapOpacity(1), 200);
  };

  const handleTap = () => {
    if (stage !== 'tap') return;

    // Unlock audio
    gameEventBus.emit({ type: 'UNLOCK_AUDIO' });

    setTapOpacity(0);
    setTimeout(() => {
      setStage('swipe');
      setBallOpacity(1);
    }, 500);
  };

  const handlePointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    if (stage !== 'swipe') return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    
    swipeStartRef.current = { x: clientX, y: clientY };
    swipeStartTimeRef.current = Date.now();
  };

  const handlePointerUp = (e: React.PointerEvent | React.TouchEvent) => {
    if (stage !== 'swipe' || !swipeStartRef.current) return;

    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.PointerEvent).clientY;

    const deltaX = clientX - swipeStartRef.current.x;
    const deltaY = clientY - swipeStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - swipeStartTimeRef.current;
    const speed = distance / (duration || 1);

    // Swipe detection (simple threshold)
    if (distance > 50 && deltaY < -30) { // Swipe up
      animateShot(deltaX, deltaY, speed);
    }

    swipeStartRef.current = null;
  };

  const animateShot = (deltaX: number, _deltaY: number, speed: number) => {
    const force = Math.min(Math.max(speed, 0.5), 5);
    const translateX = deltaX * force * 1.5;
    const translateY = -window.innerHeight * 0.8;
    const rotation = (deltaX / Math.abs(deltaX || 1)) * 720;

    // 1. Stop bounce first
    setIsShooting(true);

    // 2. Start animation in next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBallTransform(`translate(${translateX}px, ${translateY}px) scale(0.3) rotate(${rotation}deg)`);
        setTitleTransform('translateY(-150px)');
        
        // Start game
        gameEventBus.emit({ type: 'GAME_STARTED' });

        setTimeout(() => {
          setContainerOpacity(0);
          setTimeout(() => {
            setStage('hidden');
          }, 600);
        }, 500);
      });
    });
  };

  if (stage === 'hidden') return null;

  return (
    <div 
      className={`loading-screen fixed inset-0 z-[20] flex w-full h-[100dvh] flex-col items-center justify-start pt-[18vh] transition-opacity duration-500 ease-out text-white overflow-hidden ${stage === 'hiding' ? 'pointer-events-none' : ''}`}
      style={{
        opacity: containerOpacity,
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.62)), url("${loadingBackgroundUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } as any}
    >
      {/* Title Section */}
      <div 
        className="loading-screen__title mb-20 text-center animate-fade-in-down-large transition-all duration-800 ease-out"
        style={{ transform: titleTransform, opacity: titleTransform ? 0 : 1 }}
      >
        <h1 className="mx-6 text-[48px] leading-none font-extrabold tracking-tight text-white [text-shadow:0_4px_14px_rgba(0,0,0,0.25)]">
          FreeKick!
        </h1>
      </div>

      {/* Stage 1: Progress */}
      <div 
        className="loading-screen__stage1-container absolute left-1/2 bottom-[80px] -translate-x-1/2 flex w-[500px] max-w-[80vw] flex-col items-center gap-12 transition-opacity duration-300 ease-out"
        style={{ opacity: stage === 'loading' ? 1 : 0, pointerEvents: stage === 'loading' ? 'auto' : 'none' }}
      >
        <div className="loading-screen__progress-container relative w-full">
          <div className="loading-screen__progress-bar relative h-5 w-full overflow-hidden rounded-full bg-black/30 backdrop-blur-sm border-2 border-white/20 shadow-inner">
            <div 
              className="loading-screen__progress-fill relative h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7),0_0_20px_rgba(74,144,226,0.5)] transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="loading-screen__progress-shine absolute left-[-100%] top-0 h-full w-full animate-shine bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0)_100%)]" />
            </div>
            <span className="loading-screen__progress-text absolute inset-0 flex items-center justify-center text-xs font-bold text-black [text-shadow:0_1px_4px_rgba(0,0,0,0.2)]">
              {Math.floor(progress)}%
            </span>
          </div>
        </div>
        <div className="loading-screen__message min-h-[24px] text-center text-[20px] font-bold text-[rgba(255,255,255,0.95)] [text-shadow:0_1px_4px_rgba(0,0,0,0.2)] font-chiron">
          {message}
        </div>
      </div>

      {/* Stage 2: Tap to Start */}
      <div 
        className="loading-screen__tap-to-start fixed inset-0 flex flex-col items-center justify-end pb-[10vh] transition-opacity duration-500 z-[37] cursor-pointer"
        style={{ opacity: tapOpacity, pointerEvents: stage === 'tap' ? 'auto' : 'none' }}
        onClick={handleTap}
      >
        <div className="text-[20px] font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.2)] animate-pulse font-chiron">
         Tap to Start
        </div>
      </div>

      {/* Stage 3: Swipe to Start (Soccer Ball) */}
      <div 
        className="loading-screen__soccer-ball-container absolute left-1/2 bottom-[10vh] -translate-x-1/2 flex w-[min(90vw,360px)] flex-col items-center gap-8 px-4 transition-opacity duration-1000 z-[35]"
        style={{ opacity: ballOpacity, pointerEvents: 'none' }}
      >
        <Image 
          src={getAssetPath('/assets/soccer_ball.png')}
          width={72}
          height={72} 
          alt="Soccer Ball" 
          className={`loading-screen__soccer-ball w-[72px] h-[72px] cursor-pointer drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)] ${!isShooting ? 'animate-bounce' : ''}`}
          style={{ 
            transform: ballTransform, 
            transition: isShooting ? 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none' 
          }}
        />
        <div className="animate-pulse whitespace-nowrap text-center text-[20px] font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.2)] font-chiron">
          Swipe up to Start
        </div>
      </div>

      {/* Swipe Detection Overlay */}
      {stage === 'swipe' && (
        <div
          className="fixed inset-0 z-[40] touch-none"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
        />
      )}
      {/* Rating Badge */}
      <Image
        src={getAssetPath('/assets/GRAC_ALL.png')}
        alt="Rating"
        width={60}
        height={60}
        className="loading-screen__rating-badge absolute right-[16px] bottom-[16px] w-[60px] h-[60px] opacity-90 animate-fade-in z-[25]"
      />
    </div>
  );
}
