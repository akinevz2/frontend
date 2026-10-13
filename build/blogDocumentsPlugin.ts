import type { Connect, Plugin } from "vite";

const BLOG_DOCUMENT = /^\/blog\/.+\.md$/i;

/**
 * Browser page requests for /blog/**.md get the SPA shell (rendered by
 * BlogPostPage); every other request for the file still receives the raw
 * markdown from public/.
 */
const middleware: Connect.NextHandleFunction = (req, _res, next) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const isPage =
    req.headers["sec-fetch-dest"] === "document" ||
    (req.headers.accept ?? "").includes("text/html");
  if (isPage && BLOG_DOCUMENT.test(pathname)) req.url = "/index.html";
  next();
};

export function blogDocumentsPlugin(): Plugin {
  return {
    name: "blog-documents",
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}
