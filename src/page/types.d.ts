import type React from "react";
import { ClassName, Heading, LinkUrl } from "@/content/types";

/**
 * Core type - as specified in pages.json
 */
export interface PageConfig {
  content?: string;
  page: string;
  path: string;
  meta?: PageMeta;
  title: string;
  menuLabel?: string | undefined | null;
  description: string;
};

export type PageProps = {
  declaration: PageConfig;
  params: Record<string, string>
}

export type PageComponent = React.FC<PageProps>;

export interface PageImplementationModule {
  dynamicRoutes?: PageConfig[];
  [key: string]: PageComponent | PageConfig[] | undefined
}

