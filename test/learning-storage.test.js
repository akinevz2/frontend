/** The summon persistence logic against a FAKE Storage (docs/
 * LEARNING_PLAN.md §8 Phase 3 acceptance): round-trips, throwing
 * storage, corrupt JSON, malformed entries, clamping, dismissal. */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampEntry,
  learningKey,
  raised,
  readSummoned,
  summonPosition,
  withoutEntry,
  writeSummoned,
} from "../src/lib/learningStorage.ts";
import { keyStep, keyboardMove } from "../src/window/summonDrag.ts";

/** A Map-backed fake Storage. */
const fakeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => void map.clear(),
  };
};

/** A fake Storage whose every method THROWS (quota, privacy mode). */
const throwingStorage = () => ({
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("quota");
  },
});

test("the storage key is learning:<route path>", () => {
  assert.equal(
    learningKey("/learning/vim-motions"),
    "learning:/learning/vim-motions",
  );
});

test("a summon round-trips through storage", () => {
  const storage = fakeStorage();
  const entries = [{ id: "its-hint", x: 10, y: 20, z: 1 }];
  assert.equal(writeSummoned("/learning/a", entries, storage), true);
  assert.deepEqual(readSummoned("/learning/a", storage), entries);
  // per-route keys
  assert.deepEqual(readSummoned("/learning/b", storage), []);
});

test("unreadable/absent storage reads as nothing summoned", () => {
  assert.deepEqual(readSummoned("/x", undefined), []);
  assert.deepEqual(readSummoned("/x", throwingStorage()), []);
  assert.equal(writeSummoned("/x", [], throwingStorage()), false);
});

test("corrupt JSON and wrong shapes read as []", () => {
  for (const raw of [
    "{not json",
    JSON.stringify({ v: 2, summoned: [] }),
    JSON.stringify({ summoned: [] }), // no v
    JSON.stringify({ v: 1 }), // no summoned
    JSON.stringify({ v: 1, summoned: "no" }),
    JSON.stringify({ v: 1, summoned: [{ id: 5, x: 0, y: 0, z: 1 }] }),
    JSON.stringify({ v: 1, summoned: [{ id: "a", x: "x", y: 0, z: 1 }] }),
    JSON.stringify({ v: 1, summoned: [{ id: "a", x: NaN, y: 0, z: 1 }] }),
    JSON.stringify({ v: 1, summoned: [null] }),
  ]) {
    const storage = fakeStorage();
    storage.setItem(learningKey("/x"), raw);
    assert.deepEqual(readSummoned("/x", storage), [], raw);
  }
});

test("partial entries keep their valid siblings", () => {
  const storage = fakeStorage();
  storage.setItem(
    learningKey("/x"),
    JSON.stringify({
      v: 1,
      summoned: [{ id: "good", x: 1, y: 2, z: 3 }, { junk: true }],
    }),
  );
  assert.deepEqual(readSummoned("/x", storage), [
    { id: "good", x: 1, y: 2, z: 3 },
  ]);
});

test("withoutEntry removes exactly the dismissed id", () => {
  const entries = [
    { id: "a", x: 0, y: 0, z: 1 },
    { id: "b", x: 5, y: 5, z: 2 },
  ];
  assert.deepEqual(withoutEntry(entries, "a"), [{ id: "b", x: 5, y: 5, z: 2 }]);
  assert.deepEqual(withoutEntry(entries, "zzz"), entries);
});

test("raised stacks the raised entry above all others", () => {
  const entries = [
    { id: "a", x: 0, y: 0, z: 3 },
    { id: "b", x: 1, y: 1, z: 7 },
    { id: "c", x: 2, y: 2, z: 2 },
  ];
  const { entries: next, top } = raised(entries, "c");
  assert.equal(top, 8);
  assert.deepEqual(next.find((e) => e.id === "c")?.z, 8);
  assert.deepEqual(next.find((e) => e.id === "b")?.z, 7);
});

test("summonPosition enters from the side OPPOSITE the trigger's column", () => {
  const container = { width: 1000, height: 800 };
  const hint = { width: 300, height: 200 };
  // trigger on the LEFT half → hint enters from the RIGHT edge
  const fromRight = summonPosition(
    { left: 10, top: 100, width: 50, height: 20 },
    container,
    hint,
    [],
  );
  assert.equal(fromRight.x, 1000 - 300 - 16);
  // trigger on the RIGHT half → hint enters from the LEFT margin
  const fromLeft = summonPosition(
    { left: 900, top: 100, width: 50, height: 20 },
    container,
    hint,
    [],
  );
  assert.equal(fromLeft.x, 16);
  // vertically beside the trigger, clamped inside the container
  assert.equal(fromRight.y, 100 + 10 - 100);
  const low = summonPosition(
    { left: 10, top: 790, width: 50, height: 20 },
    container,
    hint,
    [],
  );
  assert.equal(low.y, 800 - 200);
});

test("summonPosition z-stacks above the existing summons", () => {
  const position = summonPosition(
    { left: 0, top: 0, width: 10, height: 10 },
    { width: 1000, height: 800 },
    { width: 300, height: 200 },
    [{ id: "a", x: 0, y: 0, z: 4 }],
  );
  assert.equal(position.z, 5);
});

test("clampEntry pulls restores back inside the container", () => {
  assert.deepEqual(
    clampEntry({ id: "a", x: 5000, y: -20, z: 1 }, { maxX: 320, maxY: 100 }),
    { id: "a", x: 320, y: 0, z: 1 },
  );
  // degenerate container (0 room): pinned to the origin, never negative
  assert.deepEqual(
    clampEntry({ id: "a", x: 50, y: 50, z: 1 }, { maxX: 0, maxY: 0 }),
    { id: "a", x: 0, y: 0, z: 1 },
  );
});

/* ------------------------------------------------- dragging (§7.4) */

test("keyStep maps the four arrows, 16px or 64px with Shift", () => {
  assert.deepEqual(keyStep("ArrowLeft", false), { dx: -16, dy: 0 });
  assert.deepEqual(keyStep("ArrowRight", false), { dx: 16, dy: 0 });
  assert.deepEqual(keyStep("ArrowUp", false), { dx: 0, dy: -16 });
  assert.deepEqual(keyStep("ArrowDown", false), { dx: 0, dy: 16 });
  // Shift: 64px steps
  assert.deepEqual(keyStep("ArrowRight", true), { dx: 64, dy: 0 });
  assert.deepEqual(keyStep("ArrowUp", true), { dx: 0, dy: -64 });
  // everything else is not a movement key
  assert.equal(keyStep("Escape", false), undefined);
  assert.equal(keyStep("Enter", true), undefined);
});

test("keyboardMove shifts x/y, keeps z", () => {
  assert.deepEqual(
    keyboardMove({ id: "a", x: 100, y: 50, z: 3 }, { dx: -16, dy: 64 }),
    { x: 84, y: 114, z: 3 },
  );
});
