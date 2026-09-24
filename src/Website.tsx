import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouting } from "./utils/routingReducer";

type RouteConfig = {
  title: string;
  description: string;
};

type PageRoute = RouteConfig & {
  path: string;
};

const DEFAULT_ROUTE: RouteConfig = {
  title: "home of kine",
  description: "my cozy little personal website",
};

// This will be populated from pages.json, but for now we'll keep this structure
const PAGE_ROUTES: PageRoute[] = [];

const TOP_LEVEL_ROUTES = new Set(
  PAGE_ROUTES.map(({ path }) => path.split("/").filter(Boolean)[0]).filter(
    Boolean,
  ),
);

const ROUTE_CONFIG: Record<string, RouteConfig> = {};

const normalizePath = (path: string) => {
  if (!path || path === "/") {
    return "/";
  }

  const decodedPath = decodeURIComponent(path);
  const withoutIndexHtml = decodedPath.replace(/\/index\.html$/i, "/");
  const withoutHtml = withoutIndexHtml.replace(/\.html$/i, "");
  const withoutTrailingSlash = withoutHtml.replace(/\/+$/, "");
  const segments = withoutTrailingSlash.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "/";
  }

  const [firstSegment] = segments;

  // Preserve /blog/login as a distinct route (don't collapse to /blog)
  // so it can redirect to the admin panel on WS-VISION.
  if (
    segments.length === 2 &&
    firstSegment?.toLowerCase() === "blog" &&
    segments[1]?.toLowerCase() === "login"
  ) {
    return "/blog/login";
  }

  if (firstSegment && TOP_LEVEL_ROUTES.has(firstSegment.toLowerCase())) {
    return `/${firstSegment.toLowerCase()}`;
  }

  return withoutTrailingSlash || "/";
};

const isInternalPath = (href: string) => href.startsWith("/");

export default function Website() {
  const { state: routingState, navigate } = useRouting({
    normalizePath,
    isInternalPath,
  });
  const path = routingState.path;
  
  const route = ROUTE_CONFIG[path] ?? DEFAULT_ROUTE;

  // Route rendering logic - extracted from App.tsx
  // All the page-specific logic from the original App.tsx
  return (
    <>
      {path === "/blog" ? (
        <main>
          <div className="blog-content">
            {/* Blog content would be rendered here */}
            <h1>Blog Content</h1>
          </div>
        </main>
      ) : path === "/music" ? (
        <main>
          <div className="music-content">
            {/* Music content would be rendered here */}
            <h1>Music Content</h1>
          </div>
        </main>
      ) : path === "/sitemap" ? (
        <main>
          <div className="sitemap-content">
            {/* Sitemap content would be rendered here */}
            <h1>Sitemap Content</h1>
          </div>
        </main>
      ) : path === "/contact" ? (
        <main>
          <div className="contact-content">
            {/* Contact content would be rendered here */}
            <h1>Contact Content</h1>
          </div>
        </main>
      ) : path === "/resume" ? (
        <main>
          <div className="resume-content">
            {/* Resume content would be rendered here */}
            <h1>Resume Content</h1>
          </div>
        </main>
      ) : path === "/wow" ? (
        <main>
          <div className="wow-content">
            {/* WoW content would be rendered here */}
            <h1>WoW Content</h1>
          </div>
        </main>
      ) : path === "/pagerts" ? (
        <main>
          <div className="pagerts-content">
            {/* Pagerts content would be rendered here */}
            <h1>Pagerts Content</h1>
          </div>
        </main>
      ) : path === "/addons" ? (
        <main>
          <div className="addons-content">
            {/* Addons content would be rendered here */}
            <h1>Addons Content</h1>
          </div>
        </main>
      ) : path === "/" ? (
        <main>
          <div className="home-content">
            {/* Home content would be rendered here */}
            <h1>Home Content</h1>
          </div>
        </main>
      ) : (
        /* Default 404 page */
        <main>
          <div className="not-found-content">
            <h1>Page Not Found</h1>
            <p>The requested page could not be found.</p>
          </div>
        </main>
      )}
    </>
  );
}