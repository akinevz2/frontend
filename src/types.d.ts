import type { ReactNode } from "react";

export type Heading = string;
export type ClassName = string;
export type HttpUrl = `http://${string}` | `https://${string}`;
export type LinkUrl = HttpUrl | `/${string}`;

// Providers supported by `MusicTrack`. The track's source is either declared
// explicitly via `source` or inferred from its `url` host.
export type MusicSource = "soundcloud" | "spotify";

// A `MusicTrack` is a small data object (not a SectionProps) that can appear
// as a nested item inside any Section's `content` array. The Section renderer
// recognises it by the absence of SectionProps discriminator fields and
// renders it as a windowed `MusicTrackSection`.
export type MusicContent = {
  owner?: string;
  path: string;
  title: string;
  url: string;
  source?: MusicSource;
} & Section;

export type Content =
  | string
  | Section
  | MusicContent
  | AddonContent
  | (Content)[];

export type AddonContent = {
  // --- Addon extension fields ---
  // `status` renders an italic status line (e.g. "available") in the body.
  status: string | undefined;
  // `text` renders a "Copy to Clipboard" button for the given content.
  text: string | undefined;
  // `externalLink` opens the link in a new tab (used by addons) instead of
  // performing in-app navigation.
  externalLink: boolean | undefined;
} & Section;

export type Section = {
  className?: ClassName;
  heading?: Heading;
  content?: Section | Section[];
  link?: LinkUrl;
  printout?: string | string[];
  theme?: string | string[];
};

export type ContentMetadata = {
  uuid: string;
  depth: number;
  treeIndex: string;
};

export interface SectionState {
  expandedSections: Set<string>;
  minimizedSections: Map<string, string>;
  maximizedWindows: Set<string>;
}

export type PageMetadata = {
  expandedSections: Set<string>;
  minimizedSections: Set<string>;
  maximizedWindows: Set<string>; // Set of UUIDs for currently maximized windows
};

export type PageContent = Content & ContentMetadata;

// Added interfaces as requested:
export interface PageContextValue {
  pages: Page[];
  usePages: () => Page[];
  usePage: (path: string) => PageComponent;
}

export interface PageMap {
  [path: string]: Page;
}

export interface SiteMap {
  pageMap: PageMap;
  // Add other site map properties as needed
}

export type Page = {
  path: string;
  menuLabel: string | null;
  title: string;
  description: string;
  component: PageComponent;
  structure: string;
};

export type PageComponent = React.FC<{ pageMetadata?: PageMetadata }>;
