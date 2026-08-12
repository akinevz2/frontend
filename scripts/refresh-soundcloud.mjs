#!/usr/bin/env node
/**
 * Refresh public/soundcloud.json from SoundCloud's public HTML and oembed APIs
 * (no SoundCloud login required).
 *
 * Strategy
 * --------
 * 1.  `npx --yes pagerts fetch <owner profile URLs>` extracts the visible track
 *     anchors from each SoundCloud profile's server-rendered HTML.  This gives
 *     us track URLs plus the titles that are visible in the SSR'd anchor text
 *     (typically the most recent ~10 tracks per owner).
 * 2.  The previous public/soundcloud.json is read so that any older track URL
 *     that has scrolled off the first page is preserved.  This keeps the
 *     discography complete even though SoundCloud only server-renders the most
 *     recent tracks.
 * 3.  For every track URL we then call SoundCloud's public oembed endpoint
 *     (https://soundcloud.com/oembed?url=...&format=json) to obtain a fresh
 *     title.  oembed works without a SoundCloud `client_id` (no 401s).
 * 4.  The merged set is sorted, deduplicated, and written back to
 *     public/soundcloud.json in the same shape that MusicContent.tsx and
 *     verify-policy.mjs expect.
 *
 * Why this replaces the old `generate-soundcloud-json.mjs`
 * --------------------------------------------------------
 * The previous script hit `api-v2.soundcloud.com/users/<id>/tracks` directly,
 * which requires a public `client_id` query parameter.  SoundCloud rotates
 * these periodically and they were no longer valid, causing every build to
 * fail with HTTP 401.  This script sidesteps the API entirely and uses the
 * scraper + oembed combo instead.
 */
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const outputFile = resolve(projectRoot, "public/soundcloud.json");

/** SoundCloud usernames whose discographies should be published. */
const SOUND_CLOUD_OWNERS = ["akinevz", "kirill_nevzorov"];

/** User-Agent sent to pagerts for the outbound HTTP request. */
const USER_AGENT =
    "Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0";

/** Max in-flight oembed lookups. */
const OEMBED_CONCURRENCY = 8;

/** Fetch timeout (ms) for the oembed calls. */
const OEMBED_TIMEOUT_MS = 8_000;

/** System SoundCloud paths that are not tracks. */
const SYSTEM_PATHS = new Set(["likes", "sets", "tracks", "comments", "followers", "following"]);

/**
 * SoundCloud paths that look like tracks but are actually profile-level
 * landing pages (e.g. /akinevz/recent, /akinevz/popular).  Empty for now
 * but kept as a hook for future filtering.
 */
const RESERVED_PATHS = new Set([]);

/**
 * Build the source URL for an owner's profile.  SoundCloud recently renamed
 * akinevz's display name to "I lied my name isn't actually KINE" but the
 * account handle is still `akinevz`, so we hard-code the handle here.
 */
const getProfileUrl = (owner) => `https://soundcloud.com/${owner}`;

/**
 * Run `npx --yes pagerts fetch <urls>` and return the parsed JSON array of
 * page descriptors.  Throws on non-zero exit or unparsable output.
 */
