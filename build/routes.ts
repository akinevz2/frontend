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

type ProjectDoc = {
  slug: string;
  path?: string;
  title: string;
  description: string;
};

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(file, "utf-8")) as T;

/** Routes: src/content/pages.json plus one route per src/content/projects/*.json. */
export function loadRoutes(): RouteConfig[] {
  const pages = readJson<RouteConfig[]>(path.join(CONTENT, "pages.json"));
  const dir = path.join(CONTENT, "projects");
  const projects = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson<ProjectDoc>(path.join(dir, name)))
    .map((project): RouteConfig => ({
      path: project.path ?? `/projects/${project.slug}`,
      title: project.title,
      description: project.description,
    }));
  return [...pages, ...projects];
}
