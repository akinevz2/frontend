#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

const SOURCES = [
  {
    url: "https://raw.githubusercontent.com/akinevz2/frontend/refs/heads/blogging/posts.json",
    outputPath: resolve(projectRoot, "public/blog/posts.json"),
  },
  {
    url: "https://raw.githubusercontent.com/akinevz2/frontend/refs/heads/blogging/music-links.json",
    outputPath: resolve(projectRoot, "public/blog/music-links.json"),
  },
];

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (HTTP ${response.status}).`);
  }

  const payload = await response.text();
  JSON.parse(payload);
  return payload;
}

async function run() {
  for (const source of SOURCES) {
    const content = await fetchJson(source.url);
    await mkdir(dirname(source.outputPath), { recursive: true });
    await writeFile(source.outputPath, `${content.trim()}\n`, "utf8");
    process.stdout.write(`Froze ${source.url} -> ${source.outputPath}\n`);
  }
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
