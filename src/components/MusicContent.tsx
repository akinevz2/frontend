import { useEffect, useState, type ReactNode } from "react";

import { PageContent } from "./Page";
import { processContent } from "../windowing/utils";
import {
  type MusicTrack,
  type PageMetadata,
  type SectionProps,
  useIsAnyWindowMaximized,
} from "../windowing";

const MUSIC_LINKS_URL = "/blog/music-links.json";

type MusicProfile = {
  owner: string;
  comments?: string;
  source: string;
  profileImageUrl: string | null;
  trackCount: number;
  theme?: string;
  tracks: MusicTrack[];
};

type MusicPayload = {
  source: string | null;
  generatedAt: string;
  asOfUploadingTrackCount?: number;
  trackCount: number;
  tracks: MusicTrack[];
  theme?: string;
  profiles?: MusicProfile[];
};

type FavouriteLink = {
  title: string;
  url: string;
};

type FavouriteLinkContent = FavouriteLink | SectionProps;

type MusicState = {
  sections: SectionProps | SectionProps[];
  metadata: PageMetadata;
  payload: MusicPayload | null;
};

const getProfileImageUrl = (owner?: string): string | null => {
  const imageMap: Record<string, string> = {
    akinevz: "/medium.png",
    kirill_nevzorov: "/avatar.jpg",
  };
  return owner ? (imageMap[owner] ?? null) : null;
};

const LOADING_SECTION: SectionProps = {
  className: "music-loading",
  heading: "Loading...",
  content: [
    "![Loading spinner](/spinner.svg)",
    "Fetching tracks from /soundcloud.json",
  ],
};

const UploadingCounter = ({ total }: { total: number }) => (
  <div
    style={{
      fontSize: "1.3rem",
      fontWeight: 700,
      lineHeight: 1.3,
      textAlign: "center",
      padding: "0.35rem 0.5rem",
    }}
  >
    {total} tracks as of last website rebuild
    <br />
  </div>
);

const ArtistProfileBackground = ({
  imageUrl,
  children,
  link,
}: {
  imageUrl?: string | null;
  children?: ReactNode;
  link?: string;
}) => {
  if (!imageUrl) return null;

  const containerStyle: React.CSSProperties = {
    backgroundImage: `url('${imageUrl}')`,
  };

  // If a link is provided, make the background clickable via anchor tag
  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="artist-profile-background"
        style={{
          ...containerStyle,
          display: "block",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <div className="artist-profile-background" style={containerStyle}>
      {children}
    </div>
  );
};

const buildState = (
  content: SectionProps | SectionProps[],
  payload: MusicPayload | null = null,
): MusicState => {
  const { processed, metadata } = processContent(content);
  return {
    sections: processed as SectionProps | SectionProps[],
    metadata: { sections: metadata },
    payload,
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

const SPOTIFY_RESOURCE_TYPES = new Set([
  "track",
  "playlist",
  "album",
  "artist",
  "episode",
  "show",
]);

const getSpotifyEmbedInfo = (
  urlValue: string,
): { embedUrl: string; resourceType: string } | null => {
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

    if (!SPOTIFY_RESOURCE_TYPES.has(resourceType)) {
      return null;
    }

    return {
      embedUrl: `https://open.spotify.com/embed/${resourceType}/${resourceId}`,
      resourceType,
    };
  } catch {
    return null;
  }
};

const YOUTUBE_EMBED_HOST = "https://www.youtube.com/embed/";

/**
 * Detects if a URL is a YouTube video and returns its embed info.
 * Supports both youtube.com/watch?v=ID and youtu.be/ID formats.
 */
const getYouTubeEmbedInfo = (
  urlValue: string,
): { embedUrl: string; resourceType: "video" } | null => {
  try {
    const parsed = new URL(urlValue);

    // Handle youtube.com URLs
    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com"
    ) {
      const videoId = parsed.searchParams.get("v");
      if (!videoId) return null;
      return {
        embedUrl: `${YOUTUBE_EMBED_HOST}${videoId}`,
        resourceType: "video",
      };
    }

    // Handle youtu.be short URLs (e.g., https://youtu.be/VIDEO_ID)
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1); // Remove leading /
      if (!videoId) return null;
      return {
        embedUrl: `${YOUTUBE_EMBED_HOST}${videoId}`,
        resourceType: "video",
      };
    }

    return null;
  } catch {
    return null;
  }
};

