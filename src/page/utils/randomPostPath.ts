/**
 * Extracts the random post path from a pathname if it matches the pattern /blog/random/{slug}.md
 * @param pathname - The full pathname to check
 * @returns The extracted path (e.g., "/blog/random/{slug}.md") or null if no match
 */
export function randomPostPath(pathname: string): string | null {
  const RANDOM_POST_PATH = /^\/blog\/random\/([A-Za-z0-9._-]+)\.md$/;
  const match = pathname.match(RANDOM_POST_PATH);
  return match ? `/blog/random/${match[1]}.md` : null;
}
