import type { ReactNode } from "react";

export type Heading = string;
export type HttpUrl = `http://${string}` | `https://${string}`;
export type LinkUrl = HttpUrl | `/${string}`;

export type Content =
  | string
  | SectionProps
  | ReactNode
  | (string | React.ReactNode | SectionProps)[];
// export type Content = string | ReactNode | Element | SectionProps[];

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
};

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