/** Single fixed height for all Spotify embeds (compact player). */
const SPOTIFY_IFRAME_HEIGHT = 152;

/**
 * Renders a single favourite link as a real DOM element (Spotify or YouTube iframe
 * when possible, otherwise a plain anchor link). Used both as a top-level item inside
 * a Section's `content` array and as the leaf node when a favourite-links JSON entry
 * is itself a nested `SectionProps`.
 */
export const FavouriteLinkItem = ({
  title,
  url,
}: {
  title: string;
  url: string;
}) => {
  const spotify = getSpotifyEmbedInfo(url);
  const youtube = getYouTubeEmbedInfo(url);

  // Determine which embed to use (prefer Spotify over YouTube)
  if (spotify || youtube) {
    const embedUrl = spotify?.embedUrl ?? youtube!.embedUrl;
    const label = spotify ? "Spotify" : "YouTube";
    return (
      <>
        <iframe
          title={`${label} item: ${title}`}
          style={{ borderRadius: "12px" }}
          src={embedUrl}
          width="100%"
          height={SPOTIFY_IFRAME_HEIGHT}
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </>
    );
  }

  return (
    <p className="music-track-title">
      <a href={url}>{title}</a>
    </p>
  );
};

/**
 * Convert a single favourite-link payload entry into a fully-rendered
 * `SectionProps`. A raw `{title, url}` becomes a `SectionProps` whose
 * `content` is a `<FavouriteLinkItem>`; an already-`SectionProps` entry is
 * returned with its own nested `content` recursively normalised, so any
 * raw `{title, url}` items nested inside it become `<FavouriteLinkItem>`s
 * too. This is what lets a JSON entry like
 *   { heading: "Warning", content: [ { title, url }, ... ] }
 * render as a real Section with first-class Spotify iframe children.
 */
const favouriteLinkToSectionProps = (
  link: FavouriteLinkContent,
): SectionProps => {
  if (isSectionProps(link)) {
    const nested = Array.isArray(link.content) ? link.content : [];
    return {
      ...link,
      content: nested.map((item) =>
        isFavouriteLink(item) ? (
          <FavouriteLinkItem
            key={`${item.title}-${item.url}`}
            title={item.title}
            url={item.url}
          />
        ) : (
          item
        ),
      ),
    };
  }

  return {
    className: "music-favourite-link-window",
    heading: link.title,
    link: link.url as `https://${string}`,
    // `theme: "open"` keeps this per-link window always revealed so the
    // embedded Spotify iframe is visible without an extra click. The
    // "Favourite Links" wrapper stays collapsed by default.
    theme: "open",
    content: [
      <FavouriteLinkItem key={`${link.title}-${link.url}`} {...link} />,
    ],
  };
};

