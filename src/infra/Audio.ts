import { AUDIO_CONFIG, type SoundKey, type MusicTrack } from '../config/Audio';

export class AudioManager {
  private context: AudioContext | null = null;
  private loadingPromise: Promise<void> | null = null;

  // 효과음 버퍼
  private readonly soundBuffers = new Map<SoundKey, AudioBuffer>();

  // 음악 버퍼
  private readonly musicBuffers = new Map<MusicTrack, AudioBuffer[]>();

  // 현재 재생 중인 음악 (멀티 트랙 지원)
  private readonly currentMusic = new Map<MusicTrack, {
    source: AudioBufferSourceNode;
    gain: GainNode;
    currentIndex: number;
  }>();

  // 전역 토글 상태
  private musicEnabled = false;
  private sfxEnabled = true;

  // 마스터 볼륨 (0.0 ~ 1.0)
  private masterVolume = 1.0;

  // 음악 트랙별 기본 볼륨(마스터 볼륨 적용 전 값) 저장
  private readonly musicBaseVolume = new Map<MusicTrack, number>();

  async loadAll(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {
      // 효과음 로드
      const soundEntries = await Promise.all(
        Object.entries(AUDIO_CONFIG.sounds).map(async ([key, config]) => {
          try {
            const response = await fetch(config.url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.getContext().decodeAudioData(arrayBuffer.slice(0));
            return [key as SoundKey, buffer] as const;
          } catch (error) {
            console.warn(`Failed to load sound "${key}"`, error);
            return null;
          }
        })
      );

      soundEntries
        .filter((entry): entry is readonly [SoundKey, AudioBuffer] => entry !== null)
        .forEach(([key, buffer]) => {
          this.soundBuffers.set(key, buffer);
        });

    })();
    return this.loadingPromise;
  }

  private async loadMusic(track: MusicTrack): Promise<void> {
    const config = AUDIO_CONFIG.music[track];
    try {
      const buffers = await Promise.all(
        config.urls.map(async (url) => {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          return await this.getContext().decodeAudioData(arrayBuffer.slice(0));
        })
      );
      this.musicBuffers.set(track, buffers);
      console.log(`Music track "${track}" loaded successfully`);
    } catch (error) {
      console.warn(`Failed to load music track "${track}"`, error);
    }
  }

  /**
   * AudioContext가 suspended 상태면 resume
   */
  private async ensureContextRunning(): Promise<void> {
    const context = this.getContext();
    if (context.state === 'suspended') {
      await context.resume();
    }
  }

  /**
   * 사용자 제스처 내에서 호출하여 AudioContext를 활성화
   * Safari/iOS에서 autoplay policy를 우회하기 위해 필요
   *
   * iOS의 스와이프 제스처 문제:
   * - resume()만으로는 스와이프 중 unlock 실패 (움직임이 있는 제스처는 거부)
   * - 빈 버퍼 재생으로 강제 unlock (검증된 방법)
   *
   * 주의: 동기 함수로 구현하여 사용자 제스처 컨텍스트 유지
   */
  unlockAudioContext(): void {
    const context = this.getContext(); // 이미 지역 변수
    if (context.state === 'suspended') {
      console.log('🔓 AudioContext unlocking...');

      try {
        // iOS: 빈 버퍼를 재생하여 강제 unlock (스와이프에서도 작동)
        const buffer = context.createBuffer(1, 1, 22050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);

        // 즉시 resume 호출 (사용자 제스처 컨텍스트 내에서)
        void context.resume()
          .then(() => {
            console.log('✅ AudioContext unlocked and resumed, state:', context.state);
          })
          .catch((error) => {
            console.warn('❌ AudioContext resume failed:', error);
          });
      } catch (error) {
        console.warn('❌ AudioContext unlock failed:', error);
      }
    } else {
      console.log('ℹ️ AudioContext already running, state:', context.state);
    }
  }

  /**
   * 효과음 재생
   */
  playSound(key: SoundKey, volumeOverride?: number): void {
    if (!this.sfxEnabled) return;
    const buffer = this.soundBuffers.get(key);
    if (!buffer) return;

    const config = AUDIO_CONFIG.sounds[key];
    const volume = (volumeOverride ?? config.volume) * this.masterVolume;

    const context = this.getContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(context.destination);

    try {
      source.start();
    } catch (error) {
      console.warn(`Failed to play sound "${key}"`, error);
    }
  }

