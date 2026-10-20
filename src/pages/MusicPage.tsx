import { useMemo } from "react";
import { createPortal } from "react-dom";
import {
  musicExt,
  soundcloud,
  type Item,
  type Section,
  type SoundCloudTrack,
} from "@/content";
import { PageWindows } from "@/window";

const PROFILES = [
  {
    owner: "akinevz2",
    image: "/avatar.jpg",
    themes: ["experimental"] as const,
    showTracks: false,
  },
  {
    owner: "akinevz",
    image: "/medium.png",
    themes: ["open"] as const,
    showTracks: true,
  },
];

const SPOTIFY_ARTISTS = [
  "https://open.spotify.com/embed/artist/2vy7FXU6dP4OEBiJVjsw7r?utm_source=generator&theme=0&si=0c8005cead7543c5",
  "https://open.spotify.com/embed/artist/3K8SiimFvg1928AlQo1HgF?utm_source=generator&si=f70545367bc341f7",
];

const spotifyArtist = (src: string) =>
  `<iframe data-testid="embed-iframe" style="border-radius:12px" src="${src}" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;

const trackWindow = (track: SoundCloudTrack): Section => ({
  className: "music-track-window music-track-soundcloud",
  heading: `Track: ${track.title}`,
  content: [
    { title: track.title, url: track.url, provider: "soundcloud" },
    `[${track.title} on SoundCloud](${track.url})`,
  ],
});

const profileWindow = (profile: (typeof PROFILES)[number]): Section => {
  const owned = soundcloud.tracks.filter((t) => t.owner === profile.owner);
  return {
    className: "music-profile-discography",
    heading: profile.showTracks
      ? `@${profile.owner} discography`
      : `@${profile.owner} profile`,
    theme: [...profile.themes],
    content: [
      {
        banner: {
          image: profile.image,
          href: `https://soundcloud.com/${profile.owner}`,
          lines: [profile.owner, `Total uploads: ${owned.length}`],
        },
      },
      ...(profile.showTracks ? soundcloud.tracks.map(trackWindow) : []),
    ],
  };
};

/** music-ext.json mixes bare {title,url} links with grouped sections. */
const favouriteWindow = (entry: unknown): Section | string => {
  const item = entry as Item;
  if (typeof item === "string") return item;
  if ("heading" in item) return item;
  if ("url" in item) {
    return {
      className: "music-favourite-link-window",
      heading: item.title,
      link: item.url,
      theme: "open",
      content: [item],
    };
  }
  return "";
};

const tracksTotal = (total: number) => (
  <h3 style={{ textAlign: "center" }}>
    {total} tracks as of last website rebuild
  </h3>
);
const buildMusic = (): Section[] => {
  const total = soundcloud.asOfUploadingTrackCount ?? soundcloud.trackCount;
  const favourites = (musicExt as unknown[]).map(favouriteWindow);
  return [
    {
      className: "music-as-of-uploading",
      heading: "Discography Total",
      theme: "open",
      content: [
        `Generated: ${new Date(soundcloud.generatedAt).toLocaleString()}`,
        "This total measures main and alt profiles as of uploading.",
        tracksTotal(total),
      ],
    },
    {
      className: "music-profile-uploads",
      heading: "SoundCloud Discography",
      content: PROFILES.map(profileWindow),
    },
    {
      className: "music-favourite-links",
      heading: "Favourite Links",
      content: favourites.length
        ? favourites
        : ["No favourite links configured yet."],
    },
    {
      className: "music-source",
      heading: "Uploads to Spotify",
      content: SPOTIFY_ARTISTS.map(spotifyArtist),
    },
  ];
};

function DebugBar() {
  const summary = PROFILES.map(
    (p) =>
      `@${p.owner}: ${soundcloud.tracks.filter((t) => t.owner === p.owner).length}`,
  ).join(" | ");
  // .page establishes a perspective, so fixed positioning needs to escape it.
  return createPortal(
    <div className="debug-bar" role="status" aria-live="polite" data-debug-bar>
      <strong>Debug:</strong> {soundcloud.trackCount} tracks loaded ({summary}).
      Generated {new Date(soundcloud.generatedAt).toLocaleString()}.
    </div>,
    document.body,
  );
}

export const MusicPage = () => {
  const content = useMemo(buildMusic, []);
  return (
    <>
      <PageWindows content={content} />
      <DebugBar />
    </>
  );
};
