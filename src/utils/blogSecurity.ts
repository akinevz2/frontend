const DEFAULT_BLOG_POSTS_URL =
  "https://raw.githubusercontent.com/akinevz2/frontend/refs/heads/blogging/";
const DEV_BLOG_POSTS_PATH = "/blog/";
const DEFAULT_ALLOWED_HOSTS = ["raw.githubusercontent.com"];

function parseAllowedHosts(allowedHostsEnv?: string): Set<string> {
  const configuredHosts = (allowedHostsEnv || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_HOSTS, ...configuredHosts]);
}

function normalizeHostPath(pathname: string): string {
  const withoutFilename = pathname.endsWith(".json")
    ? pathname.replace(/[^/]+$/, "")
    : pathname;

  return withoutFilename.endsWith("/")
    ? withoutFilename
    : `${withoutFilename}/`;
}

export function resolveTrustedBlogPostsHost(
  configuredUrl?: string,
  allowedHostsEnv?: string,
): string {
  const source = configuredUrl || DEFAULT_BLOG_POSTS_URL;
  const allowedHosts = parseAllowedHosts(allowedHostsEnv);

  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    throw new Error(`Invalid blog host URL: '${source}'.`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`Blog host must use https: '${source}'.`);
  }

  if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error(`Blog host '${parsed.hostname}' is not in the allowlist.`);
  }

  const normalizedPathname = normalizeHostPath(parsed.pathname);
  return new URL(normalizedPathname, parsed.origin).toString();
}

export function getSafeBlogPostsHost(
  configuredUrl?: string,
  allowedHostsEnv?: string,
): string {
  try {
    return resolveTrustedBlogPostsHost(configuredUrl, allowedHostsEnv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `Using default blog host due to unsafe configuration: ${message}`,
    );
    return DEFAULT_BLOG_POSTS_URL;
  }
}

export function resolveTrustedBlogAssetUrl(
  assetPath: string,
  blogPostsHost: string,
): string {
  if (/^https?:\/\//i.test(assetPath)) {
    throw new Error(
      `Absolute URLs are not allowed for blog assets: '${assetPath}'.`,
    );
  }

  const normalizedAssetPath = assetPath.replace(/^\/+/, "");
  return new URL(normalizedAssetPath, blogPostsHost).toString();
}

export function getRuntimeBlogPostsHost(
  isDev: boolean,
  origin?: string,
): string {
  if (isDev) {
    if (!origin) {
      return DEV_BLOG_POSTS_PATH;
    }

    return new URL(DEV_BLOG_POSTS_PATH, origin).toString();
  }

  // Production is intentionally pinned to raw GitHub user content CDN.
  return DEFAULT_BLOG_POSTS_URL;
}