const toMusicSections = (
  payload: MusicPayload,
  favouriteLinks: FavouriteLinkContent[],
): SectionProps[] => {
  /**
   * Project a `payload`-like object (or any `{ tracks: MusicTrack[] }`) down
   * to the tracks owned by `artistName`.  Returns the per-artist `trackCount`
   * and `tracks` slice so callers can drop it straight into a profile-shaped
   * object literal.  The same helper is intended to back both the unified
   * (no `payload.profiles`) fallback path and the per-artist "happy path";
   * the latter is being refactored on the `refactor/two-artists` branch.
   */
  const findArtist = (
    profiles: { tracks?: MusicTrack[] },
    artistName: string,
  ): { trackCount: number; tracks: MusicTrack[] } => {
    const artistTracks = (profiles.tracks ?? []).filter(
      (track) => track.owner === artistName,
    );
    return { trackCount: artistTracks.length, tracks: artistTracks };
  };

  const profiles = (() => {
    const main = findArtist(payload, "akinevz");
    const alt = findArtist(payload, "kirill_nevzorov");
    return [{
      ...alt,
      owner: "kirill_nevzorov",
      source: "https://soundcloud.com/kirill_nevzorov",
      profileImageUrl: getProfileImageUrl("kirill_nevzorov"),
      trackCount: alt.trackCount,
      tracks: [],
      theme: "open",
    },
    {
      ...main,
      owner: "akinevz",
      source: "https://soundcloud.com/akinevz",
      profileImageUrl: getProfileImageUrl("akinevz"),
      trackCount: main.trackCount,
      theme: "open",
    }];
  })();

  const favouriteLinkList: SectionProps[] = favouriteLinks.map(
    favouriteLinkToSectionProps,
  );

  const combinedTrackCount = profiles.reduce(
    (sum, profile) => sum + profile.trackCount,
    0,
  );
  const asOfUploadingTrackCount =
    payload.asOfUploadingTrackCount ?? combinedTrackCount;

  const profileSections: SectionProps[] = profiles.flatMap((profile) => {
    // Embed `MusicTrack` items directly in the section's `content` array.
    // `Section`'s renderer recognises them and turns each into a windowed
    // `MusicTrackSection` (SoundCloud or Spotify, inferred from `source`
    // or the URL host) — exactly the same way a nested `SectionProps` does.
    return [
      {
        className: "music-profile-discography",
        heading: `@${profile.owner} discography`,
        theme: profile.theme ?? [],
        content: [
          <ArtistProfileBackground
            imageUrl={profile.profileImageUrl}
            link={profile.source}
          >
            {`${profile.owner}`}
            <br />
            {`Total uploads: ${profile.trackCount}`}
          </ArtistProfileBackground>,
          ...profile.tracks,
        ],
      },
    ];
  });

  return [
    {
      className: "music-as-of-uploading",
      heading: "Discography Total",
      theme: "open",
      content: [
        `Generated: ${new Date(payload.generatedAt).toLocaleString()}`,
        "This total measures main and alt profiles as of uploading.",
        <UploadingCounter total={asOfUploadingTrackCount} />,
      ],
    },
    {
      className: "music-profile-uploads",
      heading: "SoundCloud Discography",
      content:
        profileSections.length > 0
          ? profileSections
          : ["No tracks found in this snapshot."],
    },
    {
      className: "music-favourite-links",
      heading: "Favourite Links",
      content:
        favouriteLinkList.length > 0
          ? favouriteLinkList
          : ["No favourite links configured yet."],
    },
    {
      className: "music-source",
      heading: "Source",
      content: [
        "Artist page (main): [soundcloud.com/akinevz](https://soundcloud.com/akinevz)",
        "Artist page (alt): [soundcloud.com/kirill_nevzorov](https://soundcloud.com/kirill_nevzorov)",
        "Some other links were removed due to licensing restrictions.",
        "Unfortunately, I can't collect every piece of music I love on here.",
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
    (typeof candidate.source === "string" || candidate.source === null) &&
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
          setMusicState(
            buildState(toMusicSections(payload, favouriteLinks), payload),
          );
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          setMusicState(
            buildState({
              className: "music-error",
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
      footer={<MusicDebugOverlay payload={musicState.payload} />}
    />
  );
}

/**
 * Debug overlay visible to visitors.
 *
 * Shows the raw track count and profile summary from /soundcloud.json. Hidden
 * when Firefox Developer Tools are open (detected via window.outerWidth/Height
 * changes that devtools introduce) or when any window is maximized.
 */
export function MusicDebugOverlay({
  payload,
}: {
  payload: MusicPayload | null;
}) {
  const anyMaximized = useIsAnyWindowMaximized();
  const visible = !anyMaximized;

  if (!visible || !payload) {
    return null;
  }

  const profileSummary = (payload.profiles ?? [])
    .map((profile) => `@${profile.owner}: ${profile.trackCount}`)
    .join(" | ");

  return (
    <div
      style={{
        left: 0,
        bottom: 0,
        right: 0,
        position: "fixed",
        background: "#ffffff",
        color: "#000",
        fontFamily: "monospace",
        fontSize: "0.85rem",
        padding: "0.5rem 1rem",
        borderTop: "2px solid #c0c0c0",
        visibility: "visible",
        animation: "music-debug-slide-up 0.3s ease-out",
        zIndex: 9999,
      }}
      className="debug-bar"
      role="status"
      aria-live="polite"
      data-debug-bar
    >
      <style>{`
        @keyframes music-debug-slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
      <strong>Debug:</strong> {payload.trackCount} tracks loaded
      {profileSummary ? ` (${profileSummary})` : ""}. Generated{" "}
      {new Date(payload.generatedAt).toLocaleString()}.
    </div>
  );
}
