/** Include-path validation (pure — the shared rules of the include
 * mechanism, docs/LEARNING_PLAN.md §4).
 *
 * An include names a PUBLIC-rooted path: leading `/`, `.json` or `.md`
 * extension, no `..`, no globs, no directory targets, case-sensitive.
 * The disk-side guarantees (the path really resolves inside `public/`,
 * no symlink escape) belong to the `read` backend — the prerender and
 * the target plugin only ever read below the real public root, so a
 * hostile path cannot escape. */

const PATH_RE = /^\/[a-z0-9][a-z0-9._/-]*\.(json|md)$/i;

/** Validates an include directive's path, or throws with the message the
 * renderer would otherwise paper over. Returns the path unchanged. */
export function validateIncludePath(name: string): string {
  if (
    typeof name !== "string" ||
    !name.startsWith("/") ||
    name.includes("..") ||
    !PATH_RE.test(name)
  ) {
    throw new Error(
      `Unknown include directive: ${String(name)} ` +
        "(targets are public paths under public/, .json or .md)",
    );
  }
  return name;
}
