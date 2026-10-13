import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { DIST, PUBLIC } from "./env.ts";
import { withRouteMeta } from "./meta.ts";
import { loadRoutes, normalizeRoute } from "./routes.ts";
import { generateSitemap } from "./sitemap.ts";

/**
 * After the bundle is written, emit one index.html per route (with that
 * route's title/description meta), a `<slug>.html` sibling for static hosts,
 * and sitemap.xml. The SPA still hydrates from the same bundle.
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
        if (!fs.existsSync(path.join(PUBLIC, `${slug}.html`))) {
          fs.writeFileSync(path.join(DIST, `${slug}.html`), html, "utf-8");
        }
      }

      fs.writeFileSync(
        path.join(DIST, "sitemap.xml"),
        generateSitemap(routes),
        "utf-8",
      );
    },
  };
}
