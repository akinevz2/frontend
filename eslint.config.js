import js from "@eslint/js";
import tseslint from "typescript-eslint";

/* Phase 3.5 (docs/LEARNING_PLAN.md): the ARCHITECTURE constraints that
 * used to live as grep/scan tests or manual-script checks are enforced
 * HERE, in lint, where they run on every save and every CI pass:
 *
 *  - the src/renderer package boundary: nothing outside the package
 *    deep-imports it — only index.ts (browser-safe) and node.ts
 *    (§3; replaces test/renderer-boundary.test.js's specifier scan);
 *  - node builtins confined to src/renderer/sources/collect.ts
 *    (§3; the browser-closure test keeps the transitive check);
 *  - learningStorage purity: sessionStorage only — no localStorage,
 *    no cookies, no network (§7.3; replaces the manual script's check);
 *  - history writes confined to src/lib/history.ts (§7.2: summoned
 *    hints add no history entries and nothing to the address bar).
 *
 * BEHAVIOURAL properties (storage round-trips, throwing/corrupt
 * storage, the summon DOM flow, the md convention, fs containment)
 * are NOT lintable — they keep their tests. */

export default tseslint.config(
  { ignores: ["dist", ".astro"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
    },
    plugins: {},
    rules: {},
  },
  {
    // The renderer package boundary (§3): outside src/renderer, only
    // the two entrypoints may be imported. Gitignore-style patterns:
    // any specifier with a `renderer` path segment is flagged unless
    // it names exactly index.ts or node.ts.
    files: [
      "src/**/*.{ts,tsx}",
      "build/**/*.ts",
      "scripts/**/*.mjs",
      "test/**/*.{js,mjs}",
    ],
    ignores: ["src/renderer/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/renderer/**",
                "!**/renderer/index.ts",
                "!**/renderer/node.ts",
              ],
              message:
                "the renderer package is importable ONLY through " +
                "src/renderer/index.ts (browser-safe) or " +
                "src/renderer/node.ts (node-only) — docs/renderer.md §Entrypoints",
            },
          ],
        },
      ],
    },
  },
  {
    // Node builtins stay inside sources/collect.ts (§3: "node:fs is
    // confined to sources/collect.ts") — the rest of the package must
    // stay browser-safe.
    files: ["src/renderer/**/*.{ts,tsx}"],
    ignores: ["src/renderer/sources/collect.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*"],
              message:
                "node builtins live ONLY in src/renderer/sources/collect.ts " +
                "(docs/LEARNING_PLAN.md §3) — everything else in the " +
                "package is part of the browser bundle",
            },
          ],
        },
      ],
    },
  },
  {
    // learningStorage purity (§7.3): sessionStorage only — no
    // localStorage, no cookies, no network, no analytics.
    files: ["src/lib/learningStorage.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message:
            "summon persistence is sessionStorage ONLY " +
            "(docs/LEARNING_PLAN.md §7.3)",
        },
        {
          name: "fetch",
          message: "summon persistence performs no network access (§7.3)",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "document",
          property: "cookie",
          message: "no cookies (docs/LEARNING_PLAN.md §7.3)",
        },
      ],
    },
  },
  {
    // The lesson summon flow adds NO history entries and nothing to
    // the address bar (§7.2) — history mutations are confined to
    // src/lib/history.ts, the one module that owns them.
    files: [
      "src/window/LessonSummon.tsx",
      "src/window/summonFocus.ts",
      "src/pages/LessonPage.tsx",
      "src/pages/LearningPage.tsx",
      "src/lib/learningStorage.ts",
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "history",
          property: "pushState",
          message:
            "the summon flow adds no history entries (§7.2) — history " +
            "writes belong to src/lib/history.ts",
        },
        {
          object: "history",
          property: "replaceState",
          message:
            "the summon flow never touches the address bar (§7.2) — " +
            "history writes belong to src/lib/history.ts",
        },
      ],
    },
  },
);
