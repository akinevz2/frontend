import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import type { PageConfig } from "./src/page/types"
import type { SoundCloudTrack } from "./src/content/types"

// ─── env ──────────────────────────────────────────────────────────────────────

const SITE_ORIGIN = process.env.SITE_ORIGIN ?? "https://akinevz.com"
const DEV_HOST = process.env.VITE_DEV_HOST ?? "127.0.0.1"
const DEV_PORT = Number(process.env.VITE_DEV_PORT ?? "8086")

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "frame-ancestors 'self'",
  "Referrer-Policy": "no-referrer",
}

// ─── utils ────────────────────────────────────────────────────────────────────

function normalizeRoute(routePath: string): string {
  if (!routePath || routePath === "/") return "/"
  return `/${routePath.replace(/^\/+|\/+$/g, "")}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

// ─── meta injection ───────────────────────────────────────────────────────────

function replaceMeta(html: string, key: string, tag: string): string {
  if (key === "title") {
    return html.replace(
      /<title[^>]*data-route-meta=["']title["'][^>]*>[\s\S]*?<\/title>/i,
      tag
    )
  }
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return html.replace(
    new RegExp(`<[^>]*data-route-meta=["']${k}["'][^>]*\\/?\\s*>`, "i"),
    tag
  )
}

function withRouteMeta(html: string, page: PageConfig): string {
  const t = escapeHtml(page.title)
  const d = escapeHtml(page.description)
  const url = escapeHtml(new URL(normalizeRoute(page.path), SITE_ORIGIN).toString())
  const img = escapeHtml(new URL("/avatar.png", SITE_ORIGIN).toString())

  const tags: Array<[string, string]> = [
    ["title", `<title data-route-meta="title">${t}</title>`],
    ["description", `<meta name="description" content="${d}" data-route-meta="description" />`],
    ["canonical", `<link rel="canonical" href="${url}" data-route-meta="canonical" />`],
    ["og:title", `<meta property="og:title" content="${t}" data-route-meta="og:title" />`],
    ["og:description", `<meta property="og:description" content="${d}" data-route-meta="og:description" />`],
    ["og:url", `<meta property="og:url" content="${url}" data-route-meta="og:url" />`],
    ["og:image", `<meta property="og:image" content="${img}" data-route-meta="og:image" />`],
    ["twitter:card", `<meta name="twitter:card" content="summary" data-route-meta="twitter:card" />`],
    ["twitter:image", `<meta name="twitter:image" content="${img}" data-route-meta="twitter:image" />`],
    ["twitter:title", `<meta name="twitter:title" content="${t}" data-route-meta="twitter:title" />`],
    ["twitter:description", `<meta name="twitter:description" content="${d}" data-route-meta="twitter:description" />`],
  ]

  return tags.reduce((h, [key, tag]) => replaceMeta(h, key, tag), html)
}

function withStructuredData(html: string, _tracks: SoundCloudTrack[]): string {
  // TODO: re-enable when buildMusicGroupSchema is restored
  return html
}

// ─── soundcloud ───────────────────────────────────────────────────────────────

function getSoundCloudTracks(): SoundCloudTrack[] {
  const p = path.resolve(process.cwd(), "public/soundcloud.json")
  if (!fs.existsSync(p)) return []
  try {
    const payload = JSON.parse(fs.readFileSync(p, "utf-8")) as { tracks?: SoundCloudTrack[] }
    return Array.isArray(payload.tracks) ? payload.tracks : []
  } catch { return [] }
}

// ─── sitemap ──────────────────────────────────────────────────────────────────

const PRIORITY: Record<string, string> = { "/": "1.0", "/sitemap": "0.9", "/music": "0.1", "/blog": "0.1" }
const CHANGEFREQ: Record<string, string> = { "/": "hourly", "/sitemap": "hourly", "/music": "hourly", "/blog": "hourly" }

function generateSitemap(pageList: PageConfig[]): string {
  const today = new Date().toISOString().slice(0, 10)
  const urls = pageList
    .filter(p => normalizeRoute(p.path) !== "/404")
    .map(p => {
      const route = normalizeRoute(p.path)
      const loc = escapeHtml(new URL(route, SITE_ORIGIN).toString())
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${CHANGEFREQ[route] ?? "daily"}</changefreq>`,
        `    <priority>${PRIORITY[route] ?? "0.7"}</priority>`,
        "  </url>",
      ].join("\n")
    }).join("\n")

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("\n")
}

// ─── plugin ───────────────────────────────────────────────────────────────────
// replace the import { pages } from "./src/page" line with this
const pages = JSON.parse(
  fs.readFileSync(
    new URL("./src/content/pages.json", import.meta.url),
    "utf-8"
  )
) as PageConfig[]

function routeSkeletonPlugin() {
  return {
    name: "vite-plugin-route-skeletons",
    apply: "build" as const,
    closeBundle() {
      const outDir = path.resolve(process.cwd(), "dist")
      const indexPath = path.join(outDir, "index.html")
      if (!fs.existsSync(indexPath)) return

      const indexHtml = fs.readFileSync(indexPath, "utf-8")
      const tracks = getSoundCloudTracks()

      for (const page of pages) {
        const route = normalizeRoute(page.path)
        const html = route === "/"
          ? withStructuredData(withRouteMeta(indexHtml, page), tracks)
          : withRouteMeta(indexHtml, page)

        if (route === "/") {
          fs.writeFileSync(indexPath, html, "utf-8")
          continue
        }

        const slug = route.replace(/^\/+|\/+$/g, "")
        const dir = path.join(outDir, slug)
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8")

        const publicSibling = path.join(process.cwd(), "public", `${slug}.html`)
        if (!fs.existsSync(publicSibling)) {
          fs.writeFileSync(path.join(outDir, `${slug}.html`), html, "utf-8")
        }
      }

      // was defined but never written in the original — fixed
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), generateSitemap(pages), "utf-8")
    },
  }
}

// ─── config ───────────────────────────────────────────────────────────────────
const inCwd = (slug: string) => path.resolve(process.cwd(), slug)

export default defineConfig({
  publicDir: "public",
  resolve: {
    alias: {
      "@": inCwd("src"),
      "@public": inCwd("public"),
      "@content": inCwd("src/content"),
      "@styles": inCwd("src/styles"),
      "@page": inCwd("src/page"),
    }
  },
  plugins: [react(), routeSkeletonPlugin()],
  build: {
    cssMinify: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return
          if (id.includes("firebase")) return "firebase"
          if (id.includes("react") || id.includes("scheduler")) return "react-core"
          if (id.includes("react-markdown") || id.includes("rehype-raw")) return "markdown"
          if (id.includes("react-toastify")) return "toastify"
          if (id.includes("xp.css")) return "xpcss"
          return "vendor"
        },
      },
    },
  },
  server: {
    host: DEV_HOST, port: DEV_PORT, strictPort: true,
    cors: false, headers: SECURITY_HEADERS,
    watch: { usePolling: true },
  },
  preview: {
    host: DEV_HOST, port: DEV_PORT, strictPort: true,
    headers: SECURITY_HEADERS,
  },
})