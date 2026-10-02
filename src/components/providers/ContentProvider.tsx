/**
 * ContentProvider.tsx - Legacy file
 * This file is deprecated and should be removed.
 * PageContext.tsx now provides all the functionality needed.
 *
 * Key changes:
 * - useRouting() removed - using useLocation from react-router-dom instead
 * - PageContext provides both Page and content in one context
 * - No need for separate ContentProvider when using PageProvider
 */

import React, { createContext } from "react";

// These types are kept for compatibility but not actively used
// @deprecated Use PageContent from PageContext.tsx instead
export type SectionNode = {
  uuid: string;
  content: any;
  type: string;
  [key: string]: any;
};

// @deprecated Use PageContent from PageContext.tsx instead
export interface PageContentMap {
  uuid: string;
  heading?: string;
  content?: SectionNode[];
  [key: string]: any;
}

// @deprecated Use PageContent from PageContext.tsx instead
export function mapPageContentToReact(_content: any): PageContentMap {
  // TODO: Implement actual content tree transformation
  throw new Error("mapPageContentToReact not implemented");
}

// @deprecated Use PageContext instead
export interface PageContent {
  data: any;
  structure: string;
  metadata?: {
    path: string;
    title: string;
    description: string;
  };
}

const PageContentContext = createContext<PageContent | null>(null);

// @deprecated Use PageContext from PageContext.tsx instead
export function ContentProvider({ children }: { children: React.ReactNode }) {
  return (
    <PageContentContext.Provider value={null}>
      {children}
    </PageContentContext.Provider>
  );
}

// @deprecated Use usePageContext from PageContext.tsx instead
export function usePageContent() {
  throw new Error("usePageContent is deprecated. Use usePageContext instead.");
}

// Export types for compatibility
export type { PageContent as DeprecatedPageContent };
export { PageContentContext };