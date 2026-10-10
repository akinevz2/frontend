import type React from "react";

/**
 * Core type - as specified in pages.json
 */
export type PageType = string;
export interface PageMeta {
  [key: string]: unknown;
}
export interface PageConfig {
  content?: string;
  page: PageType;
  path: string;
  meta?: PageMeta;
  title: string;
  menuLabel?: string | undefined | null;
  description: string;
}

export type PageProps = {
  current: PageConfig;
};

export type PageComponent = React.FC<PageProps>;

export interface PageImplementationModule {
  dynamicRoutes?: PageConfig[];
  [key: string]: PageComponent | PageConfig[] | undefined;
}
