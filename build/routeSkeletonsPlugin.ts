import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { DIST, PUBLIC } from "./env.ts";
import { withRouteMeta } from "./meta.ts";
import { loadRoutes, normalizeRoute, type RouteConfig } from "./routes.ts";
import { generateSitemap } from "./sitemap.ts";

/**
 * dist-relative paths the skeleton generator emits for the given routes:
 * one index.html per route, a `<slug>.html` sibling for static hosts
 * (unless a hand-written `public/<slug>.html` wins over it), plus the
 * root index.html and sitemap.xml.
 *
 * Exported pure so tests can assert the generated set without touching fs.
 */
export function generatedPathsForRoutes(
  routes: RouteConfig[],
  publicSiblingExists: (slug: string) => boolean,
): string[] {
  const generated = new Set<string>(["index.html", "sitemap.xml"]);
  for (const route of routes) {
    const normalized = normalizeRoute(route.path);
    if (normalized === "/") continue; // root index.html, already included
    const slug = normalized.slice(1);
    generated.add(`${slug}/index.html`);
    if (!publicSiblingExists(slug)) {
      generated.add(`${slug}.html`);
    }
  }
  return [...generated].sort();
}

/**
 * After the bundle is written, emit one index.html per route (with that
 * route's title/description meta), a `<slug>.html` sibling for static hosts,
 * and sitemap.xml. The SPA still hydrates from the same bundle.
 *
 * The emitted `dist/.generated.json` lists every generated path so the
 * checksums drift gate (write-dist-checksums.mjs) can auto-mark
 * webapp-generated artifacts as mutable instead of hand-maintaining page
 * entries: any new route or project page is mutable automatically.
 */
export function routeSkeletonsPlugin(): Plugin {
  return {
    name: "route-skeletons",
    apply: "build",
    closeBundle() {
      const indexPath = path.join(DIST, "index.html");
      if (!fs.existsSync(indexPath)) return;

      const indexHtml = fs.readFileSync(indexPath, "utf-8");
      const routes = loadRoutes();
      const publicSiblingExists = (slug: string) =>
        fs.existsSync(path.join(PUBLIC, `${slug}.html`));

      for (const route of routes) {
        const normalized = normalizeRoute(route.path);
        const html = withRouteMeta(indexHtml, route);

        if (normalized === "/") {
          fs.writeFileSync(indexPath, html, "utf-8");
          continue;
        }

        const slug = normalized.slice(1);
        fs.mkdirSync(path.join(DIST, slug), { recursive: true });
        fs.writeFileSync(path.join(DIST, slug, "index.html"), html, "utf-8");

        // a hand-written public/<slug>.html wins over the generated sibling
        if (!publicSiblingExists(slug)) {
          fs.writeFileSync(path.join(DIST, `${slug}.html`), html, "utf-8");
        }
      }

      fs.writeFileSync(
        path.join(DIST, "sitemap.xml"),
        generateSitemap(routes),
        "utf-8",
      );

      fs.writeFileSync(
        path.join(DIST, ".generated.json"),
        `${JSON.stringify(
          { generated: generatedPathsForRoutes(routes, publicSiblingExists) },
          null,
          2,
        )}\n`,
        "utf-8",
      );
    },
  };
}
