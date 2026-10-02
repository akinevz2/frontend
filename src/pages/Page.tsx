import { BasePage } from "./BasePage";
import pages from "./pages.json";

/**
 * Page Registry - Type definitions
 * Registry-based system for dynamic page component lookup
 */

/**
 * PageComponent - A React component that renders page content
 */
export type PageComponent = React.ComponentType;

/**
 * Custom hook for loading and providing page configuration from pages.json
 * Returns PageComponent array based exclusively on pages.json fields
 * This hook is now in pages/Page.tsx as required by refactoring
 */
export function usePages(): PageComponent[] {
    return pages.map((page) => {
        return otherwise(BasePage, usePage(page.page));
    });
}

function otherwise<T>(fallback: T, value: PageComponent): PageComponent {
    return value as PageComponent ?? fallback;
}

/**
 * Custom hook to find a PageComponent by path
 * Works with PageRepository from PageContext
 */
export function usePage(path: string): PageComponent {
    const pages = usePages();
    const page = pages.find((component: PageComponent) => {
        return component?.toString().includes(path);
    });
    if (page) {
        return page;
    }
    throw new Error(`No page implementation for path: ${path}`);
}
