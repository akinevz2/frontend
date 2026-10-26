#!/usr/bin/env node
/**
 * Refresh src/content/soundcloud.json from SoundCloud's public api-v2 API
 * (no SoundCloud login required).
 *
 * Strategy
 * --------
 * 1.  Fetch the owner's profile HTML and scrape a fresh `client_id` out of
 *     one of the `a-v2.sndcdn.com/assets/*.js` bundles it links.  SoundCloud
 *     rotates these periodically, so they are never hard-coded.
 * 2.  Resolve each owner handle to a numeric user id via
 *     `api-v2.soundcloud.com/resolve`, then page through
 *     `users/<id>/tracks?representation=full` to get the COMPLETE discography
 *     (not just the ~10 tracks the profile page server-renders).
 * 3.  Emit the tracks in API order (newest first) in the same JSON shape the
 *     music page and verify-policy.mjs expect.
 *
 * Why this replaces the old pagerts + oembed scraper
 * ---------------------------------------------------
 * The previous strategy only saw the most recent ~10 tracks per profile in
 * the SSR'd HTML.  When a track was renamed, its URL slug changed too, so
 * the new slug was invisible to the scraper while the old slug's oembed
 * endpoint started returning 404 — the pruning step then deleted the track
 * from the snapshot.  The api-v2 discography endpoint returns every track
 * with its current permalink and title, so renames are picked up
 * automatically and no pruning is needed at all.
 *
 * The old script's claim that api-v2 was unusable (HTTP 401) is outdated:
 * the 401s came from stale hard-coded client_ids, not from the endpoint
 * itself.  Scraping a fresh one per run sidesteps rotation entirely.
 */
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const outputFile = resolve(projectRoot, "src/content/soundcloud.json");

/** SoundCloud usernames whose discographies should be published. */
const SOUND_CLOUD_OWNERS = ["akinevz", "akinevz2"];

/** User-Agent sent for every outbound HTTP request. */
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0";

/** Fetch timeout (ms) for every HTTP request. */
const FETCH_TIMEOUT_MS = 15_000;

/** Retries for transient api-v2 failures (it intermittently returns empty bodies). */
const API_RETRIES = 3;

/**
 * Build the source URL for an owner's profile.  SoundCloud recently renamed
 * akinevz's display name to "I lied my name isn't actually KINE" but the
 * account handle is still `akinevz`, so we hard-code the handle here.
 */
const getProfileUrl = (owner) => `https://soundcloud.com/${owner}`;

/**
 * Fetch a URL with a hard timeout.  Returns the Response on any HTTP status
 * (callers decide how to interpret it); throws only on network failure.
 */
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      headers: { "User-Agent": USER_AGENT, ...options.headers },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Fetch a JSON document from api-v2 with retries.  api-v2 intermittently
 * returns an empty body even with a 200, so retry until we get parseable
 * JSON.  Throws with the HTTP status on definitive failure.
 */
