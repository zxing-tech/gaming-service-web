import { getAssetPath } from '../utils/assetPath';

const kickUrl = getAssetPath('/assets/audio/kick.mp3');
const bounceUrl = getAssetPath('/assets/audio/bounce.mp3');
const goalUrl = getAssetPath('/assets/audio/goal.mp3');
const saveUrl = getAssetPath('/assets/audio/save.mp3');
const postUrl = getAssetPath('/assets/audio/post.mp3');
const resetUrl = getAssetPath('/assets/audio/reset.mp3');
const netUrl = getAssetPath('/assets/audio/net.mp3');
const cheerUrl = getAssetPath('/assets/audio/cheer.mp3');
const recordUrl = getAssetPath('/assets/audio/record.mp3');
const chantUrl = getAssetPath('/assets/audio/chant.mp3');
const bg1Url = getAssetPath('/assets/audio/bg1.mp3');

/**

 */
export type SoundKey = 'kick' | 'bounce' | 'goal' | 'save' | 'post' | 'reset' | 'net' | 'cheer' | 'record';

/**

 */
export type MusicTrack = 'chant' | 'gameplay';

/**

 */
export interface SoundConfig {
  url: string;
  volume: number;
}

/**

 */
export interface MusicConfig {
  urls: string[];
  volume: number;
  loop: boolean;
  shuffle?: boolean;
}

/**

 *


 */
export const AUDIO_CONFIG = {
  /**

   */
  sounds: {
    kick: { url: kickUrl, volume: 1.0 },
    bounce: { url: bounceUrl, volume: 1.0 },
    goal: { url: goalUrl, volume: 1.0 },
    save: { url: saveUrl, volume: 1.0 },
    post: { url: postUrl, volume: 1.0 },
    reset: { url: resetUrl, volume: 1.0 },
    net: { url: netUrl, volume: 1.0 },
    cheer: { url: cheerUrl, volume: 1.0 },
    record: { url: recordUrl, volume: 1.0 }
  } as const satisfies Record<SoundKey, SoundConfig>,

  /**

   */
  music: {
    /**

     */
    chant: {
      urls: [chantUrl],
      volume: 1.0,
      loop: true
    },
    /**

     */
    gameplay: {
      urls: [bg1Url],
      volume: 1.0,
      loop: true,
      shuffle: true
    }
  } as const satisfies Record<MusicTrack, MusicConfig>
} as const;
