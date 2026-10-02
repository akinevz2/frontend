import { createContext } from "react";
import type { PageMetadata, PageContextValue, SiteMap } from "./types";

export interface PageSectionContextValue {
  expandedSections: Set<string>;
  markAsExpanded: (heading: string) => void;
  minimizedSections: Map<string, string>;
  minimizeSection: (uuid: string, heading: string) => void;
  restoreSection: (uuid: string) => void;
  pageMetadata: PageMetadata;
  maximizedWindows: Set<string>;
  registerMaximizedWindow: (uuid: string) => void;
  unregisterMaximizedWindow: (uuid: string) => void;
  isAddonPage: boolean;
}

export const PageSectionContext = createContext<PageSectionContextValue | undefined>(
  undefined,
);

// Export additional contexts as requested
export interface PageContextType extends PageContextValue {
  // Additional page context properties can be added here
}

export const PageContext = createContext<PageContextType | undefined>(
  undefined,
);

export interface SiteMapContextType {
  siteMap: SiteMap;
}

export const SiteMapContext = createContext<SiteMapContextType | undefined>(
  undefined,
);