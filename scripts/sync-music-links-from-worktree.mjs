#!/usr/bin/env node
// Fetches music-links.json from the blog-posts branch on GitHub CDN,
// validates its schema in memory, and reports the result.
// Does not write to disk — the file is consumed at runtime by MusicContent.tsx.

const MUSIC_LINKS_URL =
  "https://raw.githubusercontent.com/akinevz2/frontend/blog-posts/music-links.json";

const isFavouriteLink = (value) =>
  value !== null &&
  typeof value === "object" &&
  typeof value.title === "string" &&
  typeof value.url === "string";

const response = await fetch(MUSIC_LINKS_URL);
if (!response.ok) {
  process.stderr.write(`Failed to fetch ${MUSIC_LINKS_URL}: HTTP ${response.status}\n`);
  process.exit(1);
}

const payload = await response.json();
if (!Array.isArray(payload)) {
  process.stderr.write(`Invalid music-links.json: expected a JSON array\n`);
  process.exit(1);
}

const valid = payload.filter(isFavouriteLink);
const invalid = payload.length - valid.length;

process.stdout.write(
  `music-links.json OK — ${valid.length} valid link(s)${invalid > 0 ? `, ${invalid} skipped (missing title/url)` : ""}\n`,
);
