
import { SnapShoot } from './SnapShoot';
import { gameStateService } from './GameStateService';
import { debugSettings } from './DebugSettings';
import { getUserKeyForGame } from '@apps-in-toss/web-framework';
import { isTossGameCenterAvailable, logEnvironmentInfo } from '../utils/TossEnvironment';
import { TOSS_CONFIG } from '../config/TossConfig';


/**
 * Show friend score notification.
 */
function showFriendScoreNotification(friendScore: number): void {
  const notification = document.createElement('div');
  notification.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none';
  notification.innerHTML = `
    <div class="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-lg shadow-lg">
      <p class="text-sm font-bold">Your friend scored ${friendScore.toLocaleString('en-US')} points!</p>
      <p class="text-xs mt-1">Can you beat it? 🔥</p>
    </div>
  `;

  document.body.appendChild(notification);


  setTimeout(() => {
    notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

export function loadGame(params?: { score?: number }) {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiContainer = document.getElementById('ui') as HTMLDivElement | null;

  if (!canvas || !uiContainer) {
    throw new Error('Required DOM elements were not found.');
  }


  if (params?.score) {
    console.log(`🎯 Friend score: ${params.score}`);
    showFriendScoreNotification(params.score);
  }




  logEnvironmentInfo();


  if (TOSS_CONFIG.GAME_CENTER_ENABLED && isTossGameCenterAvailable()) {
    getUserKeyForGame()
      .then((result) => {
        if (!result) {
          console.warn('⚠️ Toss app version is too old.');
          return;
        }

        if (result === 'INVALID_CATEGORY') {
          console.warn('⚠️ This mini app is not in the game category.');
          return;
        }

        if (result === 'ERROR') {
          console.error('❌ Failed to fetch user key');
          return;
        }


        if (result.type === 'HASH') {
          console.log('✅ Game login successful');
          console.log('🔑 User key:', result.hash.substring(0, 8) + '...');

          localStorage.setItem('toss_user_key', result.hash);
        }
      })
      .catch((error) => {
        console.error('❌ Game login error:', error);

      });
  }

  const game = new SnapShoot(
    canvas,
    () => {}
  );

  const selectedTier = gameStateService.getSelectedTier();
  const appliedTier = gameStateService.setSelectedTier(selectedTier);
  game.applyTierDifficulty(appliedTier);
  console.log(`🎚️ Session tier applied: ${appliedTier}`);

  // Mute all game audio for now.
  gameStateService.setMusicEnabled(false);
  game.setMusicEnabled(false);
  const audioSettings = gameStateService.getAudioSettings();
  gameStateService.setSfxEnabled(false);
  game.setSfxEnabled(false);
  game.setMasterVolume(audioSettings.masterVolume);


  debugSettings.registerDebugToggler((enabled) => game.toggleDebugMode(enabled));








  // Apps in Toss guideline: ensure audio does not keep playing in background.
  const handleVisibilityChange = () => {
    if (document.hidden) {

      console.log('🔇 App moved to background: pausing audio');
      game.pauseAudio();
    } else {




      console.log('📱 App returned to foreground: opening PauseModal');
      import('../../app/lib/gameEventBus').then(({ gameEventBus }) => {
        gameEventBus.emit({ type: 'SHOW_PAUSE_MODAL', show: true });
      });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);


}
