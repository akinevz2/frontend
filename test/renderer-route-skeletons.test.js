import assert from "node:assert/strict";
import { test } from "node:test";
import { generatedPathsForRoutes } from "../build/routeSkeletonsPlugin.ts";
import {
  generatedBlogPaths,
  injectSnapshot,
  mergeGeneratedPaths,
  snapshotFor,
} from "../build/prerender.ts";

const routes = [
  { path: "/", title: "home", description: "d" },
  { path: "/blog", title: "blog", description: "d" },
  { path: "/resume", title: "resume", description: "d" },
  { path: "/webuser", title: "webuser", description: "d" },
  { path: "/projects/webuser", title: "webuser", description: "d" },
];

// resume.html is hand-written in public/ and wins over the generated sibling
const publicSiblingExists = (slug) => slug === "resume";

test("every route generates a page pair, auto-marked mutable", () => {
  const generated = generatedPathsForRoutes(routes, publicSiblingExists);
  // route pages: <slug>/index.html plus <slug>.html for static hosts
  assert.ok(generated.includes("webuser/index.html"));
  assert.ok(generated.includes("webuser.html"));
  assert.ok(generated.includes("projects/webuser/index.html"));
  assert.ok(generated.includes("blog/index.html"));
  // root index.html and sitemap.xml are always generated
  assert.ok(generated.includes("index.html"));
  assert.ok(generated.includes("sitemap.xml"));
});

test("a hand-written public/<slug>.html suppresses the generated sibling", () => {
  const generated = generatedPathsForRoutes(routes, publicSiblingExists);
  assert.ok(generated.includes("resume/index.html"));
  assert.ok(!generated.includes("resume.html"));
});

test("generated paths are unique and deterministically sorted", () => {
  const generated = generatedPathsForRoutes(routes, publicSiblingExists);
  assert.equal(new Set(generated).size, generated.length);
  assert.deepEqual(generated, [...generated].sort());
});

/* ---- blog page path registration (build/prerender.ts) ---- */

test("each blog page registers a dir index and an html sibling", () => {
  const paths = generatedBlogPaths(
    [{ path: "/blog/random" }, { path: "/blog/releases/dotfiles_1_0_0" }],
    () => false,
  );
  assert.deepEqual(paths, [
    "blog/random.html",
    "blog/random/index.html",
    "blog/releases/dotfiles_1_0_0.html",
    "blog/releases/dotfiles_1_0_0/index.html",
  ]);
});

test("a hand-written public sibling suppresses the blog html twin", () => {
  const paths = generatedBlogPaths(
    [{ path: "/blog/random" }],
    (p) => p === "/blog/random",
  );
  assert.deepEqual(paths, ["blog/random/index.html"]);
});

test("blog paths merge into the single generated manifest list", () => {
  const merged = mergeGeneratedPaths(
    generatedPathsForRoutes(routes, publicSiblingExists),
    generatedBlogPaths([{ path: "/blog/random" }], () => false),
  );
  assert.ok(merged.includes("blog/random.html"));
  assert.ok(merged.includes("index.html"));
  assert.deepEqual(merged, [...merged].sort());
});

/* ---- snapshot injection (build/prerender.ts) ---- */

test("snapshot injection fills the empty root div exactly", () => {
  const html = `<html><body><div id="root"></div><script></script></body></html>`;
  const injected = injectSnapshot(html, "<main>hello</main>");
  assert.ok(injected.includes(`<div id="root"><main>hello</main></div>`));
  assert.equal(injected.split("<div").length - 1, 1);
});

test("snapshot injection is a no-op without the empty root div", () => {
  const html = `<div id="root">something</div>`;
  assert.equal(injectSnapshot(html, "<main>x</main>"), html);
});

test("snapshotFor matches normalized paths and misses aliases", () => {
  const pages = [{ path: "/projects/x", html: "<main>x</main>" }];
  assert.equal(snapshotFor(pages, "/projects/x"), "<main>x</main>");
  assert.equal(snapshotFor(pages, "projects/x"), "<main>x</main>");
  assert.equal(snapshotFor(pages, "/projects/y"), undefined);
});
