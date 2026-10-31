/** Path-slash trimming without regex backtracking scans (Sonar S8786).
 *  A trailing run of one character is O(1) per position but the regex
 *  matcher re-tries every start position on failure — O(n²) on long
 *  paths. These string walks are strictly linear. */

/** Strip trailing slashes ("​/blog/" → "/blog", "/" stays "/"). */
export function stripTrailingSlashes(path: string): string {
  let end = path.length;
  while (end > 1 && path[end - 1] === "/") end--;
  return end === path.length ? path : path.slice(0, end);
}

/** Trim slashes on both ends ("/blog//" → "/blog"). */
export function stripEdgeSlashes(path: string): string {
  let start = 0;
  let end = path.length;
  while (start < end && path[start] === "/") start++;
  while (end > start && path[end - 1] === "/") end--;
  return end - start === path.length ? path : path.slice(start, end);
}
