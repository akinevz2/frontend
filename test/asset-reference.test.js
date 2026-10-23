import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalizeAssetRefs,
  isCanonicalizablePath,
} from "../scripts/asset-reference.mjs";

test("strips Vite content hashes from hashed asset references", () => {
  const build = (hashes) => `<html><head>
  <script type="module" crossorigin src="/assets/index-${hashes.index}.js"></script>
  <link rel="modulepreload" crossorigin href="/assets/markdown-${hashes.markdown}.js">
  <link rel="stylesheet" crossorigin href="/assets/index-${hashes.index}.css">
</head></html>`;

  // Two builds whose bundles rehashed but whose authored content is identical
  // must canonicalize to the same text.
  const first = build({ index: "C-jayB4T", markdown: "4zwTcHc2" });
  const second = build({ index: "z86-hiKg", markdown: "DKJpDlSZ" });
  assert.equal(canonicalizeAssetRefs(first), canonicalizeAssetRefs(second));
  assert.notEqual(first, second);
});

test("hashes in asset names are stripped, the extension is kept", () => {
  assert.equal(
    canonicalizeAssetRefs('href="/assets/chunk-Ab12Cd34.js"'),
    'href="/assets/chunk.js"',
  );
  assert.equal(
    canonicalizeAssetRefs('href="/assets/index-Ab12Cd34.css"'),
    'href="/assets/index.css"',
  );
});

test("non-hashed and non-asset references are left untouched", () => {
  const page = `<a href="/blog/random/google.md">doc</a>
  <link rel="canonical" href="https://akinevz.com/configs.html">
  <img src="/blog/P5kKjYA.png">
  <script src="https://example.com/lib.js"></script>`;
  assert.equal(canonicalizeAssetRefs(page), page);
});

test("hyphenated asset names canonicalize correctly", () => {
  assert.equal(
    canonicalizeAssetRefs('src="/assets/react-core-9sdj916r.js"'),
    'src="/assets/react-core.js"',
  );
});

test("only HTML paths are canonicalized for drift comparison", () => {
  assert.equal(isCanonicalizablePath("configs/index.html"), true);
  assert.equal(isCanonicalizablePath("blog/random/google.md"), false);
  assert.equal(isCanonicalizablePath("assets/index-Ab12Cd34.js"), false);
});
