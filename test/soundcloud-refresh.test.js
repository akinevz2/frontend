import assert from "node:assert/strict";
import { test } from "node:test";
import { snapshotsMatch } from "../scripts/refresh-soundcloud.mjs";

const snapshot = (stamp, extra = {}) => ({
  generatedAt: stamp,
  source: "https://soundcloud.com/akinevz",
  trackCount: 1,
  tracks: [{ owner: "akinevz", path: "/akinevz/roam", title: "Roam" }],
  profiles: [{ owner: "akinevz", trackCount: 1 }],
  ...extra,
});

test("a refresh that only stamps a new generatedAt is treated as unchanged", () => {
  // The core no-op case: same track list, new timestamp — discard the write.
  assert.equal(
    snapshotsMatch(
      snapshot("2026-10-27T21:16:00Z"),
      snapshot("2026-10-28T08:00:00Z"),
    ),
    true,
  );
});

test("a changed discography is never treated as unchanged", () => {
  const fresh = snapshot("2026-10-28T08:00:00Z");
  // a new upload
  assert.equal(
    snapshotsMatch(
      snapshot("2026-10-27T21:16:00Z"),
      snapshot("2026-10-28T08:00:00Z", {
        trackCount: 2,
        tracks: [
          ...snapshot("").tracks,
          { owner: "akinevz", path: "/akinevz/outer", title: "Outer" },
        ],
      }),
    ),
    false,
  );
  // a rename moves the permalinks and titles
  const renamed = snapshot("2026-10-28T08:00:00Z");
  renamed.tracks[0].title = "Roam (remastered)";
  assert.equal(
    snapshotsMatch(snapshot("2026-10-27T21:16:00Z"), renamed),
    false,
  );
  // metadata the script emits also counts
  assert.equal(
    snapshotsMatch(
      snapshot("2026-10-27T21:16:00Z"),
      snapshot("2026-10-28T08:00:00Z", { asOfUploadingTrackCount: 94 }),
    ),
    false,
  );
});

test("nothing on disk (missing or unparseable file) always counts as changed", () => {
  assert.equal(snapshotsMatch(null, snapshot("2026-10-27T21:16:00Z")), false);
  assert.equal(
    snapshotsMatch(undefined, snapshot("2026-10-27T21:16:00Z")),
    false,
  );
  assert.equal(
    snapshotsMatch("not an object", snapshot("2026-10-27T21:16:00Z")),
    false,
  );
});
