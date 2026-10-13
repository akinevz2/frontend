import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceWord, blipRollMs, createBurstCounter } from "../src/lib/clippyRules.ts";

test("word progress completes only on the full word and recovers from typos", () => {
  const run = (keys) => {
    let progress = 0;
    let done = false;
    for (const key of keys) {
      ({ progress, done } = advanceWord(progress, key, "abc"));
      if (done) return true;
    }
    return false;
  };
  assert.equal(run("ab"), false);
  assert.equal(run("xaabc"), true);
});

test("burst counter needs enough clicks inside the window", () => {
  const burst = createBurstCounter(3, 1000);
  assert.equal(burst(0), false);
  assert.equal(burst(500), false);
  assert.equal(burst(900), true);
  assert.equal(burst(5000), false);
});

test("blip roll grows with active clicking time", () => {
  assert.equal(blipRollMs(0), 120);
  assert.ok(blipRollMs(1800) > blipRollMs(300));
  assert.equal(blipRollMs(99999), 2570);
});
