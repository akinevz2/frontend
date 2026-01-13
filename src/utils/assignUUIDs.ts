import { randomUUID } from 'node:crypto';
import type { SectionProps } from '../components/Section';
import type { AddonProps } from '../components/Addon';

export type SectionMetadata = {
  uuid: string;
  heading: string;
  depth: number;
};

export type SectionWithUUID = Omit<SectionProps, 'content'> & {
  uuid: string;
  content?: string | (string | SectionWithUUID)[];
};

export type AddonWithUUID = Omit<AddonProps, 'content'> & {
  uuid: string;
  content?: string | (string | AddonWithUUID)[];
};

export type PageMetadata = {
  sections: Map<string, SectionMetadata>;
};

/**
 * Recursively assigns UUIDs to all sections in a tree structure
 * Returns the modified structure and a metadata map
 */
export function assignUUIDsToSections(
  section: SectionProps,
  depth: number = 0,
  metadata: Map<string, SectionMetadata> = new Map()
): { section: SectionWithUUID; metadata: Map<string, SectionMetadata> } {
  const uuid = randomUUID();
  const heading = section.heading || '';

  // Store metadata
  if (heading) {
    metadata.set(uuid, { uuid, heading, depth });
  }

  // Handle content recursively
  let newContent: string | (string | SectionWithUUID)[] | undefined;
  if (section.content) {
    if (typeof section.content === 'string') {
      newContent = section.content;
    } else if (Array.isArray(section.content)) {
      newContent = section.content.map(item => {
        if (typeof item === 'string') {
          return item;
        } else {
          const result = assignUUIDsToSections(item, depth + 1, metadata);
          return result.section;
        }
      });
    }
  }

  const sectionWithUUID: SectionWithUUID = {
    ...section,
    uuid,
    content: newContent,
    depth
  };

  return { section: sectionWithUUID, metadata };
}

/**
 * Assigns UUIDs to addons (similar to sections but for addon props)
 */
export function assignUUIDsToAddons(
  addon: AddonProps,
  depth: number = 0,
  metadata: Map<string, SectionMetadata> = new Map()
): { addon: AddonWithUUID; metadata: Map<string, SectionMetadata> } {
  const uuid = randomUUID();
  const heading = addon.heading || '';

  // Store metadata
  if (heading) {
    metadata.set(uuid, { uuid, heading, depth });
  }

  // Handle content recursively
  let newContent: string | (string | AddonWithUUID)[] | undefined;
  if (addon.content) {
    if (typeof addon.content === 'string') {
      newContent = addon.content;
    } else if (Array.isArray(addon.content)) {
      const contentArray = addon.content as (string | AddonProps)[];
      newContent = contentArray.map((item) => {
        if (typeof item === 'string') {
          return item;
        } else {
          const result = assignUUIDsToAddons(item, depth + 1, metadata);
          return result.addon;
        }
      });
    }
  }

  const addonWithUUID: AddonWithUUID = {
    ...addon,
    uuid,
    content: newContent,
    depth
  };

  return { addon: addonWithUUID, metadata };
}

/**
 * Process an array or single section/addon
 */
export function processContent<T extends SectionProps | AddonProps>(
  content: T | T[],
  isAddon: boolean = false
): { processed: (SectionWithUUID | AddonWithUUID) | (SectionWithUUID | AddonWithUUID)[]; metadata: Map<string, SectionMetadata> } {
  const metadata = new Map<string, SectionMetadata>();

  if (Array.isArray(content)) {
    const processed = content.map(item => {
      if (isAddon) {
        const result = assignUUIDsToAddons(item as AddonProps, 0, metadata);
        return result.addon;
      } else {
        const result = assignUUIDsToSections(item as SectionProps, 0, metadata);
        return result.section;
      }
    });
    return { processed, metadata };
  } else {
    if (isAddon) {
      const result = assignUUIDsToAddons(content as AddonProps, 0, metadata);
      return { processed: result.addon, metadata: result.metadata };
    } else {
      const result = assignUUIDsToSections(content as SectionProps, 0, metadata);
      return { processed: result.section, metadata: result.metadata };
    }
  }
}
