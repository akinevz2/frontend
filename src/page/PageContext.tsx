import { createContext, use, useContext, useState } from "react";
import type { Pages } from ".";

// This is the router definition that will load structure from @src/pages/pages.json
// and create a route for each Page definition
type PageContext = {
  pages: Pages;
  usePages?: () => PageContext;
  setPages?: (pages: Pages) => void;
};
export const PageContext = createContext<PageContext>({
  pages: [],
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

/**
 * Provider component that makes page data available throughout the app
 */
export function PageProvider({ pages: given, children }: { pages: Pages, children: React.ReactNode }) {
  const [pages, setPages] = useState<Pages>(given);
  const usePages = () => use(PageContext);
  return (
    <PageContext.Provider value={{ pages, usePages, setPages }}>
      {children}
    </PageContext.Provider>
  );
}
