import { useEffect, useState } from "react";

import { PageContent } from "./Page";
import favouriteLinks from "../music-links.json";
import { processContent } from "../windowing/utils";
import type { PageMetadata, SectionProps } from "../windowing";

type MusicTrack = {
  path: string;
  title: string;
  url: string;
};

type MusicPayload = {
  source: string;
  generatedAt: string;
  trackCount: number;
  tracks: MusicTrack[];
};

type FavouriteLink = {
  title: string;
  url: string;
};

type MusicState = {
  sections: SectionProps | SectionProps[] | undefined;
  metadata: PageMetadata;
  error?: string;
};

const LOADING_SECTION: SectionProps = {
  className: "music-loading",
  children: [],
  heading: "Loading...",
  content: [
    "![Loading spinner](/spinner.svg)",
    "Fetching tracks from /soundcloud.json",
  ],
};

const buildState = (content: SectionProps | SectionProps[]): MusicState => {
  const { processed, metadata } = processContent(content);
  return {
    sections: processed as SectionProps | SectionProps[],
    metadata: { sections: metadata },
  };
};

const isFavouriteLink = (value: unknown): value is FavouriteLink => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<FavouriteLink>;
  return typeof candidate.title === "string" && typeof candidate.url === "string";
};

const configuredFavouriteLinks: FavouriteLink[] = Array.isArray(favouriteLinks)
  ? (favouriteLinks as unknown[]).filter(isFavouriteLink)
  : [];

const buildSoundCloudEmbedUrl = (trackUrl: string) => {
  const embedUrl = new URL("https://w.soundcloud.com/player/");
  embedUrl.searchParams.set("url", trackUrl);
  embedUrl.searchParams.set("color", "ff5500");
  embedUrl.searchParams.set("auto_play", "false");
  embedUrl.searchParams.set("hide_related", "false");
  embedUrl.searchParams.set("show_comments", "true");
  embedUrl.searchParams.set("show_user", "true");
  embedUrl.searchParams.set("show_reposts", "false");
  embedUrl.searchParams.set("visual", "false");
  return embedUrl.toString();
};

const renderTrackEmbed = (track: MusicTrack) => {
  const embedUrl = buildSoundCloudEmbedUrl(track.url);

  return [
    `### [${track.title}](${track.url})`,
    `<iframe
      title="SoundCloud track: ${track.title}"
      width="100%"
      height="166"
      scrolling="no"
      frameBorder="no"
      allow="autoplay"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      src="${embedUrl}"
    ></iframe>`,
    `[Open on SoundCloud](${track.url})`,
  ].join("\n\n");
};

const toMusicSections = (payload: MusicPayload): SectionProps[] => {
  const trackEmbeds = payload.tracks.map((track) => renderTrackEmbed(track));

  const favouriteLinkList = configuredFavouriteLinks.map(
    (link) => `- [${link.title}](${link.url})`,
  );

  return [
    {
      className: "music-favorite-uploads",
      children: [],
      heading: "Favorite Uploads",
      content:
        trackEmbeds.length > 0
          ? [
              `Generated: ${new Date(payload.generatedAt).toLocaleString()}`,
              `Track count: ${payload.trackCount}`,
              ...trackEmbeds,
            ]
          : ["No tracks found in this snapshot."],
    },
    {
      className: "music-favourite-links",
      children: [],
      heading: "Favourite Links",
      content:
        favouriteLinkList.length > 0
          ? favouriteLinkList
          : ["No favourite links configured yet."],
    },
    {
      className: "music-source",
      children: [],
      heading: "Source",
      content: [`Likes page: [${payload.source}](${payload.source})`],
    },
  ];
};

const isMusicPayload = (value: unknown): value is MusicPayload => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<MusicPayload>;
  return (
    typeof candidate.source === "string" &&
    typeof candidate.generatedAt === "string" &&
    typeof candidate.trackCount === "number" &&
    Array.isArray(candidate.tracks)
  );
};

export default function MusicContent() {
  const [musicState, setMusicState] = useState<MusicState>(() =>
    buildState(LOADING_SECTION),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/soundcloud.json", {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (!isMusicPayload(payload)) {
          throw new Error("Invalid music payload schema");
        }

        if (!cancelled) {
          setMusicState(buildState(toMusicSections(payload)));
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          setMusicState({
            sections: undefined,
            metadata: { sections: [] },
            error: `Failed to load music data (${message}).`,
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {musicState.error ? (
        <p className="status-bar">{musicState.error}</p>
      ) : null}
      {musicState.sections ? (
        <PageContent
          sections={musicState.sections}
          pageMetadata={musicState.metadata}
        />
      ) : (
        <PageContent pageMetadata={musicState.metadata} />
      )}
    </>
  );
}
