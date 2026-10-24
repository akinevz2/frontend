import assert from "node:assert/strict";
import { test } from "node:test";
import { isMutablePath } from "../scripts/mutable-assets.mjs";

test("blog post artifacts are mutable, so new posts are never drift", () => {
  // posts at the blog root and in subdirectories
  assert.equal(isMutablePath("blog/new-post.md"), true);
  assert.equal(isMutablePath("blog/random/google.md"), true);
  // post attachments
  assert.equal(isMutablePath("blog/P5kKjYA.png"), true);
  assert.equal(isMutablePath("blog/exhausted.txt"), true);
  // non-ASCII post filenames survive path checks
  assert.equal(isMutablePath("blog/рунисч-глоссарий.md"), true);
  // embedded post documents
  assert.equal(isMutablePath("stories/1.md"), true);
});

test("blog pages are not hand-listed anymore", () => {
  // generated pages (blog.html, webuser/index.html, ...) are auto-marked
  // mutable via dist/.generated.json, emitted by routeSkeletonsPlugin —
  // see test/route-skeletons.test.js
  assert.equal(isMutablePath("blog.html"), false);
  assert.equal(isMutablePath("webuser/index.html"), false);
});

test("LFS and self-referential artifacts are mutable", () => {
  // LFS: digest depends on whether the checkout smudged the pointer
  assert.equal(isMutablePath("dist.7z"), true);
  // rewritten on every build by write-dist-checksums.mjs itself
  assert.equal(isMutablePath("documents/drift-report.json"), true);
});

test("vite-emitted bundles are mutable (rebuild noise)", () => {
  // hashed names + chunk hashing/module ordering vary between rebuilds
  assert.equal(isMutablePath("assets/index-D4oX1XA7.js"), true);
  assert.equal(isMutablePath("assets/index-8bBd-nO8.css"), true);
  assert.equal(isMutablePath("assets/toastify-DVtug25g.css"), true);
});

test("stable non-blog artifacts are not mutable", () => {
  assert.equal(isMutablePath("configs.html"), false);
  assert.equal(isMutablePath("spinner.svg"), false);
  // public/-copied css lands at the dist ROOT, not in assets/ — only
  // vite-emitted bundles under assets/ are mutable.
  assert.equal(isMutablePath("loading.css"), false);
});