const fetchApiJson = async (url, attempt = 1) => {
  try {
    const response = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${new URL(url).pathname}`);
    }
    return await response.json();
  } catch (error) {
    if (attempt < API_RETRIES) {
      await new Promise((resolveSleep) =>
        setTimeout(resolveSleep, 1_000 * attempt),
      );
      return fetchApiJson(url, attempt + 1);
    }
    throw error;
  }
};

/**
 * Scrape a fresh api-v2 `client_id` from one of the JS asset bundles linked
 * by the owner's profile HTML.  SoundCloud rotates these periodically, so
 * they must never be hard-coded.  Throws if no bundle yields one.
 */
const resolveClientId = async () => {
  const profileResponse = await fetchWithTimeout(
    getProfileUrl(SOUND_CLOUD_OWNERS[0]),
  );
  if (!profileResponse.ok) {
    throw new Error(
      `Could not fetch profile HTML: HTTP ${profileResponse.status}`,
    );
  }
  const html = await profileResponse.text();

  const assetUrls = [
    ...new Set(
      [
        ...html.matchAll(
          /https:\/\/a-v2\.sndcdn\.com\/assets\/[a-zA-Z0-9._-]+\.js/g,
        ),
      ].map((match) => match[0]),
    ),
  ];
  if (assetUrls.length === 0) {
    throw new Error("No SoundCloud asset bundles found in profile HTML");
  }

  for (const assetUrl of assetUrls) {
    const assetResponse = await fetchWithTimeout(assetUrl);
    if (!assetResponse.ok) continue;
    const js = await assetResponse.text();
    const match = js.match(/client_id:"([a-zA-Z0-9]{20,40})"/);
    if (match) return match[1];
  }

  throw new Error("No client_id found in any SoundCloud asset bundle");
};

/**
 * Resolve an owner handle to its public api-v2 user object (id plus
 * profile metadata such as the public track_count).
 */
const resolveUser = async (owner, clientId) => {
  const resolveUrl = new URL("https://api-v2.soundcloud.com/resolve");
  resolveUrl.searchParams.set("url", getProfileUrl(owner));
  resolveUrl.searchParams.set("client_id", clientId);
  const user = await fetchApiJson(resolveUrl.toString());
  if (typeof user?.id !== "number") {
    throw new Error(`Could not resolve user id for ${owner}`);
  }
  return user;
};

/**
 * Page through the complete discography for a user.  Returns tracks in API
 * order (newest first).  Note: `next_href` omits `client_id`, so it must be
 * re-appended on every page or page 2+ returns HTTP 401.
 */
const fetchAllTracks = async (owner, userId, clientId) => {
  const tracks = [];
  let href = `https://api-v2.soundcloud.com/users/${userId}/tracks?client_id=${clientId}&limit=200&representation=full`;

  while (href) {
    const page = await fetchApiJson(href);
    const collection = Array.isArray(page?.collection) ? page.collection : [];
    for (const track of collection) {
      if (typeof track?.permalink_url !== "string") continue;
      tracks.push(track);
    }
    const nextHref =
      typeof page?.next_href === "string" ? page.next_href : null;
    href = nextHref
      ? `${nextHref}${nextHref.includes("?") ? "&" : "?"}client_id=${clientId}`
      : null;
  }

  if (tracks.length === 0) {
    throw new Error(`Discography for ${owner} came back empty`);
  }
  return tracks;
};

/**
 * Map an api-v2 track document to the snapshot shape.  Falls back to the
 * URL slug if the title is missing.
 */
const toSnapshotTrack = (owner, track) => {
  const url = track.permalink_url;
  const path = `/${url.replace(/^https?:\/\/(www\.)?soundcloud\.com\//, "")}`;
  return {
    owner,
    path,
    title:
      typeof track.title === "string" && track.title.length > 0
        ? track.title
        : path.split("/").pop(),
    url,
  };
};

/**
 * Fetch the complete discography for one owner.  Returns the snapshot-shaped
 * track list in API order (newest first).
 */
/**
 * Fetch the complete discography for one owner.  Returns the snapshot-shaped
 * track list in API order (newest first).
 *
 * Integrity: the fetched list must match the profile's PUBLIC track_count —
 * the number any anonymous visitor (and this unauthenticated snapshot) can
 * see.  A mismatch means the list came back truncated or the API lagged a
 * fresh upload; retry once, then fail loudly rather than write a silently
 * incomplete discography.  (Tracks the owner sees but the public does not —
 * still processing or private — never inflate the public count, so they do
 * not trip this check.)
 */
const fetchOwnerDiscography = async (owner, clientId) => {
  const user = await resolveUser(owner, clientId);
  let apiTracks = await fetchAllTracks(owner, user.id, clientId);
  const publicCount =
    typeof user.track_count === "number" ? user.track_count : null;
  if (publicCount !== null && apiTracks.length < publicCount) {
    // Refuse only TRUNCATION: the api returning fewer tracks than the
    // public profile counts means pages were missed. MORE tracks than
    // the profile counts is the fresh-upload case — the discography
    // endpoint lists a just-uploaded track before the profile's
    // counter catches up, and that is the track the refresh is FOR.
    apiTracks = await fetchAllTracks(owner, user.id, clientId);
    if (apiTracks.length < publicCount) {
      throw new Error(
        `Discography for ${owner} returned ${apiTracks.length} track(s) ` +
          `but the public profile counts ${publicCount} — refusing to ` +
          `write a truncated snapshot`,
      );
    }
  }
  return apiTracks.map((track) => toSnapshotTrack(owner, track));
};

export const run = async () => {
  const clientId = await resolveClientId();
  process.stdout.write(`Resolved SoundCloud client_id: ${clientId}\n`);

  const discographies = new Map();
  for (const owner of SOUND_CLOUD_OWNERS) {
    discographies.set(owner, await fetchOwnerDiscography(owner, clientId));
  }

  // Flat track list in per-owner API order (newest first).  The music page
  // filters this array by `owner`, so per-owner relative order is what the
  // UI displays.
  const tracks = SOUND_CLOUD_OWNERS.flatMap(
    (owner) => discographies.get(owner) ?? [],
  );
  const trackCount = tracks.length;

  // Per-owner sections.  The component groups the discography by `owner`,
  // so emitting a `profiles` array ensures every owner gets its own
  // section — not just the first one.
  const profiles = SOUND_CLOUD_OWNERS.map((owner) => {
    const ownerTracks = discographies.get(owner) ?? [];
    return {
      owner,
      source: getProfileUrl(owner),
      profileImageUrl: null,
      trackCount: ownerTracks.length,
      tracks: ownerTracks,
    };
  });

  const result = {
    source: getProfileUrl(SOUND_CLOUD_OWNERS[0]),
    generatedAt: new Date().toISOString(),
    asOfUploadingTrackCount: trackCount,
    trackCount,
    tracks,
    profiles,
  };

  await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  process.stdout.write(
    `Refreshed ${result.tracks.length} SoundCloud track(s) into ${outputFile}\n` +
      profiles
        .map(
          (profile) => `  @${profile.owner}: ${profile.trackCount} track(s)\n`,
        )
        .join(""),
  );

  return result;
};

const isDirectExecution =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  run().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
}
