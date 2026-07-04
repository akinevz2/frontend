import {
  buildMusicGroupSchema as buildMusicGroupSchemaRuntime,
  serializeJsonLd as serializeJsonLdRuntime,
} from "./musicSchema.mjs";

export type MusicSchemaTrack = {
  title: string;
  url: string;
};

export type MusicRecordingSchema = {
  "@type": "MusicRecording";
  name: string;
  url: string;
  byArtist: {
    "@type": "MusicGroup";
    name: string;
  };
};

export type MusicGroupSchema = {
  "@context": "https://schema.org";
  "@type": "MusicGroup";
  name: string;
  alternateName: string[];
  url: string;
  genre: string[];
  description: string;
  sameAs: string[];
  track: MusicRecordingSchema[];
};

export const serializeJsonLd = (value: unknown): string =>
  serializeJsonLdRuntime(value);

export const buildMusicGroupSchema = (
  tracks: MusicSchemaTrack[] = [],
): MusicGroupSchema => buildMusicGroupSchemaRuntime(tracks) as MusicGroupSchema;
