import { SITE_ORIGIN } from "./env.ts";
import { escapeHtml, normalizeRoute, type RouteConfig } from "./routes.ts";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function replaceMeta(html: string, key: string, tag: string): string {
  if (key === "title") {
    return html.replace(
      /<title[^>]*data-route-meta=["']title["'][^>]*>[\s\S]*?<\/title>/i,
      tag,
    );
  }
  return html.replace(
    new RegExp(
      `<[^>]*data-route-meta=["']${escapeRegExp(key)}["'][^>]*\\/?\\s*>`,
      "i",
    ),
    tag,
  );
}

/** Rewrites the data-route-meta tags in index.html for one route. */
export function withRouteMeta(html: string, route: RouteConfig): string {
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const url = escapeHtml(
    new URL(normalizeRoute(route.path), SITE_ORIGIN).toString(),
  );
  const image = escapeHtml(new URL("/avatar.png", SITE_ORIGIN).toString());

  const tags: Array<[string, string]> = [
    ["title", `<title data-route-meta="title">${title}</title>`],
    ["description", `<meta name="description" content="${description}" data-route-meta="description" />`],
    ["canonical", `<link rel="canonical" href="${url}" data-route-meta="canonical" />`],
    ["og:title", `<meta property="og:title" content="${title}" data-route-meta="og:title" />`],
    ["og:description", `<meta property="og:description" content="${description}" data-route-meta="og:description" />`],
    ["og:url", `<meta property="og:url" content="${url}" data-route-meta="og:url" />`],
    ["og:image", `<meta property="og:image" content="${image}" data-route-meta="og:image" />`],
    ["twitter:card", `<meta name="twitter:card" content="summary" data-route-meta="twitter:card" />`],
    ["twitter:image", `<meta name="twitter:image" content="${image}" data-route-meta="twitter:image" />`],
    ["twitter:title", `<meta name="twitter:title" content="${title}" data-route-meta="twitter:title" />`],
    ["twitter:description", `<meta name="twitter:description" content="${description}" data-route-meta="twitter:description" />`],
  ];

  return tags.reduce((acc, [key, tag]) => replaceMeta(acc, key, tag), html);
}
