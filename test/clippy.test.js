import assert from "node:assert/strict";
import { test } from "node:test";
import { createBurstCounter, createWordMatcher } from "../src/lib/clippy.ts";

test("word matcher fires only on the full word and recovers from typos", () => {
  const match = createWordMatcher("abc");
  const feed = (s) => [...s].map(match).includes(true);
  assert.equal(feed("ab"), false);
  assert.equal(feed("xaabc"), true);
  assert.equal(feed("abc"), true);
});

test("burst counter needs enough clicks inside the window", () => {
  const burst = createBurstCounter(3, 1000);
  assert.equal(burst(0), false);
  assert.equal(burst(500), false);
  assert.equal(burst(900), true);
  assert.equal(burst(5000), false);
  assert.equal(burst(8000), false);
});
