/**
 * 게임 진행 관련 설정
 */

export const GAME_CONFIG = {
  /**
   * 세션 규칙 설정
   */
  session: {
    /** 총 라이프 수 (미스 시 1개 차감) */
    totalLives: 2,
    /** 탑프라이즈 달성 점수 */
    topPrizePoints: 10,
    /** 유휴 상태 자동 종료 시간 (ms) */
    idleTimeoutMs: 60_000,
    /** 게임 전체에서 고정으로 사용할 표준 난이도 기준 점수 */
    standardDifficultyScore: 1,
  },

  /**
   * 바운스 사운드 재생 설정
   */
  bounceSound: {
    /** 바운스 사운드를 재생하기 위한 최소 수직 속도 (m/s) */
    minVerticalSpeed: 0.45,
    /** 연속 바운스 사운드 재생 방지를 위한 쿨다운 (ms) */
    cooldownMs: 120,
  },

  /**
   * 게임 타이밍 설정
   */
  timing: {
    /** 슛 후 자동으로 리셋되기까지의 시간 (ms) */
    shotResetMs: 2500,
    /** 리셋 후 터치 가이드 표시까지의 지연 시간 (ms) */
    touchGuideDelayMs: 1000,
  },

  /**
   * 게임오버 설정
   */
  gameOver: {
    /** 게임오버까지 허용되는 최대 실패 횟수 (3 라이프 기준 2 미스 이후 마지막 미스에서 종료) */
    maxFailsAllowed: 2,
  },

  /**
   * 물리 시뮬레이션 설정
   */
  physics: {
    /** 물리 엔진 시간 간격 (Hz) */
    timeStep: 1 / 120,
    /** 물리 엔진 서브스텝 수 (tunneling 방지) */
    substeps: 5,
  },
} as const;
