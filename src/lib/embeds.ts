export type EmbedSpec = {
  provider: "spotify" | "youtube" | "soundcloud";
  label: string;
  src: string;
  height: number;
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

  if (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "www.youtube.com"
  ) {
    // Playlists are often unlisted, so they fall back to a plain link.
    if (parsed.searchParams.get("list")) return null;
    const id =
      host === "youtu.be"
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v");
    if (!id) return null;
    return {
      provider: "youtube",
      label: "YouTube",
      src: `https://www.youtube.com/embed/${id}`,
      height: SPOTIFY_HEIGHT,
    };
  }

  return null;
}

export function youTubeThumbnail(url: string): string | null {
  const parsed = parse(url);
  if (!parsed || parsed.searchParams.get("list")) return null;
  const host = parsed.hostname;
  const id =
    host === "youtu.be"
      ? parsed.pathname.slice(1)
      : host.endsWith("youtube.com")
        ? parsed.searchParams.get("v")
        : null;
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null;
}
