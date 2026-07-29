export type Heading = string;
export type HttpUrl = `http://${string}` | `https://${string}`;
export type LinkUrl = HttpUrl | `/${string}`;

export type Content = string | (React.ReactNode | string | SectionProps)[];
// export type Content = string | ReactNode | Element | SectionProps[];

export type SectionProps = {
  className?: string | undefined;
  heading?: Heading | undefined;
  content?: Content | undefined;
  link?: LinkUrl | undefined;
  printout?: string | string[] | undefined;
  theme?: string | undefined;
  depth?: number | undefined;
  uuid?: string | undefined;
  treeIndex?: string | undefined;
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
