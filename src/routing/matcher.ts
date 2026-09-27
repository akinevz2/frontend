import type { RouteConfig, RouteMatch } from "./types";

export function matchRoute(
  pathname: string,
  routes: RouteConfig[],
): RouteMatch | null {
  let bestMatch: RouteMatch | null = null;

  for (const route of routes) {
    const match = matchPath(route.path, pathname);
    if (match) {
      if (!bestMatch || (match.params.priority as unknown as number) > 0) {
        bestMatch = {
          route,
          params: match.params,
          path: route.path,
        };
      }
    }
  }

  return bestMatch;
}

function matchPath(
  pattern: string,
  pathname: string,
): { params: Record<string, string | number> } | null {
  const patternSegments = pattern.split("/");
  const pathnameSegments = pathname.split("/").filter(Boolean);
  const filteredPattern = patternSegments.filter(Boolean);

  if (filteredPattern.length !== pathnameSegments.length) {
    return null;
  }

  const params: Record<string, string | number> = {};

  for (let i = 0; i < filteredPattern.length; i++) {
    const patternSegment = filteredPattern[i]!;
    const pathnameSegment = pathnameSegments[i];

    if (patternSegment.startsWith(":")) {
      const paramName = patternSegment.substring(1);
      params[paramName] = pathnameSegment!;
      params.priority = 1;
    } else if (patternSegment !== pathnameSegment) {
      return null;
    }
  }

  return { params };
}
