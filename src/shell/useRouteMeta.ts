import { useEffect } from "react";
import type { Route } from "@/content";

const ORIGIN = "https://akinevz.com";

function setMeta(selector: string, attr: "content" | "href", value: string) {
  document.head.querySelector(selector)?.setAttribute(attr, value);
}

/** Keeps document title and social metadata in step with the current route. */
export function useRouteMeta(route: Route) {
  useEffect(() => {
    const url = `${ORIGIN}${route.path === "/" ? "/" : route.path}`;
    document.title = route.title;
    setMeta('meta[name="description"]', "content", route.description);
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:title"]', "content", route.title);
    setMeta('meta[property="og:description"]', "content", route.description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[name="twitter:title"]', "content", route.title);
    setMeta('meta[name="twitter:description"]', "content", route.description);
  }, [route]);
}
