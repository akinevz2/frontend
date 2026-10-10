import type { PageComponent, PageType } from "../types";

export interface PageRegistryMethods {
  register(type: PageType, component: PageComponent): void;
  get(type: PageType): PageComponent | undefined;
  has(type: PageType): boolean;
  keys(): PageType[];
  values(): PageComponent[];
  clear(): void;
  asObject(): Record<PageType, PageComponent>;
  size(): number;
}

export interface PageRegistry {
  register(type: PageType, component: PageComponent): void;
  get(type: PageType): PageComponent | undefined;
  has(type: PageType): boolean;
  keys(): PageType[];
  values(): PageComponent[];
  clear(): void;
  asObject(): Record<PageType, PageComponent>;
  size(): number;
}

/**
 * PageRegistry manages and provides access to all registered page components
 */
export function createPageRegistry(config?: {
  pages?: Record<PageType, PageComponent>;
}): PageRegistry {
  const pages: Map<PageType, PageComponent> = new Map();

  if (config?.pages) {
    Object.entries(config.pages).forEach(([type, component]) => {
      pages.set(type as PageType, component);
    });
  }

  return {
    register(type: PageType, component: PageComponent): void {
      pages.set(type, component);
    },
    get(type: PageType): PageComponent | undefined {
      return pages.get(type);
    },
    has(type: PageType): boolean {
      return pages.has(type);
    },
    keys(): PageType[] {
      return Array.from(pages.keys());
    },
    values(): PageComponent[] {
      return Array.from(pages.values());
    },
    clear(): void {
      pages.clear();
    },
    asObject(): Record<PageType, PageComponent> {
      return Object.fromEntries(pages.entries());
    },
    size(): number {
      return pages.size;
    },
  };
}
