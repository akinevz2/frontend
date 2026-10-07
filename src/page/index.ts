import type { PageConfig } from "./types";

/**
 * BasePage - Pure Mapper for Dynamic Page Routing
 *
 * This is a placeholder page that will be used by the router
 * to render appropriate page components based on the current route
 */
export { PurePage as Page } from "./components/PurePage";
export { type PageComponent, type PageConfig } from "./types";
export { staticPages as pages } from "./hooks"
export { PageContext, PageProvider, usePageContext } from "./PageContext";

export type Pages = PageConfig[];