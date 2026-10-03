import type { PageDefinition } from "../data/pageLoader";
import type { PageComponent } from "../types";

export function usePages(): PageComponent[] {
  const pagesData = loadPagesJson();
  return pagesData.map((page: PageDefinition) => {
    return otherwise(BasePage, usePage(page.page));
  });
}

function otherwise<T>(fallback: T, value: PageComponent): PageComponent {
  return (value as PageComponent) ?? fallback;
}

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

export { BasePage } from "../pages/BasePage";
