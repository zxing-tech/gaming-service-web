
import { SnapShoot } from './SnapShoot';
import { gameStateService } from './GameStateService';
import { debugSettings } from './DebugSettings';
import { getUserKeyForGame } from '@apps-in-toss/web-framework';
import { isTossGameCenterAvailable, logEnvironmentInfo } from '../utils/TossEnvironment';
import { TOSS_CONFIG } from '../config/TossConfig';
import { BackendClient } from '../services/BackendClient';


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

// The game requires a uuid before it can start when running inside Toss.
// Resolves to the user's hash (treated as uuid by Grab) or null when the
// SDK is unavailable / unauthorized (i.e. outside the Toss app shell).
async function resolveTossUuid(): Promise<string | null> {
  if (!(TOSS_CONFIG.GAME_CENTER_ENABLED && isTossGameCenterAvailable())) return null;

  try {
    const result = await getUserKeyForGame();
    if (!result) {
      console.warn('⚠️ Toss app version is too old.');
      return null;
    }
    if (result === 'INVALID_CATEGORY') {
      console.warn('⚠️ This mini app is not in the game category.');
      return null;
    }
    if (result === 'ERROR') {
      console.error('❌ Failed to fetch user key');
      return null;
    }
    if (result.type === 'HASH') {
      console.log('✅ Game login successful');
      console.log('🔑 User key:', result.hash.substring(0, 8) + '...');
      localStorage.setItem('toss_user_key', result.hash);
      return result.hash;
    }
    return null;
  } catch (error) {
    console.error('❌ Game login error:', error);
    return null;
  }
}

export async function loadGame(params?: { score?: number; uuid?: string }) {
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

  // Block the game until we have the uuid + user record. Outside Toss this
  // resolves to null and we run in offline mode (no backend persistence).
  // The ?uuid= query param is a dev override that bypasses the Toss SDK.
  const uuid = params?.uuid ?? (await resolveTossUuid());
  if (params?.uuid) {
    console.log(`🧪 Using uuid override from ?uuid= : ${params.uuid.substring(0, 8)}...`);
  }
  // Whether this user has already used their one play (first-score-wins). A
  // played user's Grab record holds a value: a numeric score, OR — once they win
  // a code-backed reward — the voucher code STRING we wrote back. Both count.
  // (A brand-new user returns c_score null/undefined.)
  let hasPlayed = false;
  let displayScore = 0;
  let lastReward: { label: string; token: string | null; score: number | null } | null = null;
  if (uuid) {
    try {
      const user = await BackendClient.getUser(uuid);
      console.log(`✅ Backend user loaded: c_score=${user.c_score}, merchant=${user.c_merchant_code}`);
      hasPlayed = user.c_score !== null && user.c_score !== undefined;
      lastReward = user.lastReward ?? null;
      // The number to show on the game-over screen: the score if c_score is
      // still numeric, else the score we logged alongside the awarded voucher.
      displayScore =
        typeof user.c_score === 'number' ? user.c_score : (lastReward?.score ?? 0);
    } catch (err) {
      console.error('❌ Backend getUser failed; continuing without persistence.', err);
    }
  } else {
    console.warn('ℹ️ No Toss uuid available — running without backend persistence.');
  }

  if (hasPlayed) {
    console.log(`🏁 Already played (c_score set). Skipping game and showing game-over screen.`);
    const { gameEventBus } = await import('../../app/lib/gameEventBus');
    gameEventBus.emit({
      type: 'SHOW_GAME_OVER_MODAL',
      score: displayScore,
      points: displayScore,
      // Show the reward they originally received, not a placeholder.
      tokenId: lastReward?.token ?? '-',
      redeemedReward: lastReward?.label ?? 'Not Redeemed',
    });
    return;
  }

  const game = new SnapShoot(
    canvas,
    () => {}
  );

  game.applyTierDifficulty(1);
  console.log('🎚️ Session tier initialized: Easy (auto progression enabled)');

  const audioSettings = gameStateService.getAudioSettings();
  gameStateService.setMusicEnabled(true);
  game.setMusicEnabled(true);
  gameStateService.setSfxEnabled(true);
  game.setSfxEnabled(true);
  game.setMasterVolume(audioSettings.masterVolume);


  debugSettings.registerDebugToggler((enabled) => game.toggleDebugMode(enabled));

  // POST the final score to the backend on game over, then swap the modal's
  // placeholder reward for the one the backend awarded from the admin inventory.
  // Fire-and-forget; a network failure leaves the client-side reward in place.
  if (uuid) {
    const { gameEventBus } = await import('../../app/lib/gameEventBus');
    // Submit at most once per session. Grab is first-score-wins, so replays
    // (restart / tier-timer) would only get rejected with a 400 — skip them.
    let scoreSubmitted = false;
    // The engine emits SHOW_GAME_OVER_MODAL (not GAME_OVER) at end-of-game.
    gameEventBus.on('SHOW_GAME_OVER_MODAL', (event) => {
      if (event.type !== 'SHOW_GAME_OVER_MODAL') return;
      if (scoreSubmitted) {
        console.log('↩️ Score already submitted this session — skipping re-submit (first-score-wins).');
        return;
      }
      scoreSubmitted = true;
      console.log(`📤 Posting final score to backend: ${event.score}`);
      BackendClient.updateScore(uuid, event.score)
        .then(({ resolved, reward }) => {
          // Not resolved = Supabase unavailable; keep the client-side reward.
          if (!resolved) return;
          if (reward) {
            console.log(`🎁 Backend-awarded reward: ${reward.label} (${reward.tokenId})`);
            gameEventBus.emit({
              type: 'UPDATE_REDEEMED_REWARD',
              redeemedReward: reward.label,
              tokenId: reward.tokenId,
            });
          } else {
            // Tier matched but no prize for this score band.
            console.log('🎁 Backend resolved: no prize for this score');
            gameEventBus.emit({
              type: 'UPDATE_REDEEMED_REWARD',
              redeemedReward: 'No Prize',
              tokenId: '-',
            });
          }
        })
        .catch((err) => {
          console.error('❌ Backend updateScore failed', err);
        });
    });

    // If the player leaves before finishing (closes the in-app webview /
    // navigates away), beacon the backend so their in-progress session gets a
    // real end time — otherwise it hangs In Play until the 2-min sweep and shows
    // no duration. Skip if they already finished this session. pagehide is the
    // reliable "really leaving" signal (unlike visibilitychange, which also
    // fires on a brief background where the game just pauses & resumes).
    window.addEventListener('pagehide', (e: PageTransitionEvent) => {
      if (e.persisted) return; // entering bfcache — may come back, don't abandon
      if (scoreSubmitted) return; // finished normally; nothing to abandon
      BackendClient.reportLeave(uuid);
    });
  }

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
