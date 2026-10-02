import { useEffect, useMemo } from "react";
import type { SectionContent, ContentMetadata } from "../../types";

export interface UseUUIDLayerOptions {
  content: SectionContent;
  pageMetadata?: ContentMetadata[];
  onUUIDsAssigned?: (metadata: ContentMetadata[]) => void;
}

export interface UUIDLayerContext {
  processedContent: SectionContent;
  metadata: ContentMetadata[];
  generateUUID: () => string;
  processInMemory: (content: SectionContent) => {
    processed: SectionContent;
    metadata: ContentMetadata[];
  };
}

/**
 * Provider-style declarative UUID layer - centralizing UUID injection
 */
export function UUIDLayerProvider({
  content,
  pageMetadata,
  onUUIDsAssigned,
}: UseUUIDLayerOptions) {
  const metadata = useMemo(() => {
    return injectUUIDsIntoContent(content).metadata;
  }, [content]);

  const { processedContent } = injectUUIDsIntoContent(content);

  useEffect(() => {
    if (onUUIDsAssigned) {
      onUUIDsAssigned(metadata);
    }
  }, [metadata, onUUIDsAssigned]);

  return {
    processedContent,
    metadata,
    generateUUID: () => crypto.randomUUID(),
    processInMemory: (content: SectionContent) =>
      injectUUIDsIntoContent(content),
  };
}

/**
 * Centralized UUID injection - adds UUID and treeIndex to SectionProps objects
 */
export function injectUUIDsIntoContent(content: SectionContent): {
  processed: SectionContent;
  metadata: ContentMetadata[];
} {
  const metadata = new Map<string, ContentMetadata>();
  let processedContent = content;

  if (Array.isArray(content)) {
    processedContent = content.map((item) =>
      processContentItem(item, metadata),
    ) as SectionContent;
  } else {
    processedContent = processContentItem(content, metadata) as SectionContent;
  }

  return {
    processed: processedContent,
    metadata: Array.from(metadata.values()),
  };
}

/**
 * Process content items that are SectionProps, injecting UUIDs
 */
function processContentItem(
  item: unknown,
  metadata: Map<string, ContentMetadata>,
): SectionContent {
  // Strings pass through unchanged
  if (typeof item === "string") {
    return item as SectionContent;
  }

  // Only SectionProps get UUID injection
  if (
    item &&
    typeof item === "object" &&
    !Array.isArray(item) &&
    "heading" in item
  ) {
    const sectionItem = item as SectionProps;
    const uuid = generateUUID();
    const treeIndex = generateTreeIndex();

    metadata.set(uuid, { uuid, heading: sectionItem.heading || "", depth: 0 });

    const processedItem = { ...sectionItem, uuid, treeIndex };
    return processedItem as SectionContent;
  }

  // Other content types pass through unchanged
  return item as SectionContent;
}

/**
 * Generate secure UUID using Web Crypto API
 */
function generateUUID(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  throw new Error("Secure UUID generation unavailable");
}

/**
 * Generate treeIndex for stable permalink anchoring
 */
function generateTreeIndex(): string {
  return crypto.randomUUID().substring(0, 9);
}

export const useUUIDLayer = (options: UseUUIDLayerOptions) => {
  return UUIDLayerProvider(options);
};
