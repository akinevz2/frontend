import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { discoverTargets } from "../src/renderer/index.ts";
import { makeFsReader } from "../src/renderer/node.ts";

/* The include mechanism is reference-driven (docs/LEARNING_PLAN.md §4,
 * docs/learning-findings.md A.1): the registration IS the directive
 * strings found in content — no directory list, no allowlist. So:
 * a directive pointing at a brand-new public file is discovered and
 * inlined with no other config edit, and a dangling path fails loudly,
 * naming the including file and the path. */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(root, "public");

test("a directive at a never-referenced public path is discovered with no config edit", () => {
  // /blog/releases/try_it_out.md exists but no directive references it
  // today — exactly the "brand-new target" shape: discovery must pick it
  // up from the directive string alone.
  assert.ok(fs.existsSync(path.join(PUBLIC, "blog/releases/try_it_out.md")));
  const targets = discoverTargets(makeFsReader(PUBLIC), [
    {
      path: "src/content/fake-root.json",
      text: '{"content":[{"include":"/blog/releases/try_it_out.md"}]}',
    },
  ]);
  assert.ok(targets["/blog/releases/try_it_out.md"]);
  assert.equal(targets["/blog/releases/try_it_out.md"].kind, "md");
});

test("a dangling path fails loudly, naming the including file and the path", () => {
  assert.throws(
    () =>
      discoverTargets(makeFsReader(PUBLIC), [
        {
          path: "src/content/fake-root.json",
          text: '{"content":[{"include":"/does/not/exist.md"}]}',
        },
      ]),
    (error) =>
      /does\/not\/exist\.md/.test(error.message) &&
      /fake-root\.json/.test(error.message),
  );
});

test("discovery is transitive through .json targets", () => {
  const publicDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "opencode-includes-"),
  );
  try {
    fs.writeFileSync(
      path.join(publicDir, "inner.json"),
      '{"content":[{"include":"/leaf.md"}]}',
    );
    fs.writeFileSync(path.join(publicDir, "leaf.md"), "# Leaf\nbody\n");
    const targets = discoverTargets(makeFsReader(publicDir), [
      {
        path: "src/content/root.json",
        text: '{"content":[{"include":"/inner.json"}]}',
      },
    ]);
    assert.deepEqual(Object.keys(targets).sort(), ["/inner.json", "/leaf.md"]);
  } finally {
    fs.rmSync(publicDir, { recursive: true, force: true });
  }
});

test("a target escaping public/ (symlink or traversal) is refused", () => {
  const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-escape-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-outside-"));
  try {
    fs.writeFileSync(path.join(outside, "secret.md"), "no");
    fs.symlinkSync(
      path.join(outside, "secret.md"),
      path.join(publicDir, "escape.md"),
    );
    assert.throws(
      () => makeFsReader(publicDir)("/escape.md"),
      /escapes public/,
    );
  } finally {
    fs.rmSync(publicDir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