const runPagerts = (urls) => {
    const args = [
        "--yes",
        "pagerts",
        "fetch",
        "--user-agent",
        USER_AGENT,
        ...urls,
    ];

    const result = spawnSync("npx", args, {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
    });

    if (result.status !== 0) {
        const stderr = result.stderr?.trim() ?? "";
        throw new Error(
            `pagerts fetch failed (exit ${result.status}): ${stderr || "no stderr"}`,
        );
    }

    const stdout = result.stdout ?? "";
    const trimmed = stdout.trim();
    if (trimmed.length === 0) {
        throw new Error("pagerts fetch produced empty output");
    }

    // pagerts writes the JSON array to stdout.  Find the first '[' in case any
    // diagnostic lines slipped in.
    const startIndex = trimmed.indexOf("[");
    if (startIndex < 0) {
        throw new Error(`pagerts fetch did not return a JSON array: ${trimmed.slice(0, 200)}`);
    }

    try {
        const parsed = JSON.parse(trimmed.slice(startIndex));
        if (!Array.isArray(parsed)) {
            throw new Error("pagerts output is not a JSON array");
        }
        return parsed;
    } catch (error) {
        throw new Error(
            `Failed to parse pagerts output: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
};

/**
 * Pull track URLs (and their visible SSR titles) out of a single pagerts page
 * descriptor.  Only /<owner>/<slug> absolute paths are considered tracks;
 * sub-resources, system links (/likes, /sets, /tracks, /comments), and
 * protocol-relative links are ignored.
 */
const extractVisibleTracks = (owner, page) => {
    const resources = Array.isArray(page?.resources) ? page.resources : [];
    const seen = new Map();

    for (const resource of resources) {
        const text = resource?.text?.value;
        const link = resource?.link?.value;
        if (typeof link !== "string" || link.length === 0) continue;
        if (text === "src" && typeof link === "string" && link.startsWith("/")) {
            // pagerts sometimes surfaces a `text=src` for <a class=...><img src=.../></a>
            // — those still represent real links, so allow them through.
        }

        // Normalize the link to a path.  Skip non-track schemes/hosts.
        let path;
        try {
            const url = new URL(link, getProfileUrl(owner));
            if (url.hostname !== "soundcloud.com" && url.hostname !== "www.soundcloud.com") {
                continue;
            }
            path = url.pathname;
        } catch {
            continue;
        }

        if (!path.startsWith(`/${owner}/`)) continue;
        const slug = path.slice(`/${owner}/`.length);
        if (slug.length === 0) continue;
        if (SYSTEM_PATHS.has(slug)) continue;
        if (RESERVED_PATHS.has(slug)) continue;
        if (/\/.*\//.test(slug)) continue; // ignore nested paths

        const title = typeof text === "string" && text.length > 0 ? text.trim() : null;
        if (!seen.has(path)) {
            seen.set(path, title);
        } else if (!seen.get(path) && title) {
            seen.set(path, title);
        }
    }

    return seen;
};

/**
 * Fetch the previous public/soundcloud.json (if any) so we can preserve the
 * full URL list across runs.  Returns a map of "owner|path" -> title.
 */
const readPreviousSnapshot = async () => {
    try {
        const raw = await readFile(outputFile, "utf8");
        const data = JSON.parse(raw);
        const map = new Map();
        const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
        for (const track of tracks) {
            if (typeof track?.url !== "string") continue;
            try {
                const url = new URL(track.url);
                if (url.hostname !== "soundcloud.com" && url.hostname !== "www.soundcloud.com") continue;
                const key = `${url.pathname.replace(/^\//, "").split("/")[0]}|${url.pathname}`;
                if (!map.has(key)) {
                    map.set(key, typeof track.title === "string" ? track.title : null);
                }
            } catch {
                // ignore malformed entries
            }
        }
        return map;
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
            return new Map();
        }
        throw error;
    }
};

/**
 * Resolve the owner for a given track URL path.
 */
