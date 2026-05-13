/**
 * Asset path helper for static deployments.
 * Use NEXT_PUBLIC_BASE_PATH (e.g. "/snapshoot") when deploying under a subpath.
 * Keep it empty for root-hosted deployments like Netlify Drop.
 */
const basePath =
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_PATH || '' : '';

/**
 * Convert relative asset path to absolute path with basePath
 * @param path - Asset path starting with /assets/
 * @returns Full path with basePath prefix in production
 */
export function getAssetPath(path: string): string {
  // If path already has basePath, return as is
  if (basePath && path.startsWith(basePath)) {
    return path;
  }
  
  // Add basePath prefix
  return `${basePath}${path}`;
}

/**
 * Get public file path (e.g., for manifest, icons)
 * @param path - Public file path starting with /
 * @returns Full path with basePath prefix in production
 */
export function getPublicPath(path: string): string {
  return getAssetPath(path);
}
