# `src/renderer` — the content-to-rendered-output package

Everything about turning content into rendered output lives here: include
resolution, the static SEO snapshot and the prerender. The affected sources
were relocated here (git mv, one commit per move) rather than patched in
place — see `docs/LEARNING_PLAN.md` §3 and `docs/learning-findings.md`.

## Who imports what

**The only import targets from outside the package:**

- `src/renderer/index.ts` — browser-safe only: the pure include resolver
  (`includes/*`), the meta helpers (`meta/seo.ts`). Imported by the app
  (`src/content`, the shell). Must NEVER import or re-export fs / SSR /
  node-only code.
- `src/renderer/node.ts` — node-only: `sources/collect.ts` (fs walks).
  Imported by `build/*` shims and node tests. Never part of the browser
  bundle.

A boundary test (`test/renderer-boundary.test.js`) fails on any other
import of a `src/renderer/**` path, and a second test asserts the import
closure of `src/main.tsx` never reaches `sources/` or `node:*` modules.

## Layout

```
includes/   paths.ts      include-path validation (pure)
            mdSection.ts  the single mdSection (both old copies deleted)
            resolve.ts    shared resolver: discovery, parse, expansion
snapshot/   snapshot.tsx  the static snapshot renderer (SSR only)
            prerender.tsx build-time content assembly (SSR only)
sources/    collect.ts    node-only fs walks (blog/learning trees)
meta/       seo.ts        shared head-meta / JSON-LD helpers
```

## Rules

- `build/` keeps only thin vite-plugin shims that import the two
  entrypoints. No logic is duplicated across the boundary.
- Node-only code (`node:fs`) is confined to `sources/collect.ts`; the
  browser bundle never reaches it.
- Includes are reference-driven: the build discovers targets from the
  directive strings found in content — there is no directory list, no
  allowlist, no scan of `public/`, and no registry (see
  `includes/resolve.ts` and `build/contentTargetsPlugin.ts`).
