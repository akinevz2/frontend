import { useEffect, useMemo, useCallback, useRef } from "react";
import type { Content, SectionMetadata } from "../windows/types.d.ts";

export interface UseUUIDLayerOptions {
  content: Content;
  pageMetadata?: SectionMetadata[];
  onUUIDsAssigned?: (metadata: SectionMetadata[]) => void;
}

export interface UUIDLayerContext {
  processedContent: Content;
  metadata: SectionMetadata[];
  generateUUID: () => string;
  processInMemory: (content: Content) => {
    processed: Content;
    metadata: SectionMetadata[];
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
  const metadataRef = useRef<SectionMetadata[]>(pageMetadata || []);

  const { processedContent, metadata } = useMemo(() => {
    const result = injectUUIDsIntoContent(content, metadataRef.current);
    metadataRef.current = result.metadata;
    return result;
  }, [content]);

  useEffect(() => {
    if (onUUIDsAssigned) {
      onUUIDsAssigned(metadataRef.current);
    }
  }, [metadata, onUUIDsAssigned]);

  const generateUUID = useCallback(() => {
    return crypto.randomUUID();
  }, []);

  const processInMemory = useCallback((content: Content) => {
    return injectUUIDsIntoContent(content);
  }, []);

  return {
    processedContent,
    metadata: metadataRef.current,
    generateUUID,
    processInMemory,
  };
}

/**
 * Centralized UUID injection - adds UUID and treeIndex to SectionProps objects
 */
export function injectUUIDsIntoContent(content: Content): {
  processed: Content;
  metadata: SectionMetadata[];
} {
  const metadata = new Map<string, SectionMetadata>();
  let processedContent = content;

  if (Array.isArray(content)) {
    processedContent = content.map((item) =>
      processContentItem(item, metadata),
    ) as Content;
  } else {
    processedContent = processContentItem(content, metadata) as Content;
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
  metadata: Map<string, SectionMetadata>,
): Content {
  // Strings pass through unchanged
  if (typeof item === "string") {
    return item as Content;
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
    return processedItem as Content;
  }

  // Other content types pass through unchanged
  return item as Content;
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
