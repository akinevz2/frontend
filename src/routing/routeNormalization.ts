/**
 * Route normalization utilities
 * Provides utilities for cleaning and standardizing route paths
 */

/**
 * Normalizes a route string by removing leading/trailing slashes
 */
export function normalizeRoute(route: string): string {
  return route.replace(/^\/+|\/+$/g, '');
}

/**
 * Removes query parameters from a route string
 */
export function removeQueryParams(route: string): string {
  return route.split('?')[0];
}

/**
 * Checks if a route is absolute
 */
export function isAbsoluteRoute(route: string): boolean {
  return route.startsWith('/');
}

/**
 * Checks if a route is relative
 */
export function isRelativeRoute(route: string): boolean {
  return !route.startsWith('/');
}

/**
 * Converts a relative route to absolute
 */
export function toAbsoluteRoute(route: string, basePath: string = ''): string {
  const normalized = normalizeRoute(route);
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}
