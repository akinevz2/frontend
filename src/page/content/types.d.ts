import type { ReactNode } from "react";
import { string, unknown } from "zod";
import type { Page } from "../types";

export type Heading = string;
export type Text = string;
export type ClassName = string;
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