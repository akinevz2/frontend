import { createContext, useContext } from "react";
import type { Pages, Page } from "..";
import { type PageRegistry, createPageRegistry } from "./PageRegistry";

export type PageContext = {
  pages: Pages;
  PageRegistry: PageRegistry;
  registerPages: (additionalPages: readonly Page[]) => void;
};

export const PageContext = createContext<PageContext>({
  pages: [],
  registerPages: () => undefined,
  PageRegistry: createPageRegistry(),
});

/**
 * Hook to access page context functionality
 */
export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used within a PageProvider");
  }
  return context;
}
