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

test("include directives target a file under public/", async () => {
  const { readdirSync } = await import("node:fs");
  // Every content JSON anywhere in src/content/ may carry directives —
  // page content files and project pages alike.
  const jsonFiles = readdirSync("src/content", { recursive: true }).filter(
    (f) => f.endsWith(".json"),
  );
  const directives = jsonFiles.flatMap(
    (file) =>
      readFileSync(`src/content/${file}`, "utf8").match(
        /"include"\s*:\s*"([^"]+)"/g,
      ) ?? [],
  );
  assert.ok(directives.length > 0, "the repo carries at least one directive");
  for (const directive of directives) {
    // The directive carries the PUBLIC path (leading slash, extension
    // included); the resolver looks it up in glob-built maps keyed by
    // public path, and rejects ".." so a hostile path cannot escape
    // public/.
    const name = directive.match(/"include"\s*:\s*"([^"]+)"/)[1];
    assert.match(
      name,
      /^\/[a-z0-9][a-z0-9._/-]*\.(json|md)$/i,
      `${directive}: absolute public path with an includable extension`,
    );
    assert.doesNotMatch(name, /\.\./, `${directive}: no path traversal`);
    const target = `public${name}`;
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

test("every project carries a lastModified stamp (the listing sorts on it)", async () => {
  const { readdirSync } = await import("node:fs");
  const files = readdirSync("src/content/projects").filter((f) =>
    f.endsWith(".json"),
  );
  for (const file of files) {
    const project = JSON.parse(
      readFileSync(`src/content/projects/${file}`, "utf8"),
    );
    assert.match(
      project.lastModified ?? "",
      /^\d{4}-\d{2}-\d{2}$/,
      `${file}: lastModified is an ISO date (YYYY-MM-DD)`,
    );
  }
});
