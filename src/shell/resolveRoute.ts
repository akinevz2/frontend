import { routes, type Route } from "@/content";

export const NOT_FOUND = routes.find((r) => r.path === "/404") as Route;

/** Mirrors the legacy site: decode, drop .html / index / trailing slash, lowercase. */
export function normalizePath(pathname: string): string {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
  path = path.replace(/\/index(\.html)?$/i, "").replace(/\.html$/i, "");
  path = `/${path.replace(/^\/+|\/+$/g, "")}`;
  const lower = path.toLowerCase();
  return routes.some((r) => r.path === lower) ? lower : path;
}

export function resolveRoute(pathname: string): Route {
  const path = normalizePath(pathname);
  const route = routes.find((r) => r.path === path);
  return route ?? NOT_FOUND;
}
