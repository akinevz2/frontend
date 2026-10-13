import { routes, type Route } from "@/content";

export const NOT_FOUND = routes.find((r) => r.path === "/404") as Route;

/** Mirrors the legacy site: decode, drop .html / index / trailing slash, lowercase. */
export function normalizePath(pathname: string): string {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
  path = path.replace(/\/index(\.html)?$/i, "").replace(/\.html$/i, "");
  path = `/${path.replace(/^\/+|\/+$/g, "")}`;
  const lower = path.toLowerCase();
  return routes.some((r) => r.path === lower) ? lower : path;
}

const BLOG_DOCUMENT = /^\/blog\/.+\.md$/i;

/** Any /blog/**.md URL is a post page; the file itself is fetched by the page. */
function blogDocumentRoute(pathname: string): Route {
  const name = decodeURI(pathname).split("/").pop() ?? pathname;
  return {
    path: pathname,
    title: `${name} | blog of kine`,
    description: `${name} from the blog of kine.`,
    page: "BlogPostPage",
    hidden: true,
  };
}

export function resolveRoute(pathname: string): Route {
  if (BLOG_DOCUMENT.test(pathname)) return blogDocumentRoute(pathname);
  const path = normalizePath(pathname);
  const route = routes.find((r) => r.path === path);
  return route ?? NOT_FOUND;
}
