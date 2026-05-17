import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTracks,
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
  assert.equal(isTrackPath("/someone-else/track"), false);
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