
import { SnapShoot } from './SnapShoot';
import { gameStateService } from './GameStateService';
import { debugSettings } from './DebugSettings';
import { getUserKeyForGame } from '@apps-in-toss/web-framework';
import { isTossGameCenterAvailable, logEnvironmentInfo } from '../utils/TossEnvironment';
import { TOSS_CONFIG } from '../config/TossConfig';


/**
 * 친구 점수 알림 표시
 */
function showFriendScoreNotification(friendScore: number): void {
  const notification = document.createElement('div');
  notification.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none';
  notification.innerHTML = `
    <div class="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-lg shadow-lg">
      <p class="text-sm font-bold">친구가 ${friendScore.toLocaleString('ko-KR')}점을 달성했어요!</p>
      <p class="text-xs mt-1">도전해보세요! 🔥</p>
    </div>
  `;

  document.body.appendChild(notification);

  // 3초 후 자동 사라짐
  setTimeout(() => {
    notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

export function loadGame(params?: { score?: number }) {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiContainer = document.getElementById('ui') as HTMLDivElement | null;

  if (!canvas || !uiContainer) {
    throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
  }

  // 친구 점수가 있으면 알림 표시
  if (params?.score) {
    console.log(`🎯 친구 점수: ${params.score}`);
    showFriendScoreNotification(params.score);
  }

  // 광고 상태 관리 및 사전 로드는 React 컴포넌트(ContinueModal)로 이관됨

  // 환경 정보 로깅
  logEnvironmentInfo();

  // 토스 게임 로그인 (Game Login - 사용자 식별 키 획득)
  if (TOSS_CONFIG.GAME_CENTER_ENABLED && isTossGameCenterAvailable()) {
    getUserKeyForGame()
      .then((result) => {
        if (!result) {
          console.warn('⚠️ 토스 앱 버전이 낮습니다.');
          return;
        }

        if (result === 'INVALID_CATEGORY') {
          console.warn('⚠️ 게임 카테고리가 아닌 미니앱입니다.');
          return;
        }

        if (result === 'ERROR') {
          console.error('❌ 사용자 키 조회 실패');
          return;
        }

        // 성공: result는 GetUserKeyForGameSuccessResponse 타입
        if (result.type === 'HASH') {
          console.log('✅ 게임 로그인 성공 (Game Login)');
          console.log('🔑 사용자 키:', result.hash.substring(0, 8) + '...');
          // 사용자 키를 저장하여 랭킹 시스템에 사용
          localStorage.setItem('toss_user_key', result.hash);
        }
      })
      .catch((error) => {
        console.error('❌ 게임 로그인 오류:', error);
        // 로그인 실패 시에도 게임은 계속 진행 (로컬 모드)
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

  // 저장된 오디오 설정 복구 및 적용 (배경음악 미사용)
  gameStateService.setMusicEnabled(false);
  game.setMusicEnabled(false);
  const audioSettings = gameStateService.getAudioSettings();
  game.setSfxEnabled(audioSettings.sfxEnabled);
  game.setMasterVolume(audioSettings.masterVolume);

  // 디버그 토글 함수를 전역에 등록 (콘솔에서 window.toggleDebug() 사용 가능)
  debugSettings.registerDebugToggler((enabled) => game.toggleDebugMode(enabled));

  // Pause Modal, Continue Modal, Game Over Modal 생성 로직 제거됨 (React로 이관)

  // 게임오버 시 Continue Modal 열기
  // TODO: game.ts에서 게임오버 이벤트 발생 시 continueModal.open() 호출
  // 예시: game.onGameOver(() => continueModal.open());

  // Page Visibility API: 백그라운드 전환 시 사운드 자동 제어
  // 앱인토스 가이드라인: "백그라운드로 전환 시 사운드가 계속 재생이 되지 않는지 확인"
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // 백그라운드로 전환 시 (랭킹보기, 고객센터, 다른 앱으로 이동 등)
      console.log('🔇 백그라운드 전환: 사운드 일시정지');
      game.pauseAudio();
    } else {
      // 포그라운드 복귀 시 -> PauseModal 자동 오픈
      // 단, 로딩 화면에서는 PauseModal을 열지 않음
      // isGameReady 변수는 제거되었으므로, 게임 상태를 확인해야 함.
      // 하지만 여기서는 간단히 이벤트를 보냄.
      console.log('📱 포그라운드 복귀: PauseModal 자동 오픈');
      import('../../app/lib/gameEventBus').then(({ gameEventBus }) => {
        gameEventBus.emit({ type: 'SHOW_PAUSE_MODAL', show: true });
      });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);


}
