/**
 * Source of truth for which built `dist/` artifacts are expected to vary
 * between otherwise-identical builds (a "content-refresh" run).
 *
 * Everything NOT listed here is treated as STABLE and must not drift
 * across a content-only refresh.  This is a denylist (mutable set)
 * rather than an allowlist (stable set) because:
 *
 *   1. The mutable set is small and has stable filenames, while the
 *      stable set is large and uses Vite content-hashed names that
 *      change on every legitimate code edit.
 *   2. A forgotten mutable entry fails loudly (you add it); a forgotten
 *      stable entry is a silent drift regression — the unsafe failure
 *      mode for a drift detector.
 *
 * `checksums.txt` itself is excluded from the manifest (see
 * write-dist-checksums.mjs), so it does not need to appear here.  It is
 * listed for documentation completeness and to guard against it ever
 * being included in the walk.
 *
 * Paths are relative to `dist/` and use forward slashes.
 */
export const MUTABLE_PATHS = Object.freeze([
  "index.html",
  "404.html",
  "404/index.html",
  "addons.html",
  "addons/index.html",
  "blog.html",
  "blog/index.html",
  "contact.html",
  "contact/index.html",
  "music.html",
  "music/index.html",
  "resume/index.html",
  "sitemap.xml",
  "sitemap.html",
  "sitemap/index.html",
  "wow.html",
  "wow/index.html",
  // new pages - allowed as NEW until baseline is updated
  "pagerts.html",
  "pagerts/index.html",
  "projects.html",
  "projects/index.html",
  // Blog post content: posts (.md), attachments, and embedded documents
  // are authored content.  Publishing a new post or editing an existing
  // one is a legitimate content change, never STABLE-invariant drift,
  // so every artifact under these subtrees is mutable.  `stories/` holds
  // documents embedded into posts via blog.json.
  "blog/",
  "stories/",
  // Git-LFS artifact: CI checkouts that do not smudge LFS see the pointer
  // bytes, so its digest depends on the checkout environment — and the
  // archive itself legitimately changes.  Never a STABLE invariant.
  "dist.7z",
  // Self-referential sidecar: write-dist-checksums.mjs rewrites it on
  // every build (generatedAt, violation counts), so it changes each run.
  "documents/drift-report.json",
  "checksums.txt",
  "assets/*.js",
]);

export const MUTABLE_PATH_SET = Object.freeze(new Set(MUTABLE_PATHS));

/**
 * Returns true for artifacts that are allowed to change between
 * content-only refresh builds.
 * Supports prefix matching: paths starting with any pattern in MUTABLE_PATHS
 * are considered mutable (e.g. assets/index- matches assets/index-D4oX1XA7.js).
 */
export function isMutablePath(relPath) {
  if (MUTABLE_PATH_SET.has(relPath)) {
    return true;
  }
  // Check if path starts with any mutable prefix pattern
  for (const pattern of MUTABLE_PATHS) {
    if (relPath.startsWith(pattern)) {
      return true;
    }
    if (pattern.includes("*")) {
      const [prefix, suffix] = pattern.split("*");
      if (relPath.startsWith(prefix) && relPath.endsWith(suffix)) {
        return true;
      }
    }
  }
  return false;
}
