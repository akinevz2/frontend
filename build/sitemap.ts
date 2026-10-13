import { SITE_ORIGIN } from "./env.ts";
import { escapeHtml, normalizeRoute, type RouteConfig } from "./routes.ts";

const PRIORITY: Record<string, string> = {
  "/": "1.0",
  "/sitemap": "0.9",
  "/music": "0.1",
  "/blog": "0.1",
};
const HOURLY = new Set(["/", "/sitemap", "/music", "/blog"]);

export function generateSitemap(routes: RouteConfig[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes
    .filter((r) => !r.hidden && normalizeRoute(r.path) !== "/404")
    .map((r) => {
      const route = normalizeRoute(r.path);
      const loc = escapeHtml(new URL(route, SITE_ORIGIN).toString());
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${HOURLY.has(route) ? "hourly" : "daily"}</changefreq>`,
        `    <priority>${PRIORITY[route] ?? "0.7"}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("\n");
}
