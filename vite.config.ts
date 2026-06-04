/// <reference types="node" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildMusicGroupSchema, serializeJsonLd } from "./scripts/music-schema.mjs";

const pagesJsonPath = new URL("./src/pages.json", import.meta.url);

type PageDefinition = {
  path: string;
  title: string;
  description: string;
};

type SoundCloudTrack = {
  title: string;
  url: string;
};

type SoundCloudPayload = {
  tracks?: SoundCloudTrack[];
};

const pages = JSON.parse(fs.readFileSync(pagesJsonPath, "utf-8")) as PageDefinition[];
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://akinevz.com";
const DEV_HOST = process.env.VITE_DEV_HOST || "127.0.0.1";
const DEV_PORT = Number(process.env.VITE_DEV_PORT || "8086");

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

function normalizeRoute(routePath: string): string {
  if (!routePath || routePath === "/") {
    return "/";
  }

  return `/${routePath.replace(/^\/+|\/+$/g, "")}`;
}

function getRouteUrl(routePath: string): string {
  return new URL(normalizeRoute(routePath), SITE_ORIGIN).toString();
}

function getSitemapLastMod(): string {
  return new Date().toISOString().slice(0, 10);
}

function getSitemapPriority(routePath: string): string {
  switch (normalizeRoute(routePath)) {
    case "/":
      return "1.0";
    case "/sitemap":
      return "0.9";
    case "/music":
    case "/blog":
      return "0.8";
    default:
      return "0.7";
  }
}

function getSitemapChangeFreq(routePath: string): string {
  switch (normalizeRoute(routePath)) {
    case "/":
    case "/music":
      return "weekly";
    case "/blog":
      return "monthly";
    case "/sitemap":
      return "monthly";
    default:
      return "yearly";
  }
}

function getSoundCloudTracks(): SoundCloudTrack[] {
  const soundcloudJsonPath = path.resolve(process.cwd(), "public/soundcloud.json");

  if (!fs.existsSync(soundcloudJsonPath)) {
    return [];
  }

  try {
    const payload = JSON.parse(fs.readFileSync(soundcloudJsonPath, "utf-8")) as SoundCloudPayload;
    return Array.isArray(payload.tracks) ? payload.tracks : [];
  } catch {
    return [];
  }
}

function withStructuredData(indexHtml: string, tracks: SoundCloudTrack[]): string {
  const structuredData = `<script type="application/ld+json" id="homepage-music-structured-data">${serializeJsonLd(
    buildMusicGroupSchema(tracks),
  )}</script>`;

  return indexHtml.replace("</head>", `${structuredData}\n  </head>`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function replaceTitleByDataMeta(html: string, title: string): string {
  const pattern = /<title[^>]*data-route-meta=["']title["'][^>]*>[\s\S]*?<\/title>/i;
  return html.replace(pattern, `<title data-route-meta="title">${title}</title>`);
}

function replaceSelfClosingTagByDataMeta(
  html: string,
  key: string,
  replacement: string,
): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<[^>]*data-route-meta=["']${escapedKey}["'][^>]*\\/?\\s*>`, "i");
  return html.replace(pattern, replacement);
}

function withRouteMeta(indexHtml: string, page: PageDefinition): string {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = escapeHtml(getRouteUrl(page.path));
  const socialImageUrl = escapeHtml(new URL("/avatar.png", SITE_ORIGIN).toString());

  let nextHtml = indexHtml;
  nextHtml = replaceTitleByDataMeta(nextHtml, title);
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "description",
    `<meta name="description" content="${description}" data-route-meta="description" />`,
  );
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "canonical",
    `<link rel="canonical" href="${url}" data-route-meta="canonical" />`,
  );
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "og:title",
    `<meta property="og:title" content="${title}" data-route-meta="og:title" />`,
  );
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "og:description",
    `<meta property="og:description" content="${description}" data-route-meta="og:description" />`,
  );
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "og:url",
    `<meta property="og:url" content="${url}" data-route-meta="og:url" />`,
  );
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "og:image",
    `<meta property="og:image" content="${socialImageUrl}" data-route-meta="og:image" />`,
  );
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "twitter:card",
    '<meta name="twitter:card" content="summary" data-route-meta="twitter:card" />',
  );
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "twitter:image",
    `<meta name="twitter:image" content="${socialImageUrl}" data-route-meta="twitter:image" />`,
  );
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "twitter:title",
    `<meta name="twitter:title" content="${title}" data-route-meta="twitter:title" />`,
  );
  nextHtml = replaceSelfClosingTagByDataMeta(
    nextHtml,
    "twitter:description",
    `<meta name="twitter:description" content="${description}" data-route-meta="twitter:description" />`,
  );

  return nextHtml;
}

function generateSitemapXml(): string {
  const urls = pages
    .map(
      (page) =>
        [
          "  <url>",
          `    <loc>${escapeHtml(getRouteUrl(page.path))}</loc>`,
          `    <lastmod>${getSitemapLastMod()}</lastmod>`,
          `    <changefreq>${getSitemapChangeFreq(page.path)}</changefreq>`,
          `    <priority>${getSitemapPriority(page.path)}</priority>`,
          "  </url>",
        ].join("\n"),
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("\n");
}

function routeSkeletonPlugin() {
  return {
    name: "vite-plugin-route-skeletons",
    apply: "build" as const,
    closeBundle() {
      const outDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) {
        return;
      }

      const indexHtml = fs.readFileSync(indexPath, "utf-8");
      const soundCloudTracks = getSoundCloudTracks();
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), generateSitemapXml(), "utf-8");

      for (const page of pages) {
        const routeHtml =
          normalizeRoute(page.path || "/") === "/"
            ? withStructuredData(withRouteMeta(indexHtml, page), soundCloudTracks)
            : withRouteMeta(indexHtml, page);
        const normalizedRoutePath = normalizeRoute(page.path || "/");

        if (normalizedRoutePath === "/") {
          fs.writeFileSync(indexPath, routeHtml, "utf-8");
          continue;
        }

        const normalizedRoute = normalizedRoutePath.replace(/^\/+|\/+$/g, "");
        const routeDir = path.join(outDir, normalizedRoute);
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, "index.html"), routeHtml, "utf-8");
        fs.writeFileSync(path.join(outDir, `${normalizedRoute}.html`), routeHtml, "utf-8");
      }
    },
  };
}

export default defineConfig({
  publicDir: "public",
  plugins: [react(), routeSkeletonPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("react-markdown") || id.includes("rehype-raw")) {
            return "markdown";
          }

          if (id.includes("react-toastify")) {
            return "toastify";
          }

          if (id.includes("xp.css")) {
            return "xpcss";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
    cors: false,
    headers: SECURITY_HEADERS,
    watch: {
      usePolling: true,
    },
  },
  preview: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
    headers: SECURITY_HEADERS,
  },
});
