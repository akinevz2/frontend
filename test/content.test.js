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
    readFileSync("src/content/addons.json", "utf8").match(
      /"anchor"\s*:\s*"([^"]+)"/g,
    ) ?? [],
  );
  for (const route of pages) {
    if (!route.alias) continue;
    const [target, hash] = route.alias.split("#");
    assert.ok(
      paths.has(target),
      `${route.path}: alias target ${target} exists`,
    );
    if (hash && target === "/wow" && hash === "addons")
      assert.ok(anchors.size > 0, "wow#addons anchor exists in addons.json");
  }
});

test("include directives target a file under src/content/includes/", async () => {
  const { readdirSync } = await import("node:fs");
  // Every content JSON anywhere in src/content/ may carry directives —
  // page content files and project pages alike.
  const jsonFiles = readdirSync("src/content", { recursive: true }).filter(
    (f) => f.endsWith(".json") && !f.startsWith("includes/"),
  );
  const directives = jsonFiles.flatMap(
    (file) =>
      readFileSync(`src/content/${file}`, "utf8").match(
        /"include"\s*:\s*"([^"]+)"/g,
      ) ?? [],
  );
  assert.ok(directives.length > 0, "the repo carries at least one directive");
  for (const directive of directives) {
    const name = directive
      .match(/"include"\s*:\s*"([^"]+)"/)[1]
      .replace(/^\/+|\/+$/g, "");
    const stem = name.split("/").pop();
    // Targets are NOT name-joined paths (the resolver looks stems up in
    // glob-built maps, so traversal names simply miss); the test mirrors
    // that: the stem must exist under includes/ as .json or .md.
    const mdPath = `src/content/includes/${stem}.md`;
    let mdExists = false;
    try {
      mdExists = readFileSync(mdPath, "utf8").length > 0;
    } catch {
      /* no markdown variant */
    }
    const target = mdExists ? mdPath : `src/content/includes/${stem}.json`;
    assert.ok(
      readFileSync(target, "utf8").length > 0,
      `include target ${target} exists`,
    );
  }
});

test("every project document is complete and routable", async () => {
  const { readdirSync } = await import("node:fs");
  const files = readdirSync("src/content/projects").filter((f) =>
    f.endsWith(".json"),
  );
  assert.ok(files.length > 0);
  for (const file of files) {
    const project = JSON.parse(
      readFileSync(`src/content/projects/${file}`, "utf8"),
    );
    for (const key of ["slug", "title", "description", "github"]) {
      assert.equal(typeof project[key], "string", `${file}: ${key}`);
    }
    assert.ok(project.content, `${file}: content`);
    assert.equal(
      project.path,
      undefined,
      `${file}: standardised under /projects/${project.slug}`,
    );
    const path = `/projects/${project.slug}`;
    assert.ok(
      !pages.some((r) => r.path === path),
      `${file}: path clashes with pages.json`,
    );
  }
  // every project is also reachable as /<slug> via a generated alias route
  const slugs = files.map(
    (f) => JSON.parse(readFileSync(`src/content/projects/${f}`, "utf8")).slug,
  );
  for (const slug of slugs) {
    assert.ok(
      !pages.some((r) => r.path === `/${slug}`),
      `${slug}: short-hand must not clash with pages.json`,
    );
  }
});
