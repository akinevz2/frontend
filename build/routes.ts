import fs from "node:fs";
import path from "node:path";
import { CONTENT } from "./env.ts";

export type RouteConfig = {
  path: string;
  title: string;
  description: string;
  hidden?: boolean;
  /** Project routes only: json fields the head JSON-LD and sitemap
   * <lastmod> read. Alias routes carry none. */
  github?: string;
  lastModified?: string;
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
  github?: string;
  lastModified?: string;
};

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(file, "utf-8")) as T;

/** Route per project mirror of src/content/index.ts: canonical + alias. */
function projectRouteConfigs(dir: string, pages: RouteConfig[]): RouteConfig[] {
  const slugs = fs.readdirSync(dir).filter((name) => name.endsWith(".json"));
  const projects = slugs.map((name) =>
    readJson<ProjectDoc>(path.join(dir, name)),
  );
  const canonical = (project: ProjectDoc) =>
    project.path ?? `/projects/${project.slug}`;
  const short = (project: ProjectDoc) => `/${project.slug}`;
  return projects.flatMap((project): RouteConfig[] => {
    const taken =
      pages.some((page) => page.path === short(project)) ||
      projects.some(
        (other) => other !== project && canonical(other) === short(project),
      );
    const common = {
      title: project.title,
      description: project.description,
    };
    const base: RouteConfig = {
      path: canonical(project),
      ...common,
      ...(project.github ? { github: project.github } : {}),
      ...(project.lastModified ? { lastModified: project.lastModified } : {}),
    };
    return taken
      ? [base]
      : [base, { path: short(project), ...common, hidden: true }];
  });
}

/** Routes: src/content/pages.json plus one route per src/content/projects/*.json. */
export function loadRoutes(): RouteConfig[] {
  const pages = readJson<RouteConfig[]>(path.join(CONTENT, "pages.json"));
  const dir = path.join(CONTENT, "projects");
  return [...pages, ...projectRouteConfigs(dir, pages)];
}
