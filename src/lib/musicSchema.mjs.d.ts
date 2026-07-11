declare module "./musicSchema.mjs" {
  export type MusicSchemaTrackRuntime = {
    title: string;
    url: string;
  };

  export type MusicGroupSchemaRuntime = {
    "@context": "https://schema.org";
    "@type": "MusicGroup";
    name: string;
    alternateName: string[];
    url: string;
    genre: string[];
    description: string;
    sameAs: string[];
    track: Array<{
      "@type": "MusicRecording";
      name: string;
      url: string;
      byArtist: {
        "@type": "MusicGroup";
        name: string;
      };
    }>;
  };

  export function serializeJsonLd(value: unknown): string;
  export function buildMusicGroupSchema(
    tracks?: MusicSchemaTrackRuntime[],
  ): MusicGroupSchemaRuntime;
}
