import fs from "node:fs";
import path from "node:path";
import { CONTENT } from "./env.ts";

export type RouteConfig = {
  path: string;
  title: string;
  description: string;
  hidden?: boolean;
};

export function normalizeRoute(routePath: string): string {
  if (!routePath || routePath === "/") return "/";
  return `/${routePath.replace(/^\/+|\/+$/g, "")}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Single source of truth for routes: src/content/pages.json. */
export function loadRoutes(): RouteConfig[] {
  const raw = fs.readFileSync(path.join(CONTENT, "pages.json"), "utf-8");
  return JSON.parse(raw) as RouteConfig[];
}
