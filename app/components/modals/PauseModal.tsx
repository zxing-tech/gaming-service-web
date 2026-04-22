'use client';

import { useState } from 'react';
import { useGameEvent } from '@/hooks/useGameEvent';
import { gameEventBus } from '@/lib/gameEventBus';
import { CustomizeView } from '@/components/views/CustomizeView';
import { gameStateService } from '@/../src/core/GameStateService';
import { showToast } from '@/lib/toast';
import { TOSS_CONFIG } from '@/../src/config/TossConfig';
import { isTossGameCenterAvailable } from '@/../src/utils/TossEnvironment';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/Modal';
import { StyledIconButton } from '@/components/common/StyledIconButton';
import { Ranking, Palette, Gear, ArrowClockwise, Play } from '@phosphor-icons/react';
import { type ElementType } from 'react';

export function PauseModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'pause' | 'settings' | 'customize'>('pause');
  
  // Audio Settings State
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [masterVolume, setMasterVolume] = useState(1);

  useGameEvent('SHOW_PAUSE_MODAL', (event) => {
    if (event.show) {
      setIsOpen(true);
      setView('pause');
      // Load current audio settings
      const settings = gameStateService.getAudioSettings();
      setSfxEnabled(settings.sfxEnabled);
      setMasterVolume(settings.masterVolume);
      
      gameEventBus.emit({ type: 'GAME_PAUSED' });
    } else {
      setIsOpen(false);
      gameEventBus.emit({ type: 'GAME_RESUMED' });
    }
  });

  const handleClose = () => {
    setIsOpen(false);
    gameEventBus.emit({ type: 'SHOW_PAUSE_MODAL', show: false });
  };

  const handleRestart = () => {
    handleClose();
    gameEventBus.emit({ type: 'RESTART_GAME' } as any); 
  };

  const handleContinue = () => {
    // Unlock audio context logic is handled by user interaction here
    gameEventBus.emit({ type: 'UNLOCK_AUDIO' });
    handleClose();
  };

  // Audio Handlers
  const toggleSfx = (enabled: boolean) => {
    setSfxEnabled(enabled);
    gameStateService.setSfxEnabled(enabled);
    gameEventBus.emit({ type: 'SFX_ENABLED_CHANGED', enabled });
  };

  const changeMasterVolume = (volume: number) => {
    setMasterVolume(volume);
    gameStateService.setMasterVolume(volume);
    gameEventBus.emit({ type: 'MASTER_VOLUME_CHANGED', volume });
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

  const getTitle = () => {
    switch (view) {
      case 'pause': return 'Paused';
      case 'settings': return 'Settings';
      case 'customize': return 'Theme';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closeOnEsc={true} closeOnBackdrop={false}>
      <ModalHeader 
        title={getTitle()}
        onBack={view !== 'pause' ? () => setView('pause') : undefined}
      />
      
      <ModalContent centered={view === 'pause'}>
        {view === 'pause' && (
          <div className="flex gap-6 w-full max-w-lg justify-center">
            <StyledIconButton 
              Icon={Ranking} 
              label="Ranking" 
              variant="ranking"
              onClick={handleRanking}
            />
            <StyledIconButton 
              Icon={Palette} 
              label="Theme" 
              variant="theme"
              onClick={() => setView('customize')} 
            />
            <StyledIconButton 
              Icon={Gear} 
              label="Settings" 
              variant="settings"
              onClick={() => setView('settings')} 
            />
          </div>
        )}

        {view === 'settings' && (
          <div className="w-full max-w-md flex flex-col gap-4">
            <ToggleSection 
              label="SFX" 
              checked={sfxEnabled} 
              onChange={toggleSfx} 
            />
            <VolumeSection 
              volume={masterVolume} 
              onChange={changeMasterVolume} 
            />
          </div>
        )}

        {view === 'customize' && (
          <CustomizeView />
        )}
      </ModalContent>

      {view === 'pause' && (
        <ModalFooter>
          <div className="flex items-center justify-center gap-6">
            <CircleButton 
              Icon={ArrowClockwise} 
              size="w-16 h-16" 
              iconSize="text-3xl"
              onClick={handleRestart}
            />
            <CircleButton 
              Icon={Play} 
              size="w-20 h-20" 
              iconSize="text-4xl"
              isLarge 
              onClick={handleContinue}
            />
          </div>
        </ModalFooter>
      )}
    </Modal>
  );
}

// Sub-components

function CircleButton({ Icon, size, iconSize, isLarge, onClick }: { Icon: ElementType; size: string; iconSize: string; isLarge?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        ${size} rounded-full flex items-center justify-center transition-transform active:scale-90
        ${isLarge 
          ? 'bg-gradient-to-br from-[#4facfe] to-[#00f2fe] shadow-[0_8px_20px_rgba(79,172,254,0.5)] border-[3px] border-[#4facfe]/80' 
          : 'bg-gradient-to-br from-white/25 to-white/15 shadow-[0_6px_16px_rgba(0,0,0,0.25)] border-[2px] border-white/35'}
      `}
    >
      <Icon weight="fill" className={`${iconSize} text-white drop-shadow-md`} />
    </button>
  );
}

function ToggleSection({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="w-full flex items-center justify-between py-3">
      <div className="text-white/90 font-medium">{label}</div>
      <label className="relative inline-block w-12 h-6 cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <div className="absolute inset-0 rounded-full bg-white/15 transition-colors peer-checked:bg-white/55"></div>
        <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : ''}`}></div>
      </label>
    </div>
  );
}

function VolumeSection({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  return (
    <div className="w-full flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between">
        <div className="text-white/90 font-medium">Master Volume</div>
        <div className="text-white/90 font-medium">{Math.round(volume * 100)}%</div>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={Math.round(volume * 100)} 
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-white"
      />
    </div>
  );
}
