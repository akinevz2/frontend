import type { PageConfig, PageComponent } from "./types";
import type { PageType } from "./index";

export function validatePages(
  pages: readonly PageConfig[],
  pageRegistry: Record<PageType, PageComponent>,
): void {
  const registeredPages = new Set<PageType>(Object.keys(pageRegistry));

  for (const page of pages) {
    if (!registeredPages.has(page.page)) {
      throw new Error(
        `page implementation not found for ${page.path}: ${page.page}`,
      );
    }

    // if (page.content !== undefined &&
    //     randomPostPath(page.content) === null &&
    //     !hasContentFile(page.content)) {
    //     throw new Error(`page content file not found for ${page.path}: ${page.content}`);
    // }

    if (page.page === "BasePage" && page.content === undefined) {
      throw new Error(`BasePage requires content for ${page.path}`);
    }
  }
}

export function validatePageConfig(page: PageConfig): void {
  if (!page.path.startsWith("/")) {
    throw new Error(`invalid page path: ${page.path}`);
  }
  if (!page.page) {
    throw new Error(`missing page implementation for ${page.path}`);
  }
}
