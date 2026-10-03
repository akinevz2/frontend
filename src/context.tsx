import { createContext } from "react";
import type { PageContext, PageMetadata, SiteMap } from "./types";

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

export interface ErrorState {
  error: Error | null;
}

export interface ErrorContextValue {
  error: Error | null;
  setError: (error: Error | null) => void;
}

export const ErrorAction = ErrorAction;

export const ErrorState = ErrorState;

export const ErrorContextValue = ErrorContextValue;

export const PageSectionContext = createContext<
  PageSectionContextValue | undefined
>(undefined);

// Export additional contexts as requested
export interface PageContextType extends PageContext {
  // Additional page context properties can be added here
}

export interface SiteMapContextType {
  siteMap: SiteMap;
}

export const SiteMapContext = createContext<SiteMapContextType | undefined>(
  undefined,
);

export const ErrorContext = createContext<ErrorContextValue | undefined>(
  undefined,
);
