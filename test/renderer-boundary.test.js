import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/* The package boundary (docs/LEARNING_PLAN.md §3, docs/renderer.md):
 *
 *  - exactly TWO import targets from outside src/renderer: the
 *    browser-safe `src/renderer/index.ts` and the node-only
 *    `src/renderer/node.ts` — any deeper import fails;
 *  - the import closure of src/main.tsx (the browser bundle) never
 *    reaches src/renderer/sources, src/renderer/node.ts, or any
 *    `node:*` module.
 *
 * Both checks are specifier scans over the import/export statements of
 * every .ts/.tsx/.js/.mjs outside src/renderer (plus build/, scripts/,
 * test/). A specifier scan is enough per §3. */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_DIRS = ["src", "build", "scripts", "test"];
const EXTS = ["", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", "/index.ts"];

function* filesUnder(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      yield* filesUnder(full);
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
      yield full;
    }
  }
}

function sourceFiles() {
  const out = [];
  for (const dir of SOURCE_DIRS) {
    for (const file of filesUnder(path.join(root, dir))) {
      const rel = path.relative(root, file);
      if (rel.startsWith("src/renderer")) continue; // inside the package
      out.push(rel);
    }
  }
  return out;
}

const SPEC_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

function specifiersOf(text) {
  const specs = [];
  for (const match of text.matchAll(SPEC_RE)) specs.push(match[1]);
  return specs;
}

/** The renderer file a specifier names, or null when it names none. */
function rendererFileOf(specifier) {
  if (!specifier.includes("renderer")) return null;
  let rel;
  if (specifier.startsWith("@/")) {
    rel = path.join("src", specifier.slice(2));
  } else {
    const index = specifier.indexOf("src/renderer");
    if (index === -1) return null;
    rel = specifier.slice(index);
  }
  for (const ext of EXTS) {
    const candidate = rel + ext;
    if (
      candidate === "src/renderer/index.ts" ||
      candidate === "src/renderer/node.ts"
    ) {
      return candidate;
    }
  }
  // a renderer specifier that is NOT one of the two entrypoints
  return "src/renderer/<deep-import>";
}

test("nothing outside src/renderer deep-imports the package", () => {
  const violations = [];
  for (const file of sourceFiles()) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    for (const spec of specifiersOf(text)) {
      const target = rendererFileOf(spec);
      if (!target) continue;
      if (
        target !== "src/renderer/index.ts" &&
        target !== "src/renderer/node.ts"
      ) {
        violations.push(`${file}: ${spec}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

/* ---- the browser bundle's import closure ---- */

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
