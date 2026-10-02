import { createContext, useContext, useEffect, useState } from "react";
import type { Page, PageComponent, PageContextValue } from "../types";
import pagesJson from "../pages/pages.json";

// This is the router definition that will load structure from @src/pages/pages.json
// and create a route for each Page definition
export const PageContext = createContext<PageContextValue | undefined>(undefined);

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
export function PageProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<Page[]>([]);
  
  useEffect(() => {
    // Load pages from JSON configuration and resolve components
    const loadedPages: Page[] = pagesJson.map((pageConfig) => {
      // Dynamically import page component based on config
      // This will be adapted to work with the new system
      let component: PageComponent;
      
      try {
        // Try to require the component - this assumes pages are in implementations/
        const componentImport = require(`../pages/implementations/${pageConfig.page}Page.tsx`);
        component = componentImport.default || componentImport;
      } catch (error) {
        console.warn(`Could not load component for page ${pageConfig.page}:`, error);
        // If the component doesn't exist, return a fallback or throw an error
        // For now, let's use the original NotFoundPage component - we can check if it exists later
        const fallbackComponent: PageComponent = () => <div>Page not found</div>;
        component = fallbackComponent;
      }
      
      return {
        ...pageConfig,
        component,
      } as Page;
    });
    
    setPages(loadedPages);
  }, []);

  const usePages = () => {
    return pages;
  };

  const usePage = (path: string) => {
    // Find page by path and return the component
    const page = pages.find(page => page.path === path);
    if (!page) {
      // Return a default/fallback component when page is not found
      const fallbackComponent: PageComponent = () => <div>Page not found</div>;
      return fallbackComponent;
    }
    return page.component;
  };

  return (
    <PageContext.Provider value={{ pages, usePages, usePage }}>
      {children}
    </PageContext.Provider>
  );
}

export type PageContextType = {
  pages: Page[];
  usePages: () => Page[];
  usePage: (path: string) => PageComponent;
};