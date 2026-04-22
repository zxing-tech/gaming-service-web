/**

 */

/**

 */
export function isTossApp(): boolean {
  if (typeof navigator === 'undefined') return false;


  return /TossApp/i.test(navigator.userAgent);
}

/**

 */
export function isTossGameCenterAvailable(): boolean {
  return isTossApp();
}

/**

 */
export function isTossAdAvailable(): boolean {
  return isTossApp();
}

/**

 */
export function logEnvironmentInfo(): void {
  console.log('🔍 Environment Info:');
  console.log('  - Is Toss App:', isTossApp());
  console.log('  - User Agent:', navigator.userAgent);
  console.log('  - Game Center Available:', isTossGameCenterAvailable());
  console.log('  - Ad Available:', isTossAdAvailable());
}
