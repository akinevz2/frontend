import { SITE_ORIGIN } from "./env.ts";
import { escapeHtml, normalizeRoute, type RouteConfig } from "./routes.ts";

const PRIORITY: Record<string, string> = {
  "/": "1.0",
  "/sitemap": "0.9",
  "/music": "0.1",
  "/blog": "0.1",
};
const HOURLY = new Set(["/", "/sitemap", "/music", "/blog"]);

/** Non-route canonical pages in the sitemap: every blog post page and
 * listed directory (they are real emitted html pages, indexable by
 * decision), with <lastmod> from the source file's mtime. */
export type SitemapExtra = {
  path: string;
  lastmod?: string | undefined;
};

export function generateSitemap(
  routes: RouteConfig[],
  extras: SitemapExtra[] = [],
): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes
    .filter((r) => !r.hidden && normalizeRoute(r.path) !== "/404")
    .map((r) => {
      const route = normalizeRoute(r.path);
      const loc = escapeHtml(new URL(route, SITE_ORIGIN).toString());
      // project pages carry their content date (the same lastModified the
      // projects listing sorts on); everything else builds today
      const lastmod = r.lastModified ?? today;
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${HOURLY.has(route) ? "hourly" : "daily"}</changefreq>`,
        `    <priority>${PRIORITY[route] ?? "0.7"}</priority>`,
        "  </url>",
      ].join("\n");
    });

  for (const extra of extras) {
    const loc = escapeHtml(
      new URL(normalizeRoute(extra.path), SITE_ORIGIN).toString(),
    );
    urls.push(
      [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${extra.lastmod ?? today}</lastmod>`,
        "    <changefreq>monthly</changefreq>",
        "    <priority>0.6</priority>",
        "  </url>",
      ].join("\n"),
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.join("\n"),
    "</urlset>",
  ].join("\n");
}
