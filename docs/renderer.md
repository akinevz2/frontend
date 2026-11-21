# `src/renderer` — the content-to-rendered-output package

One package under one name owns everything about turning content into
rendered output: include resolution, the static snapshot and the prerender
(`docs/LEARNING_PLAN.md` §3). The sources were relocated with `git mv`, one
commit per move; `src/seo/` no longer exists.

## What lives here

| module                   | role                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `includes/paths.ts`      | include-path validation (pure; disk-side guarantees live in the `read` backend)                                                     |
| `includes/mdSection.ts`  | THE single mdSection (both former copies deleted); Phase 2 adds the hint:/advice:/ref: nesting here                                 |
| `includes/resolve.ts`    | the shared include resolver: directive discovery, target parsing, tree expansion — one implementation for the app and the prerender |
| `snapshot/snapshot.tsx`  | the static snapshot renderer (SSR only)                                                                                             |
| `snapshot/prerender.tsx` | build-time content assembly for the snapshot pages (SSR only; loaded via `build/prerenderServer.ts`)                                |
| `sources/collect.ts`     | node-only fs walks (blog/learning trees) and the disk `read` backend of include discovery                                           |
| `meta/seo.ts`            | shared head-meta / JSON-LD helpers (was `src/lib/seo.ts`)                                                                           |

## Entrypoints (the boundary)

- **`src/renderer/index.ts`** — browser-safe only. The pure include
  machinery and the meta helpers. Imported by the app (`src/content`,
  `src/shell`). Must never import or re-export fs / SSR / node-only code.
- **`src/renderer/node.ts`** — node-only (fs walks). Imported by the
  `build/*` shims and node tests. Never part of the browser bundle.

No other import of a `src/renderer/**` path is allowed. Two node:tests
enforce this (`test/renderer-boundary.test.js`):

1. a specifier scan over every source outside the package fails on any
   deep import;
2. the import closure of `src/main.tsx` (the browser bundle) must never
   reach `src/renderer/sources/`, `src/renderer/node.ts`, or any `node:*`
   module.

`build/` keeps only thin vite-plugin shims
(`routeSkeletonsPlugin.ts`, `prerender.ts`, `prerenderServer.ts`, `meta.ts`,
`sitemap.ts`, `routes.ts`, the two virtual-module plugins) that import from
the package. No logic is duplicated across the boundary.

## Includes (reference-driven)

An include directive `{ "include": "<public path>" }` in a content JSON
embeds another public file as a Section: `.json` targets are parsed
Sections, `.md` targets are wrapped by `mdSection` (an optional leading
`# Heading` names the window; the stem otherwise does). Targets may chain
through `.json` files.

The build (`build/contentTargetsPlugin.ts`, virtual module
`virtual:content-targets`) scans the directive strings found in
`src/content/**/*.json` and inlines exactly the targets they name —
transitively. There is **no directory list, no allowlist, no scan of
`public/`, no registry**: a directive pointing at a brand-new file under
`public/` resolves with no other config edit, and a dangling path fails the
build, naming the including file and the path. Cycles are broken by the
seen-set (as before).

The prerender expands blog-tree directives through the same shared
resolver, discovering targets the same way from the sources it walks
(`sources/collect.ts`).

Rules for edits:

- Node-only code (`node:fs`) is confined to `sources/collect.ts`.
- `git mv` so history follows the files; one commit per move; each commit
  builds.
- The historical SEO docs (`docs/deprecated/seo-findings.md`,
  `docs/deprecated/seo-verification.md`) are left as written.
