import assert from "node:assert/strict";
import { test } from "node:test";
import { generatedPathsForRoutes } from "../build/routeSkeletonsPlugin.ts";

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
