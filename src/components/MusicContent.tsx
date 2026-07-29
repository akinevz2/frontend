import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { PageContent } from "./Page";
import { processContent } from "../windowing/utils";
import { type PageMetadata, type SectionProps } from "../windowing";

const MUSIC_LINKS_URL = "/blog/music-links.json";

type MusicTrack = {
  owner?: string;
  path: string;
  title: string;
  url: string;
};

type MusicProfile = {
  owner: string;
  comments?: string;
  source: string;
  profileImageUrl: string | null;
  trackCount: number;
  tracks: MusicTrack[];
};

type MusicPayload = {
  source: string | null;
  generatedAt: string;
  asOfUploadingTrackCount?: number;
  trackCount: number;
  tracks: MusicTrack[];
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
    AS OF UPLOADING: {total} tracks (main and alt)
  </div>
);

const ArtistProfilePicture = ({
  imageUrl,
  children,
}: {
  imageUrl?: string | null;
  children?: ReactNode;
}) => {
  if (!imageUrl) return null;
  return (
    <div
      className="artist-profile-picture"
      style={{ backgroundImage: `url('${imageUrl}')` }}
    >
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

const buildSoundCloudEmbedUrl = (trackUrl: string) => {
  const embedUrl = new URL("https://w.soundcloud.com/player/");
  embedUrl.searchParams.set("url", trackUrl);
  embedUrl.searchParams.set("color", "ff5500");
  embedUrl.searchParams.set("auto_play", "false");
  embedUrl.searchParams.set("hide_related", "false");
  embedUrl.searchParams.set("show_comments", "true");
  embedUrl.searchParams.set("show_user", "true");
  embedUrl.searchParams.set("show_reposts", "false");
  embedUrl.searchParams.set("visual", "true");
  return embedUrl.toString();
};

const createTrackSection = (track: MusicTrack): SectionProps => {
  const embedUrl = buildSoundCloudEmbedUrl(track.url);

  return {
    className: "music-track-window",
    heading: `Track: ${track.title}`,
    // link: track.url as `https://${string}` | `http://${string}`,
    content: [
      `<p class="music-track-title"><a href="${track.url}">${track.title}</a></p>`,
      `<iframe
        title="SoundCloud track: ${track.title}"
        width="100%"
        height="250"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src="${embedUrl}"
      ></iframe>`,
      `[${track.title} on SoundCloud](${track.url})`,
    ].join("\n\n"),
  };
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
  const profiles = Array.isArray(payload.profiles)
    ? payload.profiles
    : [
      {
        owner: "akinevz",
        source: payload.source ?? "https://soundcloud.com/akinevz",
        profileImageUrl: null,
        trackCount: payload.trackCount,
        tracks: payload.tracks,
      },
    ];

  const favouriteLinkList = favouriteLinks.map((link) =>
    isFavouriteLink(link) ? renderFavouriteLink(link) : link,
  );

  const combinedTrackCount = profiles.reduce(
    (sum, profile) => sum + profile.trackCount,
    0,
  );
  const asOfUploadingTrackCount =
    payload.asOfUploadingTrackCount ?? combinedTrackCount;

  const profileSections: SectionProps[] = profiles.flatMap((profile) => {
    // Create individual windowed sections for each track
    const trackWindows: SectionProps[] = profile.tracks.map((track) =>
      createTrackSection(track)
    );

    return [
      {
        className: "music-profile-discography",
        heading: `@${profile.owner} discography`,
        content: [
          `Profile: [${profile.source}](${profile.source})`,
          profile.profileImageUrl ? (
            <ArtistProfilePicture imageUrl={profile.profileImageUrl}>
              @{profile.owner}
            </ArtistProfilePicture>
          ) : "Profile image unavailable in cached snapshot.",
          `Track count: ${profile.trackCount}`,
          ...trackWindows,
        ],
      },
    ];
  });

  return [
    {
      className: "music-as-of-uploading",
      heading: "Discography Total",
      content: [
        <UploadingCounter total={asOfUploadingTrackCount} />,
        `Generated: ${new Date(payload.generatedAt).toLocaleString()}`,
        "This total measures main and alt profiles as of uploading.",
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
    <>
      <MusicDebugOverlay payload={musicState.payload} />
      <PageContent
        sections={musicState.sections}
        pageMetadata={musicState.metadata}
      />
    </>
  );
}

/**
 * Debug overlay visible to visitors.
 *
 * Shows the raw track count and profile summary from /soundcloud.json. Hidden
 * when Firefox Developer Tools are open (detected via window.outerWidth/Height
 * changes that devtools introduce).
 */
export function MusicDebugOverlay({
  payload,
}: {
  payload: MusicPayload | null;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    /**
     * The "hide on open inspector" behaviour is Firefox-specific as requested.
     * We detect Firefox from the user agent and then watch for the dimension gap
     * that appears when devtools are docked to the right or bottom.
     */
    const isFirefox = /firefox/i.test(navigator.userAgent);
    if (!isFirefox) {
      return;
    }

    const checkDevtools = () => {
      const threshold = 200;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const devtoolsOpen = widthDiff > threshold || heightDiff > threshold;
      setVisible(!devtoolsOpen);
    };

    checkDevtools();
    window.addEventListener("resize", checkDevtools);
    const timeoutId = window.setTimeout(checkDevtools, 1000);

    return () => {
      window.removeEventListener("resize", checkDevtools);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!visible || !payload) {
    return null;
  }

  const profileSummary = (payload.profiles ?? [])
    .map((profile) => `@${profile.owner}: ${profile.trackCount}`)
    .join(" | ");

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 28,
        right: 0,
        background: "#ffffff",
        color: "#000",
        fontFamily: "monospace",
        fontSize: "0.85rem",
        padding: "0.5rem 1rem",
        borderBottom: "2px solid #c0c0c0",
        visibility: "visible",
        animation: "music-debug-slide-down 0.3s ease-out",
      }}
      role="status"
      aria-live="polite"
      data-debug-bar
    >
      <style>{`
        @keyframes music-debug-slide-down {
          from {
            transform: translateY(-100%);
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
