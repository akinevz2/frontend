/**
 * Canonicalization helper for the drift gate in write-dist-checksums.mjs.
 *
 * Vite rewrites every built HTML entry point to point at content-hashed
 * bundle filenames (e.g. `/assets/index-D4oX1XA7.js`).  When any bundle's
 * content hash changes, EVERY entry page changes bytes at build time even
 * when its authored content is identical, so a raw SHA-256 comparison
 * between deployments reports false drift on all rebuilt pages.
 *
 * `canonicalizeAssetRefs` strips Vite's 8-character content hash from
 * `/assets/<name>-<hash>.<ext>` references (script `src`, modulepreload
 * `href`, stylesheet `href`, ...) so two builds that differ only in Vite's
 * injected hashes canonicalize to identical text and share one digest.
 * Authored page edits still change the canonical text, so real content
 * drift keeps failing loudly.
 *
 * The canonicalization is applied to built HTML for the drift report only;
 * `checksums.txt` itself keeps raw-byte digests so it remains a verifiable
 * attestation of the served artifact (see doc/IMMUTABLE_DEPLOYS_BLUEPRINT.md).
 */

/**
 * Vite's default build asset hash: 8 characters from [A-Za-z0-9_-].
 * Only JS/MJS/CSS asset references under /assets/ are normalized — other
 * references (pages, documents, blog posts) keep their real filenames.
 */
const VITE_HASHED_ASSET_RE =
  /\/assets\/([\w@./-]+?)-[A-Za-z0-9_-]{8}\.(js|mjs|css)(?=[?"'\s<>)])/g;

export function canonicalizeAssetRefs(text) {
  return text.replace(VITE_HASHED_ASSET_RE, "/assets/$1.$2");
}

/** Built artifacts whose drift comparison should canonicalize asset refs. */
export function isCanonicalizablePath(relPath) {
  return relPath.endsWith(".html");
}
