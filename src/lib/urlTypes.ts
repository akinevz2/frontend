type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type TrustedHttpsUrl = Brand<string, "TrustedHttpsUrl">;
export type InternalPath = Brand<string, "InternalPath">;
export type AssetPath = Brand<string, "AssetPath">;

export function asTrustedHttpsUrl(
  value: string,
  allowedHosts?: Iterable<string>,
): TrustedHttpsUrl {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid URL: '${value}'.`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`URL must use https: '${value}'.`);
  }

  if (allowedHosts) {
    const allowed = new Set(
      Array.from(allowedHosts, (host) => host.toLowerCase()),
    );
    if (!allowed.has(parsed.hostname.toLowerCase())) {
      throw new Error(`URL host '${parsed.hostname}' is not in the allowlist.`);
    }
  }

  return parsed.toString() as TrustedHttpsUrl;
}

export function asInternalPath(value: string): InternalPath {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error(`Internal path must start with '/': '${value}'.`);
  }

  if (trimmed.startsWith("//")) {
    throw new Error(`Internal path cannot start with '//': '${value}'.`);
  }

  return trimmed as InternalPath;
}

export function asAssetPath(value: string): AssetPath {
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    throw new Error(`Asset path must be relative and non-empty: '${value}'.`);
  }

  if (trimmed.includes("..")) {
    throw new Error(`Asset path cannot contain '..': '${value}'.`);
  }

  const normalized = trimmed.replace(/^\/+/, "");
  if (!normalized) {
    throw new Error(`Asset path cannot be root-only: '${value}'.`);
  }

  return normalized as AssetPath;
}