  /**
   * 배경 음악 재생 (멀티 트랙 지원)
   */
  async playMusic(track: MusicTrack, options?: { fadeIn?: boolean; volumeOverride?: number }): Promise<void> {
    if (!this.musicEnabled) {
      // 음악이 비활성화된 경우 즉시 재생하지 않고 요청만 기록, 현재 트랙은 정지
      this.stopMusic(track);
      return;
    }
    // 동일 트랙이 이미 재생 중이면 중지
    if (this.currentMusic.has(track)) {
      this.stopMusic(track);
    }

    // Context 준비
    await this.ensureContextRunning();

    const config = AUDIO_CONFIG.music[track];
    const buffers = this.musicBuffers.get(track);
    if (!buffers || buffers.length === 0) {
      console.warn(`Music track "${track}" not loaded`);
      return;
    }

    // 버퍼 선택 (shuffle이면 랜덤, 아니면 첫 번째)
    const index = 'shuffle' in config && config.shuffle
      ? Math.floor(Math.random() * buffers.length)
      : 0;

    const buffer = buffers[index];
    const volume = (options?.volumeOverride ?? config.volume);

    // Source 생성
    const context = this.getContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = config.loop;

    // Fade in 처리
    if (options?.fadeIn) {
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(volume * this.masterVolume, context.currentTime + 1.5);
    } else {
      gain.gain.value = volume * this.masterVolume;
    }

    source.connect(gain);
    gain.connect(context.destination);

    // 다음 곡으로 자동 전환 (playlist인 경우)
    if (buffers.length > 1) {
      source.onended = () => {
        const nextIndex = (index + 1) % buffers.length;
        this.playNextTrack(track, nextIndex, volume);
      };
    }

    try {
      source.start();
      console.log(`🎵 Music "${track}" started (index: ${index}, volume: ${volume})`);
    } catch (error) {
      console.warn(`Failed to play music "${track}"`, error);
      return;
    }

    // 상태 저장
    this.musicBaseVolume.set(track, volume);
    this.currentMusic.set(track, { source, gain, currentIndex: index });
  }

  /**
   * 다음 트랙 재생 (내부 사용)
   */
  private playNextTrack(track: MusicTrack, index: number, volume: number): void {
    const buffers = this.musicBuffers.get(track);
    if (!buffers || buffers.length === 0) return;

    const buffer = buffers[index];
    const config = AUDIO_CONFIG.music[track];

    const context = this.getContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = config.loop;
    gain.gain.value = volume * this.masterVolume;

    source.connect(gain);
    gain.connect(context.destination);

    // 다음 곡으로 자동 전환
    source.onended = () => {
      const nextIndex = (index + 1) % buffers.length;
      this.playNextTrack(track, nextIndex, volume);
    };

    source.start();

    // 상태 업데이트
    this.musicBaseVolume.set(track, volume);
    this.currentMusic.set(track, { source, gain, currentIndex: index });
  }

  /**
   * 특정 트랙 또는 모든 음악 정지
   */
  stopMusic(track?: MusicTrack): void {
    if (track) {
      // 특정 트랙 중지
      const music = this.currentMusic.get(track);
      if (music) {
        try {
          music.source.stop();
        } catch (error) {
          // 이미 중지된 경우 무시
        }
        this.currentMusic.delete(track);
        this.musicBaseVolume.delete(track);
      }
    } else {
      // 모든 음악 중지
      this.stopAllMusic();
    }
  }

  /**
   * 모든 음악 정지
   */
  stopAllMusic(): void {
    this.currentMusic.forEach((music) => {
      try {
        music.source.stop();
      } catch (error) {
        // 이미 중지된 경우 무시
      }
    });
    this.currentMusic.clear();
    this.musicBaseVolume.clear();
  }

  /**
   * 특정 트랙 볼륨 설정
   */
  setMusicVolume(track: MusicTrack, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.musicBaseVolume.set(track, clamped);
    const music = this.currentMusic.get(track);
    if (music) {
      music.gain.gain.value = clamped * this.masterVolume;
    }
  }

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === 'suspended') {
      void this.context.resume().catch((error) => {
        console.warn('Failed to resume AudioContext', error);
      });
    }

    return this.context;
  }

  /**
   * 배경음악 사용 여부 설정 (false면 즉시 모든 음악 정지)
   */
  setMusicEnabled(enabled: boolean): void {
    if (this.musicEnabled === enabled) return;
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopAllMusic();
    }
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  /**
   * 효과음 사용 여부 설정
   */
  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  /**
   * 마스터 볼륨 설정 (0.0 ~ 1.0). 음악은 즉시 반영, 효과음은 다음 재생부터 반영
   */
  setMasterVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.masterVolume === clamped) return;
    this.masterVolume = clamped;
    // 현재 재생 중인 음악의 게인 재적용
    this.currentMusic.forEach((music, track) => {
      const base = this.musicBaseVolume.get(track);
      if (typeof base === 'number') {
        music.gain.gain.value = base * this.masterVolume;
      }
    });
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * 모든 오디오 일시정지 (광고 재생 시)
   * AudioContext를 suspend하여 모든 사운드를 일시정지
   */
  pauseAll(): void {
    if (this.context && this.context.state === 'running') {
      void this.context.suspend().catch((error) => {
        console.warn('Failed to suspend AudioContext', error);
      });
    }
  }

  /**
   * 모든 오디오 재개 (광고 종료 시)
   * AudioContext를 resume하여 일시정지된 사운드를 재개
   *
   * 주의: 사용자 제스처 컨텍스트를 유지하기 위해 동기 함수로 구현
   * await를 사용하면 iOS Safari에서 제스처 컨텍스트가 끊김
   */
  resumeAll(): void {
    if (this.context) {
      const context = this.context; // 지역 변수에 저장
      console.log(`🔊 resumeAll 호출됨, 현재 상태: ${context.state}`);
      if (context.state === 'suspended') {
        context.resume()
          .then(() => {
            console.log(`✅ AudioContext 재개 성공, 새 상태: ${context.state}`);
          })
          .catch((error) => {
            console.error('❌ Failed to resume AudioContext', error);
          });
      } else {
        console.log(`ℹ️ AudioContext already ${context.state}, resume 불필요`);
      }
    } else {
      console.warn('⚠️ AudioContext가 존재하지 않음');
    }
  }
}
