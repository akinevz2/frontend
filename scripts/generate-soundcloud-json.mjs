#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const USER_PATH_PREFIX = "/akinevz/";
const SOURCE_URL = "https://soundcloud.com/akinevz";
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
const cacheDir = resolve(__dirname, "../.cache");
const cachedArtistPage = resolve(cacheDir, "soundcloud-artist.html");

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
  value !== "/akinevz" &&
  !value.startsWith("/akinevz/sets/") &&
  !RESERVED_PROFILE_ROUTES.has(value.split("/").filter(Boolean).at(-1) ?? "") &&
  /^\/akinevz\/[^/]+$/.test(value);

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

export const run = async () => {
  const projectRoot = resolve(__dirname, "..");
  await mkdir(cacheDir, { recursive: true });

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

  const pagertsResult = await runCommand({
    command: "npx",
    args: ["--yes", "pagerts@latest", cachedArtistPage],
    cwd: projectRoot,
  });

  if (pagertsResult.exitCode !== 0) {
    throw new Error(
      `pagerts failed with exit code ${pagertsResult.exitCode}: ${pagertsResult.stderr.trim()}`,
    );
  }

  const payload = parseOutput(pagertsResult.stdout);
  const resources = payload[0]?.resources;

  if (!Array.isArray(resources)) {
    throw new Error("pagerts payload is missing resources");
  }

  const tracks = buildTracks(resources);

  const result = {
    source: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    trackCount: tracks.length,
    tracks,
  };

  await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(
    `Fetched artist page to ${cachedArtistPage} and wrote ${tracks.length} tracks to ${outputFile}\n`,
  );
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
