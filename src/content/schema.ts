export type ThemeName = "experimental" | "centered" | "open";

/** A music/video link rendered as an embedded player (or a plain link). */
export type Embed = {
  title: string;
  url: string;
  backgroundImage?: string;
  provider?: "soundcloud";
};

/** A clickable image tile with caption lines (artist profile headers). */
export type Banner = {
  banner: { image: string; href: string; lines: string[] };
};

export type Item = string | Section | Embed | Banner;

/** A window as written in the JSON content files. */
export type Section = {
  heading?: string;
  content?: string | Item[] | Section;
  link?: string;
  theme?: ThemeName | ThemeName[];
  printout?: string;
  status?: string;
  /** Text copied by the addon "Copy" button. */
  text?: string;
  externalLink?: boolean;
  className?: string;
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
