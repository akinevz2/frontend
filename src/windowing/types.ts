import type React from "react";

export type Heading = string;
export type HttpUrl = `http://${string}` | `https://${string}`;
export type LinkUrl = HttpUrl | `/${string}`;

export type Content = string | (string | SectionProps)[];

export type SectionProps = {
  className?: string | undefined;
  heading?: Heading | undefined;
  content?: Content | undefined;
  link?: LinkUrl | undefined;
  printout?: string | string[] | undefined;
  children?: React.ReactNode;
  depth?: number | undefined;
  uuid?: string | undefined;
};

export type SectionMetadata = {
  uuid: string;
  heading: string;
  depth: number;
};

export type ContentWithUUID<T> = Omit<T, "content"> & {
  uuid: string;
  content?: string | (string | ContentWithUUID<T>)[];
};

export type PageMetadata = {
  sections: SectionMetadata[];
};
