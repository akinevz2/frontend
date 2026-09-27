/**
 * Route normalization utilities for handling and transforming URL paths.
 * Extracted from App.tsx to improve modularity and maintainability.
 */

/**
 * Type definition for page route configuration
 */
export type RouteConfig = {
  title: string;
  description: string;
};

/**
 * Type definition for page route with path
 */
export type PageRoute = RouteConfig & {
  path: string;
};

/**
 * Type for structured sound cloud payload
 */
export type SoundCloudTrack = {
  title: string;
  url: string;
};

export type SoundCloudPayload = {
  tracks: SoundCloudTrack[];
};

/**
 * Normalizes URL paths by removing trailing slashes, handling HTML extensions,
 * and preserving special routes like /blog/login.
 *
 * @param path - The raw path string to normalize
 * @returns Normalized path string
 */
export const normalizePath = (path: string) => {
  if (!path || path === "/") {
    return "/";
  }

  const decodedPath = decodeURIComponent(path);
  const withoutIndexHtml = decodedPath.replace(/\/index\.html$/i, "/");
  const withoutHtml = withoutIndexHtml.replace(/\.html$/i, "");
  const withoutTrailingSlash = withoutHtml.replace(/\/+$/, "");
  const segments = withoutTrailingSlash.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "/";
  }

  const [firstSegment] = segments;

  // Preserve /blog/login as a distinct route (don't collapse to /blog)
  // so it can redirect to the admin panel on WS-VISION.
  if (
    segments.length === 2 &&
    firstSegment?.toLowerCase() === "blog" &&
    segments[1]?.toLowerCase() === "login"
  ) {
    return "/blog/login";
  }

  if (firstSegment && TOP_LEVEL_ROUTES.has(firstSegment.toLowerCase())) {
    return `/${firstSegment.toLowerCase()}`;
  }

  return withoutTrailingSlash || "/";
};

/**
 * Checks if a given href is an internal path (starts with /)
 *
 * @param href - The URL to check
 * @returns True if the href is an internal path
 */
export const isInternalPath = (href: string) => href.startsWith("/");

/**
 * Returns the top level route from a path
 *
 * @param path - The path to extract the top level route from
 * @returns Top level route or null if not found
 */
export const getTopLevelRoute = (path: string) => {
  const segments = path.split("/").filter(Boolean);
  const [firstSegment] = segments;

  if (firstSegment && TOP_LEVEL_ROUTES.has(firstSegment.toLowerCase())) {
    return firstSegment.toLowerCase();
  }
  return null;
};

/**
 * Checks if a path contains a specific top level route
 *
 * @param path - The path to check
 * @param topLevelRoute - The top level route to search for
 * @returns True if the path contains the specified top level route
 */
export const hasTopLevelRoute = (path: string, topLevelRoute: string) => {
  return path.split("/").filter(Boolean).includes(topLevelRoute);
};

/**
 * Regular expression pattern for matching top level routes
 */
const TOP_LEVEL_ROUTES_REGEX = new RegExp(
  `^/(?:${["", "home", "blog", "contact", "resume", "wow", "pagerts"].join("|")})/?$`,
);

/**
 * Checks if a path matches a top level route pattern
 *
 * @param path - The path to check
 * @returns True if the path matches a top level route
 */
export const isTopLevelRoute = (path: string) => {
  return TOP_LEVEL_ROUTES_REGEX.test(path);
};
