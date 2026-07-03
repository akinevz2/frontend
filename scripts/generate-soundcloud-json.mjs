#!/usr/bin/env node
import { readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const USER_PATH_PREFIX = "/akinevz2/";
const SOURCE_URL = "https://soundcloud.com/akinevz2";
const RESERVED_PROFILE_ROUTES = new Set([
  "likes",
  "sets",
  "tracks",
  "comments",
  "reposts",
  "popular-tracks",
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputFile = resolve(__dirname, "../public/soundcloud.json");
const cachedArtistPage = resolve(__dirname, "../public/soundcloud-artist.html");

const runCommand = ({ command, args, cwd }) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolvePromise({ exitCode, stdout, stderr });
    });
  });

export const parseOutput = (raw) => {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");

  if (start === -1) {
    throw new Error("pagerts output does not contain JSON payload");
  }

  let inString = false;
  let isEscaped = false;
  let depth = 0;
  let end = -1;

  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error("pagerts output contains incomplete JSON payload");
  }

  const payload = JSON.parse(trimmed.slice(start, end + 1));
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("pagerts returned an empty payload");
  }

  return payload;
};

export const isTrackPath = (value) =>
  typeof value === "string" &&
  value.startsWith(USER_PATH_PREFIX) &&
  value !== "/akinevz2" &&
  !value.startsWith("/akinevz2/sets/") &&
  !RESERVED_PROFILE_ROUTES.has(value.split("/").filter(Boolean).at(-1) ?? "") &&
  /^\/akinevz2\/[^/]+$/.test(value);

export const titleFromPath = (value) =>
  value.split("/").filter(Boolean).at(-1) ?? value;

export const buildTracks = (resources) => {
  const seen = new Set();

  return resources
    .filter((resource) => isTrackPath(resource?.link?.value))
    .map((resource) => resource.link.value)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    })
    .map((path) => ({
      path,
      title: titleFromPath(path),
      url: `https://soundcloud.com${path}`,
    }));
};

export const extractTrackPathsFromHtml = (html) => {
  const hrefPattern = /href=["'](\/akinevz2\/[^"'#?\s>]+)(?:\?[^"']*)?["']/gi;
  const paths = [];

  let match = hrefPattern.exec(html);
  while (match) {
    const href = match[1];
    if (isTrackPath(href)) {
      paths.push(href);
    }
    match = hrefPattern.exec(html);
  }

  return Array.from(new Set(paths));
};

export const run = async () => {
  const projectRoot = resolve(__dirname, "..");

  const curlResult = await runCommand({
    command: "curl",
    args: ["-fLsS", SOURCE_URL, "-o", cachedArtistPage],
    cwd: projectRoot,
  });

  if (curlResult.exitCode !== 0) {
    throw new Error(
      `curl failed with exit code ${curlResult.exitCode}: ${curlResult.stderr.trim()}`,
    );
  }

  try {
    const artistHtml = await readFile(cachedArtistPage, "utf8");
    const paths = extractTrackPathsFromHtml(artistHtml);
    const tracks = buildTracks(paths.map((path) => ({ link: { value: path } })));

    const result = {
      source: SOURCE_URL,
      generatedAt: new Date().toISOString(),
      trackCount: tracks.length,
      tracks,
    };

    await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    process.stdout.write(
      `Wrote ${tracks.length} tracks to ${outputFile} and cleaned temporary ${cachedArtistPage}\n`,
    );
  } finally {
    await rm(cachedArtistPage, { force: true });
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
