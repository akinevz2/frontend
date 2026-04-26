#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const USER_PATH_PREFIX = "/akinevz/";
const SOURCE_URL = "https://soundcloud.com/akinevz/likes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputFile = resolve(__dirname, "../public/soundcloud.json");

const parseOutput = (raw) => {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");

  if (start === -1) {
    throw new Error("pagerts output does not contain JSON payload");
  }

  const payload = JSON.parse(trimmed.slice(start));
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("pagerts returned an empty payload");
  }

  return payload;
};

const isTrackPath = (value) =>
  typeof value === "string" &&
  value.startsWith(USER_PATH_PREFIX) &&
  value !== "/akinevz" &&
  !value.startsWith("/akinevz/sets/") &&
  /^\/akinevz\/[^/]+$/.test(value);

const titleFromPath = (value) => value.split("/").filter(Boolean).at(-1) ?? value;

const run = async () => {
  const args = ["--yes", "pagerts", SOURCE_URL];
  const child = spawn("npx", args, {
    cwd: resolve(__dirname, ".."),
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

  const exitCode = await new Promise((resolvePromise, reject) => {
    child.on("error", reject);
    child.on("close", resolvePromise);
  });

  if (exitCode !== 0) {
    throw new Error(`pagerts failed with exit code ${exitCode}: ${stderr.trim()}`);
  }

  const payload = parseOutput(stdout);
  const resources = payload[0]?.resources;

  if (!Array.isArray(resources)) {
    throw new Error("pagerts payload is missing resources");
  }

  const seen = new Set();
  const tracks = resources
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

  const result = {
    source: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    trackCount: tracks.length,
    tracks,
  };

  await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${tracks.length} tracks to ${outputFile}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
