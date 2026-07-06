import {
  asAssetPath,
  asInternalPath,
  asTrustedHttpsUrl,
} from "../lib/urlTypes";

const DEFAULT_BLOG_POSTS_PATH = "/blog/";
const DEFAULT_ALLOWED_HOSTS: string[] = [];

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
  const source = (configuredUrl || DEFAULT_BLOG_POSTS_PATH).trim();

  if (source.startsWith("/")) {
    return asInternalPath(source);
  }

  const allowedHosts = parseAllowedHosts(allowedHostsEnv);

  const trustedHost = asTrustedHttpsUrl(source, allowedHosts);
  const parsed = new URL(trustedHost);

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
    return DEFAULT_BLOG_POSTS_PATH;
  }
}

export function resolveTrustedBlogAssetUrl(
  assetPath: string,
  blogPostsHost: string,
): string {
  const normalizedAssetPath = asAssetPath(assetPath);

  if (blogPostsHost.startsWith("/")) {
    const internalBase = asInternalPath(blogPostsHost).replace(/\/?$/, "/");
    return `${internalBase}${normalizedAssetPath}`;
  }

  const trustedHost = asTrustedHttpsUrl(blogPostsHost);
  return new URL(normalizedAssetPath, trustedHost).toString();
}

export function getRuntimeBlogPostsHost(
  isDev: boolean,
  origin?: string,
): string {
  if (!origin) {
    return asInternalPath(DEFAULT_BLOG_POSTS_PATH);
  }

  if (isDev) {
    return new URL(asInternalPath(DEFAULT_BLOG_POSTS_PATH), origin).toString();
  }

  return new URL(asInternalPath(DEFAULT_BLOG_POSTS_PATH), origin).toString();
}
