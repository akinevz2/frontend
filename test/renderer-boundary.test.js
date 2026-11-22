import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/* The package boundary (docs/LEARNING_PLAN.md §3, docs/renderer.md):
 *
 *  - the specifier half — "nothing outside src/renderer deep-imports
 *    the package (only index.ts / node.ts)" — lives in LINT now
 *    (eslint.config.js, no-restricted-imports; Phase 3.5): it runs on
 *    every save and every lint pass, so it is not duplicated here.
 *  - THIS FILE keeps the one check lint cannot do: the transitive
 *    import-closure walk of src/main.tsx — reachability through
 *    re-exports and dynamic imports is a graph property, not a
 *    per-file pattern.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXTS = ["", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", "/index.ts"];

const SPEC_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

function specifiersOf(text) {
  const specs = [];
  for (const match of text.matchAll(SPEC_RE)) specs.push(match[1]);
  return specs;
}

/** Resolves a specifier to a repo-relative source file, or null for
 * virtual modules, styles and bare packages. */
function resolveSpecifier(fromFile, specifier) {
  if (
    specifier.startsWith("virtual:") ||
    specifier.startsWith("node:") ||
    /\.(css|svg|png|jpg|ogg|wav|mp3)$/.test(specifier) ||
    specifier === "xp.css" ||
    specifier.startsWith("xp.css/")
  ) {
    return null;
  }
  let base;
  if (specifier.startsWith(".")) {
    base = path.normalize(path.join(path.dirname(fromFile), specifier));
  } else if (specifier.startsWith("@/")) {
    base = path.join("src", specifier.slice(2));
  } else if (specifier.startsWith("@content/")) {
    base = path.join("src/content", specifier.slice("@content/".length));
  } else if (specifier.startsWith("@public/")) {
    return null;
  } else {
    return null; // bare package (react, react-router-dom, ...)
  }
  for (const ext of EXTS) {
    const candidate = base + ext;
    try {
      if (fs.statSync(path.join(root, candidate)).isFile()) return candidate;
    } catch {
      /* try the next extension */
    }
  }
  return null;
}

test("src/main.tsx's import closure stays out of the node side of the package", () => {
  const seen = new Set();
  const queue = ["src/main.tsx"];
  const violations = [];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (
      file.startsWith("src/renderer/sources") ||
      file === "src/renderer/node.ts"
    ) {
      violations.push(`browser closure reaches ${file}`);
      continue;
    }
    const text = fs.readFileSync(path.join(root, file), "utf8");
    for (const spec of specifiersOf(text)) {
      if (spec.startsWith("node:")) {
        violations.push(`${file}: imports ${spec}`);
        continue;
      }
      const resolved = resolveSpecifier(file, spec);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  assert.deepEqual(violations, []);
  assert.ok(seen.size > 10, "the closure was actually walked");
});
