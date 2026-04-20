'use client';

import { useState } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';
import { gameEventBus } from '@/lib/gameEventBus';
import { CircularTimerButton } from '@/components/common/CircularTimerButton';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/Modal';
import { XCircle } from '@phosphor-icons/react';

export function ContinueModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  useGameEvent('SHOW_CONTINUE_MODAL', () => {
    setIsOpen(true);
    setIsAdLoading(false);
  });

  const handleGiveUp = () => {
    setIsOpen(false);
    gameEventBus.emit({ type: 'CONTINUE_GIVE_UP' });
  };

  const handleContinue = async () => {
    if (isAdLoading) return;
    setIsAdLoading(true);

    try {
      // TODO: Implement Ad logic here
      // For now, simulate ad success
      console.log('Ad started...');
      
      // Simulate ad duration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Ad completed!');
      setIsOpen(false);
      gameEventBus.emit({ type: 'CONTINUE_GAME_SUCCESS' });
    } catch (error) {
      console.error('Ad failed:', error);
      setIsAdLoading(false);
    }
  };

  const handleTimeout = () => {
    if (isOpen && !isAdLoading) {
      handleGiveUp();
    }
  };

  return (
    <Modal isOpen={isOpen} closeOnEsc={false} closeOnBackdrop={false}>
      <ModalHeader title="Do you want to continue?" className="animate-fade-in" />
      
      <ModalContent>
        <CircularTimerButton 
          duration={5}
          onComplete={handleTimeout}
          onClick={handleContinue}
          size={140}
        />
      </ModalContent>

      <ModalFooter>
        <button
          onClick={handleGiveUp}
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
            <XCircle weight="fill" className="text-2xl drop-shadow-md group-active:scale-90 transition-transform" />
            <span>Give Up</span>
          </div>
        </button>
      </ModalFooter>
    </Modal>
  );
}