const ownerForPath = (path) => path.replace(/^\//, "").split("/")[0] ?? null;

/**
 * Build an oembed URL for a given SoundCloud track URL.
 */
const oembedUrl = (trackUrl) => {
    const url = new URL("https://soundcloud.com/oembed");
    url.searchParams.set("url", trackUrl);
    url.searchParams.set("format", "json");
    return url.toString();
};

/**
 * Fetch an oembed JSON document with a hard timeout.  Returns the parsed
 * document on success, or null on any failure.
 */
const fetchOembed = async (trackUrl) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS);
    try {
        const response = await fetch(oembedUrl(trackUrl), {
            headers: {
                Accept: "application/json",
                "User-Agent": USER_AGENT,
            },
            signal: controller.signal,
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data && typeof data === "object" ? data : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
};

/**
 * Run `worker` over `items` with at most `concurrency` tasks in flight.
 * Returns an array of results in the same order as `items`.
 */
const mapWithConcurrency = async (items, concurrency, worker) => {
    const results = new Array(items.length);
    let cursor = 0;

    const next = async () => {
        while (true) {
            const index = cursor++;
            if (index >= items.length) return;
            results[index] = await worker(items[index], index);
        }
    };

    const workers = Array.from(
        { length: Math.max(1, Math.min(concurrency, items.length)) },
        () => next(),
    );
    await Promise.all(workers);
    return results;
};

/**
 * Strip the trailing " by <author>" suffix that oembed adds to titles.
 */
const stripAuthorSuffix = (title) => {
    if (typeof title !== "string") return null;
    const idx = title.lastIndexOf(" by ");
    if (idx > 0) return title.slice(0, idx).trim();
    return title.trim();
};

/**
 * Build the final ordered track list.  Order: visible tracks first (newest
 * uploads at the top), then any older tracks from the previous snapshot that
 * weren't on the live page.
 */
const mergeTracks = (visibleByOwner, previous) => {
    const merged = new Map(); // key: owner|path -> track
    const orderedKeys = [];

    // Pass 1: visible tracks per owner, in pagerts-emitted order.
    for (const owner of SOUND_CLOUD_OWNERS) {
        const visible = visibleByOwner.get(owner);
        if (!visible) continue;
        for (const [path, title] of visible.entries()) {
            const url = `https://soundcloud.com${path}`;
            const key = `${owner}|${path}`;
            if (!merged.has(key)) {
                merged.set(key, { owner, path, title, url });
                orderedKeys.push(key);
            }
        }
    }

    // Pass 2: append any track URL that was in the previous snapshot but not
    // visible in the current pass.  This protects the long tail of the
    // discography from being lost when newer uploads push older ones off
    // SoundCloud's first page.
    for (const [key, title] of previous.entries()) {
        if (merged.has(key)) continue;
        const [owner, path] = key.split("|");
        if (!SOUND_CLOUD_OWNERS.includes(owner)) continue;
        const url = `https://soundcloud.com${path}`;
        merged.set(key, { owner, path, title, url });
        orderedKeys.push(key);
    }

    return orderedKeys.map((key) => merged.get(key));
};

/**
 * Refresh titles for every merged track via oembed.  Falls back to the SSR
 * title (from pagerts) or the URL slug if oembed is unavailable.
 */
const lookupTitles = async (tracks) => {
    const titles = await mapWithConcurrency(tracks, OEMBED_CONCURRENCY, async (track) => {
        const oembed = await fetchOembed(track.url);
        if (oembed && typeof oembed.title === "string" && oembed.title.length > 0) {
            return stripAuthorSuffix(oembed.title);
        }
        if (typeof track.title === "string" && track.title.length > 0) {
            return track.title;
        }
        return track.path.split("/").pop() ?? track.path;
    });

    return tracks.map((track, index) => ({ ...track, title: titles[index] }));
};

export const run = async () => {
    const profileUrls = SOUND_CLOUD_OWNERS.map(getProfileUrl);
    const pages = runPagerts(profileUrls);

    const visibleByOwner = new Map();
    for (const owner of SOUND_CLOUD_OWNERS) {
        const page = pages.find((entry) => {
            if (typeof entry?.url !== "string") return false;
            try {
                return new URL(entry.url).pathname === `/${owner}`;
            } catch {
                return false;
            }
        });
        if (!page) {
            process.stderr.write(`pagerts returned no page for ${owner}\n`);
            visibleByOwner.set(owner, new Map());
            continue;
        }
        visibleByOwner.set(owner, extractVisibleTracks(owner, page));
    }

    const previous = await readPreviousSnapshot();
    const merged = mergeTracks(visibleByOwner, previous);
    const enriched = await lookupTitles(merged);

    const asOfUploadingTrackCount = enriched.length;
    const source = getProfileUrl(SOUND_CLOUD_OWNERS[0]);

    // Build per-owner track lists in the order: visible (newest first),
    // then any long-tail entries from the previous snapshot.  The component
    // groups the discography by `owner`, so emitting a `profiles` array
    // ensures every owner gets its own section — not just the first one.
    const tracksByOwner = new Map();
    for (const owner of SOUND_CLOUD_OWNERS) tracksByOwner.set(owner, []);
    for (const track of enriched) {
        const bucket = tracksByOwner.get(track.owner);
        if (bucket) bucket.push(track);
    }

    const profiles = SOUND_CLOUD_OWNERS.map((owner) => {
        const ownerTracks = tracksByOwner.get(owner) ?? [];
        return {
            owner,
            source: getProfileUrl(owner),
            profileImageUrl: null,
            trackCount: ownerTracks.length,
            tracks: ownerTracks.map((track) => ({
                owner: track.owner,
                path: track.path,
                title: track.title,
                url: track.url,
            })),
        };
    });

    const result = {
        source,
        generatedAt: new Date().toISOString(),
        asOfUploadingTrackCount,
        trackCount: asOfUploadingTrackCount,
        tracks: enriched.map((track) => ({
            owner: track.owner,
            path: track.path,
            title: track.title,
            url: track.url,
        })),
        profiles,
    };

    await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");


    process.stdout.write(
        `Refreshed ${result.tracks.length} SoundCloud track(s) into ${outputFile}\n`,
    );

    return result;
};

const isDirectExecution =
    process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
    run().catch((error) => {
        process.stderr.write(
            `${error instanceof Error ? error.message : String(error)}\n`,
        );
        process.exit(1);
    });
}
