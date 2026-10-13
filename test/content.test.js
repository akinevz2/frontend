import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pages = JSON.parse(readFileSync("src/content/pages.json", "utf8"));
const registry = readFileSync("src/pages/index.ts", "utf8");

test("every route names a registered page component", () => {
  for (const route of pages) {
    assert.match(registry, new RegExp(`\\b${route.page}\\b`), route.path);
  }
});

test("route paths are unique and a /404 route exists", () => {
  const paths = pages.map((r) => r.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.includes("/404"));
});
