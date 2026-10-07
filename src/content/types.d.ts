import type { ReactNode } from "react";
import { string, unknown } from "zod";
import type { PageConfig } from "../page/types";
import type React from "react";

export type Heading = string;
export type Text = string;
export type ClassName = string;
export type ClassNames = { className?: ClassName } | { classNames?: ClassName[] };
export type HttpUrl = `http://${string}` & never;
export type HttpsUrl = `https://${string}`;
export type LinkUrl = HttpsUrl | `/${string}`;

export type MusicSource = "youtube" | "soundcloud" | "spotify";
export type MusicTrack = {
    source: MusicSource;
    title: string;
    url: string;
};
export type SoundCloudTrack = {
    title: string
    url: string
}

export type ArtistProfile = {
    url: HttpsUrl,
    name: Heading,
    icon: LinkUrl,
}

export type MusicStats<T> = {
    source: ArtistProfile,
    generatedAt: string,
    asOfUploadingTrackCount: number,
    trackCount: number,
    tracks: T[],
};

type OrMarkdown = string;
type OrMaybeTextAndContent<T> = (Content<T>)[];
type ContentChildType<T> = MaybeReactContent<T> | OrMarkdown | OrMaybeTextAndContent<T> | undefined;

export type TextContent<T> = ClassNames & {
    heading?: Heading | null | undefined;
    content?: ContentChildType<T>;
    theme?: string | string[] | undefined;
} & T;

export type ExternalContent<T> = {
    external?: {
        link?: LinkUrl | undefined;
        text?: LinkUrl | undefined;
    }
} & TextContent<T>;

export type MusicContent<T> = {
    owner?: string;
    path?: string;
    title?: string;
    url?: string;
    source?: MusicSource;
} & TextContent<T>;

export type AddonContent<T> = {
    // --- Addon extension fields ---
    // `status` renders an italic status line (e.g. "available") in the body.
    status?: string | undefined;
    // `text` renders a "Copy to Clipboard" button for the given content.
    text?: string | undefined;
    // `externalLink` opens the link in a new tab (used by addons) instead of
    // performing in-app navigation.
    externalLink?: boolean | undefined;
} & TextContent<T>;


type SectionContent<T = {}> = TextContent<T> | MusicContent<T> | AddonContent<T> | ExternalContent<T>
export type MaybeReactContent<T> = SectionContent<T> | React.ReactNode;

export type SectionContentMetadata = {
    uuid: string;
    depth: number;
    index: string;
};

export type WithMetadata = {
    metadata: SectionContentMetadata;
};


export type Content<T = {}> = SectionContent<T> | ContentChildType<T>;
export type PageContent<T = WithMetadata> = MaybeReactContent<T>;



type Test = SectionContent
type Test2 = PageContent

type Test3 = Test2 extends Test ? "true" : "false"
