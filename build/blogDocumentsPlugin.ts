import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Connect, Plugin } from "vite";
import { ROOT } from "./env.ts";

const BLOG_DOCUMENT = /^\/blog\/.+\.md$/i;

const RAW_PREFIX = "/raw";

/**
 * Hosts that rewrite on path alone (Render) cannot tell a page load from a
 * fetch, so embeds read the raw markdown from /raw/blog/** instead.
 *
 * Browser page requests for /blog/**.md get the SPA shell (rendered by
 * BlogPostPage); every other request for the file still receives the raw
 * markdown from public/.
 */
const middleware: Connect.NextHandleFunction = (req, _res, next) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const isPage =
    req.headers["sec-fetch-dest"] === "document" ||
    (req.headers.accept ?? "").includes("text/html");
  if (pathname.startsWith(`${RAW_PREFIX}/blog/`))
    req.url = req.url!.slice(RAW_PREFIX.length);
  else if (isPage && BLOG_DOCUMENT.test(pathname)) req.url = "/index.html";
  next();
};

export function blogDocumentsPlugin(): Plugin {
  return {
    name: "blog-documents",
    generateBundle() {
      const root = path.join(ROOT, "public/blog");
      const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (/\.md$/i.test(entry.name))
            this.emitFile({
              type: "asset",
              fileName: `raw/blog/${path.relative(root, full).split(path.sep).join("/")}`,
              source: readFileSync(full),
            });
        }
      };
      walk(root);
    },
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}
