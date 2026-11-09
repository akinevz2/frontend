import type { ReactElement } from "react";

export type ThemeName = "experimental" | "centered" | "open" | "funny";

/** A music/video link rendered as an embedded player (or a plain link). */
export type Embed = {
  title: string;
  url: string;
  backgroundImage?: string;
  provider?: "soundcloud";
};

/**
 * A content-file include directive: `{"include": "<path>"}` expands, at
 * load time (src/content/index.ts), into the referenced Section as a
 * nested child — JSON cannot import, so this is the "include" mechanism
 * for reusing a section across pages.
 * <path> is the PUBLIC path of the target (leading slash, extension
 * included): a `.json` holding a Section, or an author-written `.md`
 * file wrapped as one. Targets live at the public root (*.json) or
 * public/blog/releases/ (*.md) — the include walk there is the
 * registration (build/includesPlugin.ts).
 */
export type IncludeRef = { include: string };

/** A clickable image tile with caption lines (artist profile headers). */
export type Banner = {
  banner: { image: string; href: string; lines: string[] };
};

export type Item =
  string | Section | Embed | Banner | IncludeRef | ReactElement;

/** A window as written in the JSON content files. */
export type Section = {
  heading?: string;
  content?: string | Item[] | Section;
  link?: string;
  theme?: ThemeName | ThemeName[];
  embed?: string;
  /** Stable permalink anchor; defaults to the numeric tree index ("0"). */
  anchor?: string;
  status?: string;
  /** Text copied by the addon "Copy" button. */
  text?: string;
  externalLink?: boolean;
  className?: string;
};

/** A document in src/content/projects/; every project becomes its own route. */
export type Project = {
  slug: string;
  /** Defaults to /projects/<slug>. */
  path?: string;
  title: string;
  description: string;
  github: string;
  /** ISO date (YYYY-MM-DD) the page's content was last updated — the
   * projects listing sorts on it, most recently updated first. */
  lastModified?: string;
  content: Section;
};

export type MenuVisibility = false | "onlyHere" | "admin";

/** An entry of pages.json. `hidden` also removes it from the sitemap. */
export type Route = {
  path: string;
  title: string;
  description: string;
  page: string;
  menuLabel?: string;
  menu?: MenuVisibility;
  hidden?: boolean;
  /** Redirect: visiting `path` immediately navigates to this path+hash. */
  alias?: string;
  /** Menu bar links here instead of `path` (e.g. an in-page section anchor). */
  menuHref?: string;
};

export type SoundCloudTrack = {
  owner: string;
  path: string;
  title: string;
  url: string;
};

export type SoundCloudData = {
  source: string;
  generatedAt: string;
  asOfUploadingTrackCount?: number;
  trackCount: number;
  tracks: SoundCloudTrack[];
  profiles?: unknown;
};
