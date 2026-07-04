import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTracks,
  extractTrackPathsFromHtml,
  isTrackPath,
  parseOutput,
  titleFromPath,
} from "../scripts/generate-soundcloud-json.mjs";

test("parseOutput extracts the first JSON payload from pagerts output", () => {
  const payload = parseOutput(
    `noise
[{
  "resources": [{ "link": { "value": "/akinevz/track-one" } }]
}]
trailing logs`,
  );

  assert.equal(Array.isArray(payload), true);
  assert.equal(payload.length, 1);
  assert.deepEqual(payload[0].resources[0].link.value, "/akinevz/track-one");
});

test("parseOutput rejects output without JSON", () => {
  assert.throws(() => parseOutput("no json payload here"), /does not contain JSON payload/);
});

test("isTrackPath only accepts direct track paths", () => {
  assert.equal(isTrackPath("/akinevz/track-one"), true);
  assert.equal(isTrackPath("/akinevz"), false);
  assert.equal(isTrackPath("/akinevz/sets/mixtape"), false);
  assert.equal(isTrackPath("/akinevz/likes"), false);
  assert.equal(isTrackPath("/akinevz/tracks"), false);
  assert.equal(isTrackPath("/akinevz/comments"), false);
  assert.equal(isTrackPath("/akinevz2/track"), false);
});

test("titleFromPath derives the last path segment", () => {
  assert.equal(titleFromPath("/akinevz/microtonal-vudoo"), "microtonal-vudoo");
});

test("buildTracks deduplicates resources and maps them into soundcloud URLs", () => {
  const tracks = buildTracks([
    { link: { value: "/akinevz/track-one" } },
    { link: { value: "/akinevz/track-one" } },
    { link: { value: "/akinevz/track-two" } },
    { link: { value: "/akinevz/sets/mixtape" } },
  ]);

  assert.deepEqual(tracks, [
    {
      path: "/akinevz/track-one",
      title: "track-one",
      url: "https://soundcloud.com/akinevz/track-one",
    },
    {
      path: "/akinevz/track-two",
      title: "track-two",
      url: "https://soundcloud.com/akinevz/track-two",
    },
  ]);
});

test("extractTrackPathsFromHtml finds valid track links and drops reserved routes", () => {
  const html = `
    <a href="/akinevz/track-one">track</a>
    <a href='/akinevz/likes'>likes</a>
    <a href="/akinevz/track-two?si=abc">track two</a>
    <a href="/akinevz/sets/mix">set</a>
    <a href="/akinevz/track-one">duplicate</a>
  `;

  assert.deepEqual(extractTrackPathsFromHtml(html), [
    "/akinevz/track-one",
    "/akinevz/track-two",
  ]);
});

/*
  Maintenance plan to avoid breakage:

  1. Start with intent:
    Define exactly what changed in SoundCloud behavior (path format, reserved routes,
    payload shape, or URL generation).

  2. Update implementation first:
    Change generator logic in scripts, keeping URL/path constants centralized.

  3. Update test fixtures as a set:
    Keep `parseOutput`, `isTrackPath`, `buildTracks`, and HTML extraction fixtures aligned
    so they all describe the same account/path contract.

  4. Cover edge cases explicitly:
    Preserve negative checks for reserved routes and non-matching profile handles.

  5. Validate in order:
    Run this file directly first, then full `npm test` to catch cross-file fallout.

  6. Ship with evidence:
    In PR notes, include one example input and output URL/path to show the new contract.
*/