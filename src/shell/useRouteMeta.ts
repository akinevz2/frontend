import { useEffect } from "react";
import type { Route } from "@/content";
import { projectPath, projects } from "@/content";
import { personJsonLd, softwareJsonLd, truncateDescription } from "@/lib/seo";

const ORIGIN = "https://akinevz.com";

function setMeta(selector: string, attr: "content" | "href", value: string) {
  document.head.querySelector(selector)?.setAttribute(attr, value);
}

/** The route's JSON-LD — the SAME computation the build performs
 * (build/meta.ts, via src/lib/seo): Person on "/", SoftwareSourceCode on
 * canonical project routes, none elsewhere (aliases redirect). */
function routeJsonLd(route: Route): object | null {
  if (route.alias) return null;
  if (route.path === "/") {
    return personJsonLd(`${ORIGIN}/`);
  }
  if (route.page === "ProjectPage") {
    const project = projects.find((p) => projectPath(p) === route.path);
    if (project) return softwareJsonLd(project);
  }
  return null;
}

/** Keeps document title and social metadata in step with the current
 * route. Truncation and JSON-LD use the same shared helpers as the
 * build (src/lib/seo), so the static head and the navigated head agree. */
export function useRouteMeta(route: Route) {
  useEffect(() => {
    const url = `${ORIGIN}${route.path === "/" ? "/" : route.path}`;
    const description = truncateDescription(route.description);
    document.title = route.title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:title"]', "content", route.title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[name="twitter:title"]', "content", route.title);
    setMeta('meta[name="twitter:description"]', "content", description);
    // the build-time JSON-LD placeholder script: replaced for routes with
    // an entity, removed otherwise (no stale entity from a prior route)
    const id = "route-jsonld";
    const existing =
      (document.getElementById(id) as HTMLScriptElement | null) ??
      document.head.querySelector<HTMLScriptElement>(
        'script[data-route-meta="jsonld"]',
      );
    const ld = routeJsonLd(route);
    if (!ld) {
      existing?.remove();
      return;
    }
    const script = existing ?? document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(ld);
    if (!existing) document.head.appendChild(script);
  }, [route]);
}
