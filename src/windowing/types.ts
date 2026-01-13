import type React from "react";

export type Heading = string;

export type SectionProps = {
  className?: string;
  heading?: Heading;
  content?: string | (string | SectionProps)[];
  children?: React.ReactNode[];
  depth?: number;
  uuid?: string;
};

export type Content = string | string[] | SectionProps[];

export type SectionMetadata = {
  uuid: string;
  heading: string;
  depth: number;
};

export type ContentWithUUID<T> = Omit<T, 'content'> & {
  uuid: string;
  content?: string | (string | ContentWithUUID<T>)[];
};

export type PageMetadata = {
  sections: SectionMetadata[];
};
