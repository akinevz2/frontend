import type { ReactNode } from "react";

export type Heading = string;
export type HttpUrl = `http://${string}` | `https://${string}`;
export type LinkUrl = HttpUrl | `/${string}`;

export type Content =
  | string
  | SectionProps
  | ReactNode
  | (string | SectionProps | ReactNode)[];
// export type Content = string | ReactNode | Element | SectionProps[];

export type AddonsPropsMixing = {

  // --- Addon extension fields ---
  // `status` renders an italic status line (e.g. "available") in the body.
  status?: string | undefined;
  // `text` renders a "Copy to Clipboard" button for the given content.
  text?: string | undefined;
  // `externalLink` opens the link in a new tab (used by addons) instead of
  // performing in-app navigation.
  externalLink?: boolean | undefined;
}
export type SectionProps = {
  className?: string;
  heading?: Heading;
  content?: Content;
  link?: LinkUrl;
  printout?: string | string[];
  theme?: string;
  depth?: number;
  uuid?: string;
  treeIndex?: string;
} & AddonsPropsMixing;

export type SectionMetadata = {
  uuid: string;
  heading: string;
  depth: number;
};

/**
 * NB: Ephemeral per page visit
 */
export type ContentWithUUID<T> = Omit<T, "content"> & {
  uuid: string;
  treeIndex: string;
  content?: string | (string | ContentWithUUID<T>)[];
};

export type PageMetadata = {
  sections: SectionMetadata[];
};
