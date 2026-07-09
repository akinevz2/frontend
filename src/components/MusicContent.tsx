import { useEffect, useState } from "react";

import { PageContent } from "./Page";
import { processContent } from "../windowing/utils";
import { type PageMetadata, type SectionProps } from "../windowing";

const MUSIC_LINKS_URL = "/blog/music-links.json";

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

type FavouriteLinkContent = FavouriteLink | SectionProps;

type MusicState = {
  sections: SectionProps | SectionProps[];
  metadata: PageMetadata;
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
const isSectionProps = (value: unknown): value is SectionProps => {
  const candidate = value as Partial<SectionProps>;
  return (
    typeof candidate.heading === "string" && Array.isArray(candidate.content)
  );
};
const isFavouriteLink = (value: unknown): value is FavouriteLink => {
  const candidate = value as Partial<FavouriteLink>;
  return (
    typeof candidate.title === "string" && typeof candidate.url === "string"
  );
};

const isValidContentFavLink = (
  value: unknown,
): value is FavouriteLink | SectionProps => {
  if (!value || typeof value !== "object") return false;
  console.dir("Validating favourite link content:", value);
  return isSectionProps(value) || isFavouriteLink(value);
};

const fetchFavouriteLinks = async (): Promise<FavouriteLinkContent[]> => {
  const response = await fetch(MUSIC_LINKS_URL, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("Invalid music-links schema");
  return payload.filter(isValidContentFavLink);
};

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
    `<p class="music-track-title"><a href="${track.url}">${track.title}</a></p>`,
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

const getSpotifyEmbedUrl = (urlValue: string): string | null => {
  try {
    const parsed = new URL(urlValue);
    if (parsed.hostname !== "open.spotify.com") {
      return null;
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    const resourceType = segments[0];
    const resourceId = segments[1];
    if (!resourceType || !resourceId) {
      return null;
    }

    const allowedTypes = new Set([
      "track",
      "playlist",
      "album",
      "artist",
      "episode",
      "show",
    ]);
    if (!allowedTypes.has(resourceType)) {
      return null;
    }

    return `https://open.spotify.com/embed/${resourceType}/${resourceId}`;
  } catch {
    return null;
  }
};

const renderFavouriteLink = (link: FavouriteLink) => {
  // If it's already a SectionProps, return it as-is
  if ("content" in link) {
    // Convert SectionProps to string representation
    const section = link as SectionProps;
    return section;
  }

  // Otherwise, it's a simple link
  const favouriteLink = link as { title: string; url: string };

  const embedUrl = getSpotifyEmbedUrl(favouriteLink.url);
  if (!embedUrl) {
    return `- [${favouriteLink.title}](${favouriteLink.url})`;
  }

  return [
    `<p class="music-track-title"><a href="${favouriteLink.url}">${favouriteLink.title}</a></p>`,
    `<iframe
      title="Spotify item: ${favouriteLink.title}"
      style="border-radius:12px"
      src="${embedUrl}"
      width="100%"
      height="152"
      frameborder="0"
      allowfullscreen=""
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>`,
    `[Open on Spotify](${favouriteLink.url})`,
  ].join("\n\n");
};

const toMusicSections = (
  payload: MusicPayload,
  favouriteLinks: FavouriteLinkContent[],
): SectionProps[] => {
  const trackEmbeds = payload.tracks.map((track) => renderTrackEmbed(track));

  const favouriteLinkList = favouriteLinks.map((link) =>
    isFavouriteLink(link) ? renderFavouriteLink(link) : link,
  );

  // print all non-string to log
  for (const link of favouriteLinkList) {
    if (typeof link !== "string") {
      console.dir("Non-string favourite link content:", link);
    }
  }

  return [
    {
      className: "music-favorite-uploads",
      children: [],
      heading: "Favorite Uploads",
      content:
        trackEmbeds.length > 0
          ? [
            `Generated: ${new Date(payload.generatedAt).toLocaleString()}`,
            `Track count: ${payload.trackCount} (43)`,
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
      content: [
        "Artist page: [soundcloud.com/akinevz](https://soundcloud.com/akinevz)",
        "Some mirror links were removed due to licensing restrictions.",
        "",
        `<iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/artist/2vy7FXU6dP4OEBiJVjsw7r?utm_source=generator&theme=0&si=0c8005cead7543c5" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
      ],
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
        const [scResponse, favouriteLinks] = await Promise.all([
          fetch("/soundcloud.json", {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
          fetchFavouriteLinks().catch(() => [] as FavouriteLink[]),
        ]);

        if (!scResponse.ok) {
          throw new Error(`HTTP ${scResponse.status}`);
        }

        const payload: unknown = await scResponse.json();
        if (!isMusicPayload(payload)) {
          throw new Error("Invalid music payload schema");
        }

        if (!cancelled) {
          setMusicState(buildState(toMusicSections(payload, favouriteLinks)));
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          setMusicState(
            buildState({
              className: "music-error",
              children: [],
              heading: "Library unavailable",
              content: [
                "## Can't reach the library",
                `Failed to load music data (${message}).`,
                "Website is still undergoing maintenance",
                "Please let kine (akinevz) know.",
              ],
            }),
          );
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContent
      sections={musicState.sections}
      pageMetadata={musicState.metadata}
    />
  );
}
