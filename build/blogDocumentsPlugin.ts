import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Connect, Plugin } from "vite";
import { ROOT } from "./env.ts";

const ASSETS =
  /\.(md|html?|txt|xml|json|css|js|pdf|png|jpe?g|gif|webp|svg|ico|avif|mp3|mp4|ogg|wav|woff2?)$/i;

/** Extension-less /blog/** URLs are post pages; the files live under + .md. */
const BLOG_PAGE = new RegExp(
  `^/blog/.+(?<!${ASSETS.source.slice(2, -1)})$`,
  "i",
);

/**
 * Browser page loads for /blog/** (without an extension) get the SPA shell,
 * rendered as a BlogPostPage embedding /blog/**.md. Requests for existing
 * files — including /blog/**.md itself — pass through untouched and receive
 * the raw resource from public/.
 */
const middleware: Connect.NextHandleFunction = (req, _res, next) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const isPage =
    req.headers["sec-fetch-dest"] === "document" ||
    (req.headers.accept ?? "").includes("text/html");
  if (isPage && BLOG_PAGE.test(pathname)) req.url = "/index.html";
  next();
};

export function blogDocumentsPlugin(): Plugin {
  return {
    name: "blog-documents",
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}
