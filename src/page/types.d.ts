import type React from "react";

/**
 * Core type - as specified in pages.json
 */
export interface Page {
  content?: string;
  page: string;
  path: string;
  meta?: PageMeta;
  title: string;
  menuLabel?: string | undefined | null;
  description: string;
};

export type PageProps = {
  declaration: Page;
  params: Record<string, string>
}

export type PageComponent = React.FC<PageProps>;

export interface PageImplementationModule {
  dynamicRoutes?: Page[];
  [key: string]: PageComponent | Page[] | undefined
}

export type TextContent<T> = {
  className: ClassName | undefined;
  heading: Heading | undefined;
  content: Content<T> | undefined;
  link: LinkUrl | undefined;
  printout: LinkUrl | undefined;
  // TODO: implement theme handling concretely. low prio
  theme: string | string[] | undefined;
} & T;

export type MusicContent<T> = {
  owner?: string;
  path: string;
  title: string;
  url: string;
  source?: MusicSource;
} & TextContent<T>;

export type AddonContent<T> = {
  // --- Addon extension fields ---
  // `status` renders an italic status line (e.g. "available") in the body.
  status: string | undefined;
  // `text` renders a "Copy to Clipboard" button for the given content.
  text: string | undefined;
  // `externalLink` opens the link in a new tab (used by addons) instead of
  // performing in-app navigation.
  externalLink: boolean | undefined;
} & TextContent<T>;

type Content<T> = TextContent<T> | MusicContent<T> | AddonContent<T> | ReactNode;

export type SectionContent = Content<{}>

export type SectionContentMetadata = {
  uuid: string;
  depth: number;
  treeIndex: string;
};

export type WithMetadata = {
  metadata: SectionContentMetadata;
};

export type PageContent = Content<WithMetadata>;
