#!/usr/bin/env node
/**
 * Generate public/soundcloud.json from the SoundCloud API v2.
 *
 * Background:
 * SoundCloud's public profile pages only render a small number of tracks on the
 * server (around 10). To publish the complete discography for akinevz (~43
 * tracks) and kirill_nevzorov (~33 tracks) we query the public API v2 endpoint and
 * paginate through the full track collection.
 */
import { copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

/** SoundCloud usernames whose discographies should be published. */
const SOUND_CLOUD_OWNERS = ["akinevz", "kirill_nevzorov"];

/**
 * Static mapping from username to SoundCloud user id.
 *
 * These ids are public and stable (they appear in profile meta tags and API
 * requests). Keeping them inline avoids an extra "resolve URL -> user id" round
 * trip at generation time.
 */
const SOUND_CLOUD_USER_IDS = {
  akinevz: 56124544,
  kirill_nevzorov: 1188527119,
};

/**
 * Public client id observed in SoundCloud's own web player requests.
 *
 * SoundCloud rotates these periodically. If generation starts failing with 401,
 * open a SoundCloud page in a browser, inspect any request to
 * api-v2.soundcloud.com, and update this value from the query string.
 */
const SOUND_CLOUD_CLIENT_ID = "lmRjTI0FqeXygHMXc3hRzS7hth20PNk5";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputFile = resolve(__dirname, "../public/soundcloud.json");
const preservedTmpDir = resolve(homedir(), "tmp");

const getSourceUrl = (owner) => `https://soundcloud.com/${owner}`;
const getCachedArtistPage = (owner) =>
  resolve(__dirname, `../public/soundcloud-artist-${owner}.html`);
const getPreservedCachedArtistPage = (owner) =>
  resolve(preservedTmpDir, `soundcloud-artist-${owner}.html`);

/**
 * Fetch a JSON resource from SoundCloud's API v2.
 *
 * The API requires a client_id query parameter. Requests that fail with a non-2xx
 * status throw an Error including the URL and status code.
 */
const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SoundCloud API request failed: ${url} -> HTTP ${response.status}`);
  }

  return response.json();
};

/**
 * Fetch all tracks for a user, following the cursor-based `next_href` links that
 * the API returns.
 */
const fetchAllTracks = async (userId) => {
  const baseUrl = new URL(`https://api-v2.soundcloud.com/users/${userId}/tracks`);
  baseUrl.searchParams.set("client_id", SOUND_CLOUD_CLIENT_ID);
  baseUrl.searchParams.set("limit", "100");
  baseUrl.searchParams.set("linked_partitioning", "1");

  const tracks = [];
  let nextUrl = baseUrl.toString();

  while (nextUrl) {
    const payload = await fetchJson(nextUrl);
    const collection = Array.isArray(payload.collection) ? payload.collection : [];

    for (const track of collection) {
      if (track && typeof track.permalink_url === "string") {
        tracks.push(track);
      }
    }

    // The API's next_href does not repeat the client_id, so re-inject it before
    // following the cursor.
    const rawNext =
      typeof payload.next_href === "string" && payload.next_href.length > 0
        ? payload.next_href
        : "";

    if (!rawNext) {
      nextUrl = "";
    } else {
      const nextUrlObject = new URL(rawNext);
      if (!nextUrlObject.searchParams.has("client_id")) {
        nextUrlObject.searchParams.set("client_id", SOUND_CLOUD_CLIENT_ID);
      }
      nextUrl = nextUrlObject.toString();
    }
  }

  return tracks;
};

/**
 * Fetch public profile metadata for a user (avatar, display name, track count).
 */
const fetchUserProfile = async (userId) => {
  const url = new URL(`https://api-v2.soundcloud.com/users/${userId}`);
  url.searchParams.set("client_id", SOUND_CLOUD_CLIENT_ID);
  return fetchJson(url.toString());
};

/**
 * Convert an API track record into the shape expected by MusicContent.tsx.
 */
const toTrack = (owner, track) => {
  const permalink = track.permalink ?? "";
  const path = permalink ? `/${owner}/${permalink}` : "";

  return {
    owner,
    path,
    title: track.title ?? permalink,
    url: track.permalink_url ?? `https://soundcloud.com${path}`,
  };
};

/**
 * Fetch the complete discography for a single SoundCloud owner.
 *
 * Writes a JSON snapshot of the raw API data to the public/ directory so it can
 * be inspected later, then moves it to ~/tmp/ for preservation.
 */
const fetchOwnerDiscography = async (owner) => {
  const sourceUrl = getSourceUrl(owner);
  const cachedArtistPage = getCachedArtistPage(owner);
  const preservedCachedArtistPage = getPreservedCachedArtistPage(owner);
  const userId = SOUND_CLOUD_USER_IDS[owner];

  if (typeof userId !== "number") {
    throw new Error(`Missing user id mapping for ${owner}`);
  }

  const [profile, tracks] = await Promise.all([
    fetchUserProfile(userId),
    fetchAllTracks(userId),
  ]);

  const snapshot = {
    url: sourceUrl,
    fetchedAt: new Date().toISOString(),
    profile,
    tracks,
  };
  await writeFile(
    cachedArtistPage,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );

  return {
    owner,
    source: sourceUrl,
    profileImageUrl: profile.avatar_url ?? null,
    trackCount: tracks.length,
    tracks: tracks.map((track) => toTrack(owner, track)),
    preservedCachedArtistPage,
    cachedArtistPage,
  };
};

export const run = async () => {
  const ownerResults = await Promise.all(
    SOUND_CLOUD_OWNERS.map((owner) => fetchOwnerDiscography(owner)),
  );

  const allTracks = ownerResults.flatMap((ownerResult) => ownerResult.tracks);
  const asOfUploadingTrackCount = ownerResults.reduce(
    (sum, ownerResult) => sum + ownerResult.trackCount,
    0,
  );

  const result = {
    source: ownerResults[0]?.source ?? null,
    generatedAt: new Date().toISOString(),
    asOfUploadingTrackCount,
    trackCount: asOfUploadingTrackCount,
    tracks: allTracks,
    profiles: ownerResults.map((ownerResult) => ({
      owner: ownerResult.owner,
      source: ownerResult.source,
      profileImageUrl: ownerResult.profileImageUrl,
      trackCount: ownerResult.trackCount,
      tracks: ownerResult.tracks,
    })),
  };

  await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const preservedPaths = ownerResults
    .map((ownerResult) => ownerResult.preservedCachedArtistPage)
    .join(", ");
  process.stdout.write(
    `Wrote ${allTracks.length} tracks across ${ownerResults.length} music posts to ${outputFile} and moved temporary snapshots to ${preservedPaths}\n`,
  );

  // Preserve raw snapshots to ~/tmp/ for later inspection.
  for (const ownerResult of ownerResults) {
    try {
      await mkdir(preservedTmpDir, { recursive: true });
      try {
        await rename(ownerResult.cachedArtistPage, ownerResult.preservedCachedArtistPage);
      } catch (error) {
        const code = error && typeof error === "object" ? error.code : undefined;
        if (code !== "EXDEV") {
          throw error;
        }

        await copyFile(ownerResult.cachedArtistPage, ownerResult.preservedCachedArtistPage);
        await rm(ownerResult.cachedArtistPage, { force: true });
      }
    } catch (error) {
      const code = error && typeof error === "object" ? error.code : undefined;
      if (code !== "ENOENT") {
        throw error;
      }
    }
  }
};

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  run().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
}
