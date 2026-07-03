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
  "resources": [{ "link": { "value": "/akinevz2/track-one" } }]
}]
trailing logs`,
  );

  assert.equal(Array.isArray(payload), true);
  assert.equal(payload.length, 1);
  assert.deepEqual(payload[0].resources[0].link.value, "/akinevz2/track-one");
});

test("parseOutput rejects output without JSON", () => {
  assert.throws(() => parseOutput("no json payload here"), /does not contain JSON payload/);
});

test("isTrackPath only accepts direct track paths", () => {
  assert.equal(isTrackPath("/akinevz2/track-one"), true);
  assert.equal(isTrackPath("/akinevz2"), false);
  assert.equal(isTrackPath("/akinevz2/sets/mixtape"), false);
  assert.equal(isTrackPath("/akinevz2/likes"), false);
  assert.equal(isTrackPath("/akinevz2/tracks"), false);
  assert.equal(isTrackPath("/akinevz2/comments"), false);
  assert.equal(isTrackPath("/akinevz/track"), false);
});

test("titleFromPath derives the last path segment", () => {
  assert.equal(titleFromPath("/akinevz2/microtonal-vudoo"), "microtonal-vudoo");
});

test("buildTracks deduplicates resources and maps them into soundcloud URLs", () => {
  const tracks = buildTracks([
    { link: { value: "/akinevz2/track-one" } },
    { link: { value: "/akinevz2/track-one" } },
    { link: { value: "/akinevz2/track-two" } },
    { link: { value: "/akinevz2/sets/mixtape" } },
  ]);

  assert.deepEqual(tracks, [
    {
      path: "/akinevz2/track-one",
      title: "track-one",
      url: "https://soundcloud.com/akinevz2/track-one",
    },
    {
      path: "/akinevz2/track-two",
      title: "track-two",
      url: "https://soundcloud.com/akinevz2/track-two",
    },
  ]);
});

test("extractTrackPathsFromHtml finds valid track links and drops reserved routes", () => {
  const html = `
    <a href="/akinevz2/track-one">track</a>
    <a href='/akinevz2/likes'>likes</a>
    <a href="/akinevz2/track-two?si=abc">track two</a>
    <a href="/akinevz2/sets/mix">set</a>
    <a href="/akinevz2/track-one">duplicate</a>
  `;

  assert.deepEqual(extractTrackPathsFromHtml(html), [
    "/akinevz2/track-one",
    "/akinevz2/track-two",
  ]);
});