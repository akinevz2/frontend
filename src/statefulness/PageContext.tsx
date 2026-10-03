import { createContext, useContext, useEffect, useState } from "react";
import type { Page, PageComponent } from "../";
import pagesJson from "../pages/pages.json";

// This is the router definition that will load structure from @src/pages/pages.json
// and create a route for each Page definition
type PageContext = {
  pages: Page[];
  usePages: () => Page[];
  usePage: (path: string) => PageComponent;
};
export const PageContext = createContext<PageContext | undefined>(undefined);

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

  // FIXME: This effect should be replaced with a more robust page loading mechanism
  // REMOVE the useEffect, it is not necessary!!!!
  // useEffect(() => {
  //   // Load pages from JSON configuration and resolve components
  //   const loadedPages: Page[] = pagesJson.map((pageConfig) => {
  //     // Dynamically import page component based on config
  //     // This will be adapted to work with the new system
  //     let component: PageComponent;

  //     try {
  //       // Try to require the component - this assumes pages are in implementations/
  //       const componentImport = require(`../pages/implementations/${pageConfig.page}Page.tsx`);
  //       component = componentImport.default || componentImport;
  //     } catch (error) {
  //       console.warn(`Could not load component for page ${pageConfig.page}:`, error);
  //       // If the component doesn't exist, return a fallback or throw an error
  //       // For now, let's use the original NotFoundPage component - we can check if it exists later
  //     }

  //     return {
  //       ...pageConfig,
  //       structure: component,
  //     } as Page;
  //   });

  //   setPages(loadedPages);
  // }, []);

  const usePages = () => {
    return pages;
  };

  const usePage = (path: string) => {
    // Find page by path and return the component
    const page = pages.find((page) => page.path === path);
    return page?.content;
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
