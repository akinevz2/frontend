const MUSIC_GROUP_NAME = "akinevz";
const MUSIC_GROUP_URL = "https://akinevz.com";
const MUSIC_GROUP_DESCRIPTION =
  "Independent sound designer, music creator, and electronic music artist.";
const MUSIC_GROUP_ALTERNATE_NAMES = [
  "KINE",
  "KALE",
  "I lied my name isn't actually KINE",
  "I lied my name isn't actually KALE",
];
const MUSIC_GROUP_GENRES = [
  "Electronic",
  "Experimental",
  "Industrial",
  "Drone",
  "Glitch",
];
const MUSIC_GROUP_SAME_AS = [
  "https://soundcloud.com/akinevz2",
  "https://youtube.com/@akinevz",
  "https://x.com/akinevz",
  "https://github.com/akinevz2",
];
const MUSIC_GROUP_PRIMARY_ALIAS =
  MUSIC_GROUP_ALTERNATE_NAMES[0] ?? MUSIC_GROUP_NAME;


type Track = {
  title: string;
  url: string;
};

type MusicRecordingSchema = {
  "@type": "MusicRecording";
  name: string;
  url: string;
  byArtist: {
    "@type": "MusicGroup";
    name: string;
  };
};

type MusicGroupSchema = {
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

export const buildMusicGroupSchema = (
  tracks: Track[] = [],
): MusicGroupSchema => ({
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  name: MUSIC_GROUP_NAME,
  alternateName: MUSIC_GROUP_ALTERNATE_NAMES,
  url: MUSIC_GROUP_URL,
  genre: MUSIC_GROUP_GENRES,
  description: MUSIC_GROUP_DESCRIPTION,
  sameAs: MUSIC_GROUP_SAME_AS,
  track: Array.isArray(tracks)
    ? tracks
      .filter(
        (track): track is Track =>
          Boolean(track) &&
          typeof track.title === "string" &&
          typeof track.url === "string",
      )
      .map((track) => ({
        "@type": "MusicRecording",
        name: track.title,
        url: track.url,
        byArtist: {
          "@type": "MusicGroup",
          name: MUSIC_GROUP_PRIMARY_ALIAS,
        },
      }))
    : [],
});
