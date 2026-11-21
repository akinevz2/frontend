import fs from "node:fs";
import path from "node:path";
import { PUBLIC, SITE_ORIGIN } from "./env.ts";
import {
  personJsonLd,
  softwareJsonLd,
  truncateDescription,
} from "../src/lib/seo.ts";
import { escapeHtml, normalizeRoute, type RouteConfig } from "./routes.ts";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function replaceMeta(html: string, key: string, tag: string): string {
  if (key === "title" || key === "jsonld") {
    // paired tags: replace the whole element, children included
    const close = key === "jsonld" ? "script" : "title";
    const paired = new RegExp(
      `<${close}[^>]*data-route-meta=["']${escapeRegExp(key)}["'][^>]*>[\\s\\S]*?<\\/${close}\\s*>`,
      "i",
    );
    return html.replace(paired, tag);
  }
  return html.replace(
    new RegExp(
      `<[^>]*data-route-meta=["']${escapeRegExp(key)}["'][^>]*\\/?\\s*>`,
      "i",
    ),
    tag,
  );
}

/** og:image:width/height are read from the REAL public/avatar.png (IHDR
 * chunk) — no invented dimensions, no hardcoded copies to drift. */
function pngDimensions(file: string): { width: number; height: number } {
  const buffer = fs.readFileSync(file);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

let avatarSize: { width: number; height: number } | undefined;
const avatarDimensions = () =>
  (avatarSize ??= pngDimensions(path.join(PUBLIC, "avatar.png")));

/** The route's JSON-LD: Person on "/", SoftwareSourceCode on canonical
 * project routes (the ones carrying a github field); nothing elsewhere.
 * Alias routes (hidden, redirecting) never carry JSON-LD. */
function routeJsonLd(route: RouteConfig): object | null {
  if (normalizeRoute(route.path) === "/") {
    return personJsonLd(new URL("/", SITE_ORIGIN).toString());
  }
  if (route.github) {
    return softwareJsonLd(route);
  }
  return null;
}

/** Rewrites the data-route-meta tags in index.html for one route.
 * Descriptions longer than META_DESCRIPTION_MAX truncate (word
 * boundary + ellipsis) in the meta/og/twitter tags only — copy is never
 * rewritten. */
export function withRouteMeta(html: string, route: RouteConfig): string {
  const title = escapeHtml(route.title);
  // truncated for the head tags only; JSON-LD keeps the full text
  const description = escapeHtml(truncateDescription(route.description));
  const url = escapeHtml(
    new URL(normalizeRoute(route.path), SITE_ORIGIN).toString(),
  );
  const image = escapeHtml(new URL("/avatar.png", SITE_ORIGIN).toString());
  const { width, height } = avatarDimensions();

  const jsonLd = routeJsonLd(route);
  const jsonLdTag = jsonLd
    ? `<script type="application/ld+json" data-route-meta="jsonld">${JSON.stringify(jsonLd)}</script>`
    : "";

  const tags: Array<[string, string]> = [
    ["title", `<title data-route-meta="title">${title}</title>`],
    [
      "description",
      `<meta name="description" content="${description}" data-route-meta="description" />`,
    ],
    [
      "canonical",
      `<link rel="canonical" href="${url}" data-route-meta="canonical" />`,
    ],
    [
      "og:title",
      `<meta property="og:title" content="${title}" data-route-meta="og:title" />`,
    ],
    [
      "og:description",
      `<meta property="og:description" content="${description}" data-route-meta="og:description" />`,
    ],
    [
      "og:url",
      `<meta property="og:url" content="${url}" data-route-meta="og:url" />`,
    ],
    [
      "og:image",
      `<meta property="og:image" content="${image}" data-route-meta="og:image" />`,
    ],
    [
      "og:image:width",
      `<meta property="og:image:width" content="${width}" data-route-meta="og:image:width" />`,
    ],
    [
      "og:image:height",
      `<meta property="og:image:height" content="${height}" data-route-meta="og:image:height" />`,
    ],
    [
      "twitter:card",
      `<meta name="twitter:card" content="summary" data-route-meta="twitter:card" />`,
    ],
    [
      "twitter:image",
      `<meta name="twitter:image" content="${image}" data-route-meta="twitter:image" />`,
    ],
    [
      "twitter:title",
      `<meta name="twitter:title" content="${title}" data-route-meta="twitter:title" />`,
    ],
    [
      "twitter:description",
      `<meta name="twitter:description" content="${description}" data-route-meta="twitter:description" />`,
    ],
    ["jsonld", jsonLdTag],
  ];

  return tags.reduce((acc, [key, tag]) => replaceMeta(acc, key, tag), html);
}
