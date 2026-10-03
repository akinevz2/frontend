/**
 * Music track utility functions for handling Spotify and SoundCloud embeds.
 */
import type { MusicSource, MusicTrack } from "../content/types";
import { BasePage } from "./BasePage";

// --- MusicTrack support ----------------------------------------------------

const detectMusicSource = (urlValue: string): MusicSource | null => {
  try {
    const parsed = new URL(urlValue);
    if (parsed.hostname === "open.spotify.com") return "spotify";
    if (
      parsed.hostname === "soundcloud.com" ||
      parsed.hostname.endsWith(".soundcloud.com")
    ) {
      return "soundcloud";
    }
  } catch {
    // fall through to null
  }
  return null;
};

const SOUNDCLOUD_EMBED_HOST = "https://w.soundcloud.com/player/";

/**
 * Build a SoundCloud embed URL from a track URL.
 */
export const buildSoundCloudEmbedUrl = (trackUrl: string): string => {
  const embedUrl = new URL(SOUNDCLOUD_EMBED_HOST);
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

const SPOTIFY_RESOURCE_TYPES = new Set([
  "track",
  "playlist",
  "album",
  "artist",
  "episode",
  "show",
]);

/**
 * Build a Spotify embed URL from a track URL.
 */
export const buildSpotifyEmbedUrl = (
  trackUrl: string,
): { embedUrl: string; resourceType: string } | null => {
  try {
    const parsed = new URL(trackUrl);
    if (parsed.hostname !== "open.spotify.com") return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    const resourceType = segments[0];
    const resourceId = segments[1];
    if (!resourceType || !resourceId) return null;
    if (!SPOTIFY_RESOURCE_TYPES.has(resourceType)) return null;
    return {
      embedUrl: `https://open.spotify.com/embed/${resourceType}/${resourceId}`,
      resourceType,
    };
  } catch {
    return null;
  }
};

/**
 * Derive a `min-height` (in pixels) for a Spotify embed iframe purely from
 * the resource-type string embedded in the embed URL. There is no lookup
 * table — the height is computed dynamically from the length and vowel
 * density of the resource-type token so it scales with the resource at
 * runtime.
 */
const SPOTIFY_BASE_HEIGHT_PX = 152;

export const spotifyEmbedMinHeight = (resourceType: string): number => {
  const lengthFactor = 1 + (resourceType.length - 4) * 0.18;
  const vowelCount = (resourceType.match(/[aeiou]/g) ?? []).length;
  const vowelFactor = 1 + vowelCount * 0.12;
  const raw = SPOTIFY_BASE_HEIGHT_PX * lengthFactor * vowelFactor;
  return Math.max(120, Math.min(420, Math.round(raw)));
};

type ResolvedMusicTrack = {
  source: MusicSource;
  title: string;
  url: string;
  embedUrl: string;
  label: string;
  spotifyResourceType?: string;
};

/**
 * Resolve a MusicTrack object into a structure ready for rendering.
 */
export const resolveMusicTrack = (
  track: MusicTrack,
): ResolvedMusicTrack | null => {
  const source = track.source ?? detectMusicSource(track.url) ?? "soundcloud";
  if (source === "spotify") {
    const spotify = buildSpotifyEmbedUrl(track.url);
    if (!spotify) return null;
    return {
      source,
      title: track.title,
      url: track.url,
      embedUrl: spotify.embedUrl,
      label: "Spotify",
      spotifyResourceType: spotify.resourceType,
    };
  }
  return {
    source,
    title: track.title,
    url: track.url,
    embedUrl: buildSoundCloudEmbedUrl(track.url),
    label: "SoundCloud",
  };
};

export const MusicPage = () => {
  // Use the existing MusicContent component which handles loading soundcloud.json
  return <BasePage content={null} />;
};
