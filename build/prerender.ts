import { normalizeRoute } from "./routes.ts";

/**
 * Build-time snapshot wiring helpers (pure — unit-tested without fs).
 *
 * The html the snapshot pages are written from is the same built
 * index.html the route skeletons use; the snapshot fragment is injected
 * inside <div id="root"> (createRoot replaces the subtree on mount — no
 * hydration, so the static content is safe). Alias routes get NO
 * snapshot: their interactive page is a redirect, and a full snapshot
 * there would be cloaking.
 */

/** The exact empty root the SPA shell ships with. */
const ROOT_DIV = '<div id="root"></div>';

/** Replaces the empty root div with root + snapshot. Returns the html
 * unchanged when there is no root div to inject into. */
export function injectSnapshot(html: string, snapshotHtml: string): string {
  if (!html.includes(ROOT_DIV)) return html;
  return html.replace(ROOT_DIV, `<div id="root">${snapshotHtml}</div>`);
}

/** Snapshot page paths (from src/renderer/snapshot/prerender), keyed by normalized
 * route path. */
export type SnapshotPages = Array<{
  path: string;
  /** Page title/description for the route meta mechanism. */
  title: string;
  description: string;
  html: string;
  /** Optional per-page JSON-LD (lessons carry a TechArticle). */
  jsonld?: object;
}>;

/** The snapshot fragment for one route, or undefined (aliases and
 * unmatched paths carry none). */
export function snapshotFor(
  pages: SnapshotPages,
  routePath: string,
): string | undefined {
  const normalized = normalizeRoute(routePath);
  const page = pages.find((p) => normalizeRoute(p.path) === normalized);
  return page?.html;
}

/**
 * dist-relative paths the blog snapshot pages emit: one index.html per
 * page plus a `<name>.html` sibling for static hosts, unless a
 * hand-written public file wins over the sibling (the same rule the
 * route skeletons apply). Exported pure so tests can assert the set.
 */
export function generatedBlogPaths(
  pages: Array<{ path: string }>,
  publicSiblingExists: (path: string) => boolean,
): string[] {
  const generated: string[] = [];
  for (const page of pages) {
    const normalized = normalizeRoute(page.path);
    const slug = normalized.slice(1);
    generated.push(`${slug}/index.html`);
    if (!publicSiblingExists(normalized)) {
      generated.push(`${slug}.html`);
    }
  }
  return [...new Set(generated)].sort();
}

/** Convenience: merge route-generated and blog-generated path lists into
 * the one sorted manifest list .generated.json holds. */
export function mergeGeneratedPaths(...lists: string[][]): string[] {
  return [...new Set(lists.flat())].sort();
}
