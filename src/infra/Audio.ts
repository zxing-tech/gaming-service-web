import { AUDIO_CONFIG, type SoundKey, type MusicTrack } from '../config/Audio';

export class AudioManager {
  private context: AudioContext | null = null;
  private loadingPromise: Promise<void> | null = null;
  private readonly audioFetchTimeoutMs = 10000;


  private readonly soundBuffers = new Map<SoundKey, AudioBuffer>();


  private readonly musicBuffers = new Map<MusicTrack, AudioBuffer[]>();


  private readonly currentMusic = new Map<MusicTrack, {
    source: AudioBufferSourceNode;
    gain: GainNode;
    currentIndex: number;
  }>();


  private musicEnabled = false;
  private sfxEnabled = true;


  private masterVolume = 1.0;


  private readonly musicBaseVolume = new Map<MusicTrack, number>();

  async loadAll(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {

      const soundEntries = await Promise.all(
        Object.entries(AUDIO_CONFIG.sounds).map(async ([key, config]) => {
          try {
            const buffer = await this.fetchAndDecodeAudio(config.url);
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

      // Music loads lazily in ensureMusicLoaded when playMusic runs (faster first paint).

    })();
    return this.loadingPromise;
  }

  private async ensureMusicLoaded(track: MusicTrack): Promise<void> {
    const existing = this.musicBuffers.get(track);
    if (existing && existing.length > 0) return;
    await this.loadMusic(track);
  }

  private async loadMusic(track: MusicTrack): Promise<void> {
    const config = AUDIO_CONFIG.music[track];
    try {
      const buffers = await Promise.all(
        config.urls.map(async (url) => {
          return await this.fetchAndDecodeAudio(url);
        })
      );
      this.musicBuffers.set(track, buffers);
      console.log(`Music track "${track}" loaded successfully`);
    } catch (error) {
      console.warn(`Failed to load music track "${track}"`, error);
    }
  }

  private async fetchAndDecodeAudio(url: string): Promise<AudioBuffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.audioFetchTimeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Audio request failed (${response.status}) for ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return await this.getContext().decodeAudioData(arrayBuffer.slice(0));
    } finally {
      clearTimeout(timeout);
    }
  }

  /**

   */
  private async ensureContextRunning(): Promise<void> {
    const context = this.getContext();
    if (context.state === 'suspended') {
      await context.resume();
    }
  }

  /**


   *



   *

   */
  unlockAudioContext(): void {
    const context = this.getContext();
    if (context.state === 'suspended') {
      console.log('🔓 AudioContext unlocking...');

      try {

        const buffer = context.createBuffer(1, 1, 22050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);


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

   */
  async playMusic(track: MusicTrack, options?: { fadeIn?: boolean; volumeOverride?: number }): Promise<void> {
    if (!this.musicEnabled) {

      this.stopMusic(track);
      return;
    }

    if (this.currentMusic.has(track)) {
      this.stopMusic(track);
    }


    await this.ensureContextRunning();

    const config = AUDIO_CONFIG.music[track];
    await this.ensureMusicLoaded(track);
    const buffers = this.musicBuffers.get(track);
    if (!buffers || buffers.length === 0) {
      console.warn(`Music track "${track}" not loaded`);
      return;
    }


    const index = 'shuffle' in config && config.shuffle
      ? Math.floor(Math.random() * buffers.length)
      : 0;

    const buffer = buffers[index];
    const volume = (options?.volumeOverride ?? config.volume);


    const context = this.getContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = config.loop;


    if (options?.fadeIn) {
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(volume * this.masterVolume, context.currentTime + 1.5);
    } else {
      gain.gain.value = volume * this.masterVolume;
    }

    source.connect(gain);
    gain.connect(context.destination);


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


    this.musicBaseVolume.set(track, volume);
    this.currentMusic.set(track, { source, gain, currentIndex: index });
  }

  /**

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


    source.onended = () => {
      const nextIndex = (index + 1) % buffers.length;
      this.playNextTrack(track, nextIndex, volume);
    };

    source.start();


    this.musicBaseVolume.set(track, volume);
    this.currentMusic.set(track, { source, gain, currentIndex: index });
  }

  /**

   */
  stopMusic(track?: MusicTrack): void {
    if (track) {

      const music = this.currentMusic.get(track);
      if (music) {
        try {
          music.source.stop();
        } catch (error) {

        }
        this.currentMusic.delete(track);
        this.musicBaseVolume.delete(track);
      }
    } else {

      this.stopAllMusic();
    }
  }

  /**

   */
  stopAllMusic(): void {
    this.currentMusic.forEach((music) => {
      try {
        music.source.stop();
      } catch (error) {

      }
    });
    this.currentMusic.clear();
    this.musicBaseVolume.clear();
  }

  /**

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

   */
  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  /**

   */
  setMasterVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.masterVolume === clamped) return;
    this.masterVolume = clamped;

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


   */
  pauseAll(): void {
    if (this.context && this.context.state === 'running') {
      void this.context.suspend().catch((error) => {
        console.warn('Failed to suspend AudioContext', error);
      });
    }
  }

  /**


   *


   */
  resumeAll(): void {
    if (this.context) {
      const context = this.context;
      console.log(`🔊 resumeAll called, current state: ${context.state}`);
      if (context.state === 'suspended') {
        context.resume()
          .then(() => {
            console.log(`✅ AudioContext resumed successfully, new state: ${context.state}`);
          })
          .catch((error) => {
            console.error('❌ Failed to resume AudioContext', error);
          });
      } else {
        console.log(`ℹ️ AudioContext already ${context.state}, resume not needed`);
      }
    } else {
      console.warn('⚠️ AudioContext is not available');
    }
  }
}
