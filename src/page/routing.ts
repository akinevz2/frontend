import type { PageConfig } from "./types";

export function resolvePage(
  pages: readonly PageConfig[],
  pathname: string,
  fallback?: PageConfig,
): PageConfig | undefined {
  const exactMatch = pages.find((page) => page.path === pathname);
  if (exactMatch) return exactMatch;

  const prefixMatch = pages
    .filter((page) => page.path !== "/" && pathname.startsWith(`${page.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];

  return prefixMatch ?? fallback;
}

export { randomPostPath } from "./utils/randomPostPath.ts";
