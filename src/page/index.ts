import type { PageConfig, PageProps } from "./types";
import staticPages from "@/content/pages.json";

/**
 * BasePage - Pure Mapper for Dynamic Page Routing
 *
 * This is a placeholder page that will be used by the router
 * to render appropriate page components based on the current route
 */
export type Pages = PageConfig[];
export const pages: Pages = staticPages;
export type Page = PageConfig;
export type PageType = Page["page"];
export const PAGE_TYPE_VALUES: PageType[] = staticPages.map((p) => p.page);

export type PagesByPath = Record<PageType, PageConfig>;

export const pagesByPath: PagesByPath = Object.fromEntries(
  pages.map((p) => [p.path, p]),
);
function requirePage(path: string): PageConfig {
  const page = pagesByPath[path];
  if (!page) throw new Error(`required page not found in menu.json: ${path}`);
  return page;
}
export const homePage = requirePage("/");
export const page404 = requirePage("/404");

export function isPageType(key: string): key is PageType {
  return (PAGE_TYPE_VALUES as string[]).includes(key);
}
export interface PageModule {
  extraRoutes?: PageConfig[];
  [key: string]: React.ComponentType<PageProps> | PageConfig[] | undefined;
}

export { type PageComponent, type PageConfig } from "./types";
export { usePageContext } from "./components/PageContext";
export { PageProvider } from "./components/PageProvider";
export { usePageRegistry } from "./components/PageSpace";
export { validatePages } from "./validate";

export { usePage } from "./hooks";
