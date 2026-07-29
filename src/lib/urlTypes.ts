type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type TrustedHttpsUrl = Brand<string, "TrustedHttpsUrl">;
export type InternalPath = Brand<string, "InternalPath">;

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
