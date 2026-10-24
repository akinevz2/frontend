export type EmbedSpec = {
  provider: "spotify" | "youtube" | "soundcloud";
  label: string;
  src: string;
  /** Fixed pixel height for fixed-aspect players (Spotify, SoundCloud).
   * Omitted for YouTube: those players are 16:9 and size themselves from
   * their width via CSS (.embed-youtube). */
  height?: number;
};

const SPOTIFY_TYPES = new Set([
  "track",
  "playlist",
  "album",
  "artist",
  "episode",
  "show",
]);
const SPOTIFY_HEIGHT = 152;
const YOUTUBE_ID = /^[A-Za-z0-9_-]+$/;

/**
 * Extracts a video id from common YouTube URL forms:
 *   https://youtu.be/<id>
 *   https://www.youtube.com/watch?v=<id>
 *   https://www.youtube.com/embed/<id> (also /shorts/, /live/ and /v/)
 * www./m./music. subdomains and youtube-nocookie.com are accepted.
 * Returns null for anything else — including any link carrying a ?list=
 * parameter: it points at a playlist (often unlisted), and every caller
 * renders those as plain links instead of embeds.
 */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.searchParams.get("list")) return null;
  const host = parsed.hostname.replace(/^(www|m|music)\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return id && YOUTUBE_ID.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  if (parsed.pathname === "/watch") {
    const id = parsed.searchParams.get("v");
    return id && YOUTUBE_ID.test(id) ? id : null;
  }
  const embed = parsed.pathname.match(
    /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]+)/,
  );
  return embed?.[1] ?? null;
}

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function soundCloudEmbedUrl(trackUrl: string): string {
  const embed = new URL("https://w.soundcloud.com/player/");
  const params: Record<string, string> = {
    url: trackUrl,
    color: "ff5500",
    auto_play: "false",
    hide_related: "false",
    show_comments: "true",
    show_user: "true",
    show_reposts: "false",
    visual: "true",
  };
  for (const [key, value] of Object.entries(params))
    embed.searchParams.set(key, value);
  return embed.toString();
}

export function resolveEmbed(
  url: string,
  provider?: "soundcloud",
): EmbedSpec | null {
  const parsed = parse(url);
  if (!parsed) return null;
  const host = parsed.hostname;

  if (
    provider === "soundcloud" ||
    host === "soundcloud.com" ||
    host.endsWith(".soundcloud.com")
  ) {
    return {
      provider: "soundcloud",
      label: "SoundCloud",
      src: soundCloudEmbedUrl(url),
      height: 250,
    };
  }

  if (host === "open.spotify.com") {
    const [type, id] = parsed.pathname.split("/").filter(Boolean);
    if (!type || !id || !SPOTIFY_TYPES.has(type)) return null;
    return {
      provider: "spotify",
      label: "Spotify",
      src: `https://open.spotify.com/embed/${type}/${id}`,
      height: SPOTIFY_HEIGHT,
    };
  }

  const youtubeId = youtubeVideoId(url);
  if (youtubeId) {
    return {
      provider: "youtube",
      label: "YouTube",
      src: `https://www.youtube.com/embed/${youtubeId}`,
    };
  }

  return null;
}

export function youTubeThumbnail(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null;
}
