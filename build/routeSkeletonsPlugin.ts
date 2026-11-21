import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { DIST, PUBLIC } from "./env.ts";
import { withRouteMeta } from "./meta.ts";
import { loadRoutes, normalizeRoute, type RouteConfig } from "./routes.ts";
import { generateSitemap } from "./sitemap.ts";
import {
  generatedBlogPaths,
  injectSnapshot,
  mergeGeneratedPaths,
  snapshotFor,
  type SnapshotPages,
} from "./prerender.ts";
import { collectBlogEnv, blogPathDate } from "../src/renderer/node.ts";
import { createSeoServer } from "./prerenderServer.ts";

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
 * route's title/description meta AND its static SEO snapshot inside
 * #root), a `<slug>.html` sibling for static hosts, one page per blog
 * post/listed directory (the same snapshot treatment — /blog/** is
 * indexable), and sitemap.xml. The SPA still boots from the same bundle
 * and REPLACES the snapshot (createRoot, not hydrateRoot).
 *
 * The snapshots render through a temporary in-memory Vite server
 * (createSeoServer) so the snapshot's content imports resolve their virtual
 * modules; the server is closed before this hook returns. No extra
 * build step, no installs, no network.
 *
 * The emitted `dist/.generated.json` lists every generated path so the
 * checksums drift gate (write-dist-checksums.mjs) can auto-mark
 * webapp-generated artifacts as mutable instead of hand-maintaining page
 * entries: any new route, project page or blog post is mutable
 * automatically.
 */
export function routeSkeletonsPlugin(): Plugin {
  return {
    name: "route-skeletons",
    apply: "build",
    async closeBundle() {
      const indexPath = path.join(DIST, "index.html");
      if (!fs.existsSync(indexPath)) return;

      const indexHtml = fs.readFileSync(indexPath, "utf-8");
      const routes = loadRoutes();
      const publicSiblingExists = (slug: string) =>
        fs.existsSync(path.join(PUBLIC, `${slug}.html`));

      // Build-time render of the static snapshots. The snapshot modules touch
      // no window/document; the interactive app is untouched. Alias
      // routes render none (their interactive page is a redirect).
      const server = await createSeoServer();
      let snapshots: SnapshotPages;
      let blogPages: SnapshotPages;
      try {
        const prerender = await server.ssrLoadModule(
          "/src/renderer/snapshot/prerender.tsx",
        );
        snapshots = prerender.routeSnapshotPages() as SnapshotPages;
        blogPages = prerender.blogSnapshotPages(
          collectBlogEnv(PUBLIC),
        ) as SnapshotPages;
      } finally {
        await server.close();
      }

      for (const route of routes) {
        const normalized = normalizeRoute(route.path);
        const base = withRouteMeta(indexHtml, route);
        const snapshot = snapshotFor(snapshots, normalized);
        const html =
          snapshot === undefined ? base : injectSnapshot(base, snapshot);

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

      // Blog pages: same shell, same meta mechanism, blog meta, snapshot
      // inside #root. Written at <path>/index.html plus a <path>.html
      // sibling for static hosts (the raw <path>.md source files keep
      // their direct URLs untouched).
      for (const page of blogPages) {
        const normalized = normalizeRoute(page.path);
        const html = injectSnapshot(
          withRouteMeta(indexHtml, {
            path: normalized,
            title: page.title,
            description: page.description,
          }),
          page.html,
        );
        const slug = normalized.slice(1);
        fs.mkdirSync(path.join(DIST, slug), { recursive: true });
        fs.writeFileSync(path.join(DIST, slug, "index.html"), html, "utf-8");
        // a hand-written public/<path>.html wins over the generated sibling
        if (!fs.existsSync(path.join(PUBLIC, `${slug}.html`))) {
          fs.writeFileSync(path.join(DIST, `${slug}.html`), html, "utf-8");
        }
      }

      fs.writeFileSync(
        path.join(DIST, "sitemap.xml"),
        generateSitemap(
          routes,
          blogPages.map((page) => ({
            path: page.path,
            lastmod: blogPathDate(PUBLIC, page.path),
          })),
        ),
        "utf-8",
      );

      fs.writeFileSync(
        path.join(DIST, ".generated.json"),
        `${JSON.stringify(
          {
            generated: mergeGeneratedPaths(
              generatedPathsForRoutes(routes, publicSiblingExists),
              generatedBlogPaths(blogPages, (pagePath) =>
                fs.existsSync(path.join(PUBLIC, `${pagePath}.html`)),
              ),
            ),
          },
          null,
          2,
        )}\n`,
        "utf-8",
      );
    },
  };
}
