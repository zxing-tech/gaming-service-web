/**

 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

/**

 */
class Logger {
  private static level: LogLevel = LogLevel.DEBUG;
  private static enabled = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false;

  /**

   */
  static setLevel(level: LogLevel) {
    this.level = level;
  }

  /**

   */
  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**

   */
  static getConfig() {
    return {
      level: this.level,
      enabled: this.enabled,
      isDev: typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false
    };
  }

  static debug(category: string, message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.DEBUG) return;
    console.log(`🔍 [${category}] ${message}`, ...args);
  }

  static info(category: string, message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.INFO) return;
    console.log(`ℹ️  [${category}] ${message}`, ...args);
  }

  static warn(category: string, message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.WARN) return;
    console.warn(`⚠️  [${category}] ${message}`, ...args);
  }

  static error(category: string, message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.ERROR) return;
    console.error(`❌ [${category}] ${message}`, ...args);
  }
}

/**

 *

 * ```typescript
 * const log = new CategoryLogger('Shooting');
 * log.info('Shot executed', { velocity, angularVelocity });
 * log.debug('Shot parameters', shotParams);
 * ```
 */
export class CategoryLogger {
  private readonly category: string;

  constructor(category: string) {
    this.category = category;
  }

  debug(message: string, ...args: any[]) {
    Logger.debug(this.category, message, ...args);
  }

  info(message: string, ...args: any[]) {
    Logger.info(this.category, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    Logger.warn(this.category, message, ...args);
  }

  error(message: string, ...args: any[]) {
    Logger.error(this.category, message, ...args);
  }
}

export { Logger };
