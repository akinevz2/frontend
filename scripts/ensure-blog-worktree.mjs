#!/usr/bin/env node
// Verifies that the blog-posts branch CDN assets are reachable.
// music-links.json now lives on the blog-posts branch and is fetched
// at runtime by MusicContent.tsx — no local worktree is required.
import { fileURLToPath } from "node:url";

const MUSIC_LINKS_URL =
  "https://raw.githubusercontent.com/akinevz2/frontend/blog-posts/music-links.json";

try {
  const response = await fetch(MUSIC_LINKS_URL, { method: "HEAD" });
  if (!response.ok) {
    process.stderr.write(
      `blog-posts CDN asset unreachable: ${MUSIC_LINKS_URL} returned HTTP ${response.status}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`blog-posts CDN OK: ${MUSIC_LINKS_URL}\n`);
} catch (error) {
  process.stderr.write(
    `blog-posts CDN check failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}
