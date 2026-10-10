export function resolveTrustedBlogPostsHost(configuredUrl?: string): string {
  const DEFAULT_BLOG_POSTS_PATH = "/blog/";
  const source = (configuredUrl || DEFAULT_BLOG_POSTS_PATH).trim();

  if (source.startsWith("/")) {
    throw new Error("unimplemented");
  }

  throw new Error("unimplemented");
}

export function getSafeBlogPostsHost(configuredUrl?: string): string {
  try {
    return resolveTrustedBlogPostsHost(configuredUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `Using default blog host due to unsafe configuration: ${message}`,
    );
    return "/blog/";
  }
}

export function resolveTrustedBlogAssetUrl(): string {
  throw new Error("unimplemented");
}

export function getRuntimeBlogPostsHost(): string {
  throw new Error("unimplemented");
}
