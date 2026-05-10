import type React from "react";

export type Heading = string;

export type SectionProps = {
  className: string;
  heading?: Heading | undefined;
  content: string | (string | SectionProps)[];
  printout?: string | string[] | undefined;
  children: React.ReactNode[];
  depth?: number | undefined;
  uuid?: string | undefined;
};

export type Content = string | (string | SectionProps)[];

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
