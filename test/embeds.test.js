import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveEmbed,
  youtubeVideoId,
  youTubeThumbnail,
} from "../src/lib/embeds.ts";

test("youtubeVideoId parses every common URL form", () => {
  const cases = [
    ["https://youtu.be/n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://www.youtube.com/watch?v=n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://youtube.com/watch?v=n_L-E8K_gcg&t=30s", "n_L-E8K_gcg"],
    ["https://m.youtube.com/watch?v=n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://music.youtube.com/watch?v=n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://www.youtube.com/embed/n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://www.youtube.com/shorts/n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://www.youtube.com/live/n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://www.youtube-nocookie.com/embed/n_L-E8K_gcg", "n_L-E8K_gcg"],
  ];
  for (const [url, id] of cases) {
    assert.equal(youtubeVideoId(url), id, url);
  }
});

test("youtubeVideoId rejects playlists, other sites and junk", () => {
  const rejects = [
    "not a url",
    "/relative/path",
    "#clippy",
    "https://example.com/watch?v=n_L-E8K_gcg",
    "https://www.youtube.com/playlist?list=PLAOwLA0fz3HQCtJ5",
    "https://www.youtube.com/watch?v=n_L-E8K_gcg&list=PLAOwLA0fz3HQCtJ5",
    "https://youtu.be/n_L-E8K_gcg?list=PLAOwLA0fz3HQCtJ5",
    "https://www.youtube.com/watch", // no v
    "https://www.youtube.com/watch?v=not a valid id",
  ];
  for (const url of rejects) {
    assert.equal(youtubeVideoId(url), null, url);
  }
});

test("resolveEmbed keeps playlists as plain links (they are often unlisted)", () => {
  assert.equal(
    resolveEmbed("https://www.youtube.com/watch?v=x&list=PLAOwLA0fz3HQCtJ5"),
    null,
  );
  assert.equal(
    resolveEmbed("https://www.youtube.com/playlist?list=PLAOwLA0fz3HQCtJ5"),
    null,
  );
});

test("resolveEmbed maps youtube videos to embed cards", () => {
  const spec = resolveEmbed("https://youtu.be/n_L-E8K_gcg");
  assert.equal(spec?.provider, "youtube");
  assert.equal(spec?.label, "YouTube");
  assert.equal(spec?.src, "https://www.youtube.com/embed/n_L-E8K_gcg");
  // No fixed height: 16:9 players size from their width via CSS.
  assert.equal(spec?.height, undefined);
});

test("resolveEmbed gives fixed-aspect players a fixed height", () => {
  assert.equal(resolveEmbed("https://open.spotify.com/track/abc")?.height, 152);
  assert.equal(
    resolveEmbed("https://soundcloud.com/artist/track")?.height,
    250,
  );
});

test("youTubeThumbnail builds the maxres thumbnail for video URLs only", () => {
  assert.equal(
    youTubeThumbnail("https://www.youtube.com/watch?v=n_L-E8K_gcg"),
    "https://i.ytimg.com/vi/n_L-E8K_gcg/maxresdefault.jpg",
  );
  assert.equal(
    youTubeThumbnail("https://youtu.be/n_L-E8K_gcg"),
    "https://i.ytimg.com/vi/n_L-E8K_gcg/maxresdefault.jpg",
  );
  // Shorts now get thumbnails too (the old parser missed them).
  assert.equal(
    youTubeThumbnail("https://www.youtube.com/shorts/n_L-E8K_gcg"),
    "https://i.ytimg.com/vi/n_L-E8K_gcg/maxresdefault.jpg",
  );
  assert.equal(
    youTubeThumbnail("https://www.youtube.com/playlist?list=PLAOwLA0fz3HQCtJ5"),
    null,
  );
});
