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

test("page aliases target an existing route (+optional section anchor)", () => {
  const paths = new Set(pages.map((r) => r.path));
  const anchors = new Set(
    readFileSync("src/content/addons.json", "utf8").match(/"anchor"\s*:\s*"([^"]+)"/g) ?? [],
  );
  for (const route of pages) {
    if (!route.alias) continue;
    const [target, hash] = route.alias.split("#");
    assert.ok(paths.has(target), `${route.path}: alias target ${target} exists`);
    if (hash && target === "/wow" && hash === "addons")
      assert.ok(anchors.size > 0, "wow#addons anchor exists in addons.json");
  }
});

test("every project document is complete and routable", async () => {
  const { readdirSync } = await import("node:fs");
  const files = readdirSync("src/content/projects").filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 0);
  for (const file of files) {
    const project = JSON.parse(readFileSync(`src/content/projects/${file}`, "utf8"));
    for (const key of ["slug", "title", "description", "github"]) {
      assert.equal(typeof project[key], "string", `${file}: ${key}`);
    }
    assert.ok(project.content, `${file}: content`);
    const path = project.path ?? `/projects/${project.slug}`;
    assert.ok(!pages.some((r) => r.path === path), `${file}: path clashes with pages.json`);
  }
});
