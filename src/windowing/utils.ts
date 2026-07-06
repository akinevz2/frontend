import type { SectionProps, SectionMetadata, ContentWithUUID } from "./types";

const createUUID = () => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `uuid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

function ensureValidLinkUrl(link: string, heading?: string): void {
  if (link.startsWith("/")) {
    return;
  }

  let parsed: URL;

  try {
    parsed = new URL(link);
  } catch {
    throw new Error(
      `Invalid section link URL${heading ? ` for '${heading}'` : ""}: '${link}'.`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Section link must use http/https or absolute local path${heading ? ` for '${heading}'` : ""}: '${link}'.`,
    );
  }
}

function validateSectionLinks(item: SectionProps): void {
  if (typeof item.link === "string") {
    ensureValidLinkUrl(item.link, item.heading);
  }

  if (!Array.isArray(item.content)) {
    return;
  }

  for (const subItem of item.content) {
    if (typeof subItem === "string") {
      continue;
    }

    validateSectionLinks(subItem);
  }
}

function validateContentLinks<T extends SectionProps>(content: T | T[]): void {
  if (Array.isArray(content)) {
    for (const item of content) {
      validateSectionLinks(item);
    }
    return;
  }

  validateSectionLinks(content);
}

/**
 * Generic function to recursively assign UUIDs to content items
 */
function assignUUIDs<T extends SectionProps>(
  item: T,
  depth: number = 0,
  metadata: Map<string, SectionMetadata> = new Map(),
): { result: ContentWithUUID<T>; metadata: Map<string, SectionMetadata> } {
  const uuid = createUUID();
  const heading = item.heading || "";

  // Store metadata
  if (heading) {
    metadata.set(uuid, { uuid, heading, depth });
  }

  // Handle content recursively
  let newContent: string | (string | ContentWithUUID<T>)[] | undefined;
  if (item.content) {
    if (typeof item.content === "string") {
      newContent = item.content;
    } else if (Array.isArray(item.content)) {
      const mapped = item.content.map((subItem: unknown) => {
        if (typeof subItem === "string") {
          return subItem;
        } else {
          const result = assignUUIDs(subItem as T, depth + 1, metadata);
          return result.result;
        }
      });
      newContent = mapped as (string | ContentWithUUID<T>)[];
    }
  }

  const resultWithUUID: ContentWithUUID<T> = {
    ...item,
    uuid,
    content: newContent,
    depth,
  } as ContentWithUUID<T>;

  return { result: resultWithUUID, metadata };
}

/**
 * Process an array or single content item
 */
export function processContent<T extends SectionProps>(
  content: T | T[],
): {
  processed: ContentWithUUID<T> | ContentWithUUID<T>[];
  metadata: SectionMetadata[];
} {
  validateContentLinks(content);

  const metadata = new Map<string, SectionMetadata>();

  if (Array.isArray(content)) {
    const processed = content.map((item) => {
      const result = assignUUIDs(item, 0, metadata);
      return result.result;
    });
    return { processed, metadata: Array.from(metadata.values()) };
  } else {
    const result = assignUUIDs(content, 0, metadata);
    return {
      processed: result.result,
      metadata: Array.from(result.metadata.values()),
    };
  }
}
