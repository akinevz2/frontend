# Phase 0 findings — the learning section

Read-only phase. Every claim in `docs/LEARNING_PLAN.md` §2 was re-read from the
working tree of branch `learning` (cut from `seo-prerender`). Findings 1–6 map
to the six deliverables in the feature request.

---

## 1. Verification of §2, claim by claim

### Window gating — VERIFIED

- `src/window/Window.tsx:87` — `const showContent = expanded || Boolean(node.link);`
- `src/window/Window.tsx:96-99` — children (`node.children`, `node.columns`)
  render only inside `showContent && ...` guards. A collapsed link-less window
  does not mount its children.
- `src/window/state.tsx:70-73` (comment on `initialFlags`), `:88-92`,
  `:112-114` — permalink logic assumes and enforces "a collapsed parent never
  mounts its target": reveals open the whole `lineage(id)` before the target
  (`src/window/state.tsx:165-176`, `:349-360` in `useReveal`).

### Window store — VERIFIED (one nuance)

- `src/window/state.tsx:34` — `type State = Record<string, WindowFlags>` with
  the reducer at `:39-48` over `{ expanded, minimized, closed, maximized }`
  (declared `:27-32`).
- `src/window/state.tsx:77-122` — `initialFlags` seeds from the URL: `?post=`
  slug for blog posts (`:258-264`), `#tree-index` hash elsewhere (`:265-266`),
  off-site bookmark fallback (`:267`).
- **Nuance, not an error:** "The DOM id of a window is its model id" holds for
  inline windows (`src/window/Window.tsx:387`,
  `id={maximized ? undefined : node.id}`) — but a MAXIMIZED window temporarily
  has no DOM id. Summoned hints are non-modal and never maximized, so the
  fragment-link trigger design is unaffected.

### Signals — VERIFIED exactly

`src/lib/signals.tsx:21-108`: 15 named signals, decomposing as the plan says:

| category            | signals                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7 commands          | `app:navigate` (:22), `window:maximize` (:53), `window:dismiss` (:60), `window:minimize` (:75), `window:reveal` (:83), `history:anchor` (:91), `history:remember` (:103) |
| 1 refusable request | `window:close` (:38, `refuse()` in payload)                                                                                                                              |
| 6 notices           | `page:loaded` (:23), `page:navigated` (:24), `page:returned` (:28), `page:addressed` (:37), `clippy:hid` (:43), `window:closed` (:49)                                    |
| 1 retained store    | `window:hidden` (:104-107, seeded in `RETAINED` :124-127)                                                                                                                |

No new signal names may be added (§9.3); Phase 3 needs none (see §2 below).

### Markdown pipeline — VERIFIED (empirically, this tree)

`src/lib/markdown.tsx:17-26` (`MdBase` / `markdownPlugins`: remarkBreaks,
remarkGfm, rehypeRaw, rehypeYoutubeEmbed, rehypeHighlightSubset,
rehype-sanitize with `src/lib/sanitizeSchema.ts`). Re-run through the exact
plugin order on this tree (default `rehype-sanitize` import, as the app and
`test/highlight.test.js:8` use):

- `<details>`, `<summary>`, and the `open` attribute survive
  (`details`/`summary` are in `defaultSchema.tagNames`; `open` is a global
  allowed attribute in the default schema).
- `data-*` attributes are stripped (`data-x="1"` on `<summary>` and on `<p>`
  disappears); `<script>` is stripped too.
- element ids get the `user-content-` prefix (`id="s1"` → `id="user-content-s1"`).

**Correction to the plan's wording, not its substance:** the `user-content-`
prefix and the stripping are the behaviour of the _installed_ rehype-sanitize
default schema — the local `src/lib/sanitizeSchema.ts:16-36` only adds
`iframe`, `style`/`loading` on `img`, and `className` on `code`/`span` on top
of it. The schema file itself contains no details/summary/open/data logic;
the plan reads as if the additions were local. Behaviour is as claimed.

**Consequence for `kind`:** the plan renders `kind` as `data-kind` from a
Section field in React (`data-*` set programmatically bypasses the markdown
sanitizer entirely, since it is not authored raw HTML) — confirmed feasible;
no sanitizer change needed.

### mdSection — VERIFIED, both copies

- `src/content/index.ts:68-84` — `mdSection` peels only the leading `# `
  heading (skipping blank lines), falls back to the humanized stem, and
  returns the rest as one markdown string in `content`.
- `src/seo/prerender.tsx:148-173` — a mirrored copy (`stemOf`, `humanize`,
  `mdSection`); its own comment at `:142-146` says it "Mirrors
  src/content/index.ts's include expansion".

### Includes today — VERIFIED

- `build/includesPlugin.ts:28` — `const INCLUDE_DIRS = ["", "blog/releases"];`
- `:34-65` — `listIncludes` reads the two directories with
  `readdirSync(..., { withFileTypes: true })` and `entry.isFile()` only:
  **non-recursive**, exactly as claimed.
- `:69-95` — the walk is inlined into the `virtual:content-includes` module
  (`JSON.stringify(includes)` at `:84`), so every scanned file is embedded in
  the JS bundle; typing at `src/virtual.d.ts:31-38`; consumer
  `src/content/index.ts:4`.
- `build/blogSources.ts:5,57` — imports `listIncludes` from the plugin.
- `src/content/index.ts:39-47` (comment), `:103-122` (`includeTarget` throws
  on unknown directives at module load), `:137-142` — cycles broken by a
  seen-set (`ancestors`) tracking the inclusion chain.
- `src/seo/prerender.tsx:175-230` — the mirrored expansion in the prerender
  (see above).

### Blog precedent — VERIFIED

- `build/blogDirsPlugin.ts:30-71` — `listBlogDirs` walks `public/blog/` and
  emits **names only** (`files` and `dirs` string arrays, `:44-57`); served as
  `virtual:blog-dirs` (`:73-99`); typing `src/virtual.d.ts:5-14`; consumer
  `src/content/blogDirs.ts:1`.
- `src/pages/BlogPostPage.tsx:44-62` — `.json` posts fetched at runtime:
  `fetch(`${pathname}.json`)` at `:48`; `.md` posts embed `<path>.md`
  (`:30-36`).
- `build/routeSkeletonsPlugin.ts:84-86` — the prerender walks the same tree
  through `collectBlogEnv()` → `collectBlogSources()`
  (`build/blogSources.ts:17-51`, recursive fs walk).

### Prerender — VERIFIED

- `build/routeSkeletonsPlugin.ts:62-166` — `closeBundle` writes one
  `index.html` per route with per-route head (`withRouteMeta`, `:93`) and the
  static snapshot injected into `<div id="root">` (`injectSnapshot`, `:96`);
  blog pages get the same treatment (`:117-134`); the snapshots render
  through a temporary Vite SSR server (`createSeoServer`, `:78-89`).
- `src/main.tsx:2,41` — `createRoot`, no hydration; the app replaces the
  snapshot subtree.
- `build/routeSkeletonsPlugin.ts:26-41` — `generatedPathsForRoutes`;
  `:148-163` — writes `dist/.generated.json` (merged with
  `generatedBlogPaths`). The checksums gate consumes it:
  `scripts/write-dist-checksums.mjs:42` reads `.generated.json` to auto-mark
  generated artifacts as mutable. `public/checksums.txt` is committed
  (`scripts/write-dist-checksums.mjs:7`) and must not be hand-edited.

### Clippy — VERIFIED (detail in finding 2 below)

- `public/Clippy.png` exists (23152 bytes).
- `src/lib/clippy.ts`, `src/lib/clippyRules.ts`, `src/shell/Clippy.tsx`; the
  `clippy:hid` signal is dispatched from the ✕-parks-window easter egg at
  `src/window/Window.tsx:369-379` and handled in `src/lib/clippy.ts:223`
  (`offer`).

### Collision to avoid — VERIFIED

`public/` contains no `learning/` directory today; `public/learning/index.html`
would collide with the generated `dist/learning/index.html` (the generator
writes `<slug>/index.html` for every route,
`build/routeSkeletonsPlugin.ts:104-105`). The landing is a `pages.json` route
(currently absent from `src/content/pages.json` — Phase 2 adds `/learning`).

### Tooling — VERIFIED

- `package.json:27` — `"test": "node --import tsx --test"` (node:test); the
  runner's default glob covers `test/*.test.js` (the manual script
  `test/seo-boot.manual.mjs` is not matched because it lacks the `.test.`
  name — browser-dependent scripts belong in `scripts/` regardless).
- `package.json:33` — CI runs `check:lockfile && build:gated &&
verify:policy`; `package.json:19` — `build:prep` is the forbidden
  network/refresh path; deploy builds run `build` + `checksums`
  (`:18-19`), which are fs-only and side-effect-free.

**Result: every §2 claim is confirmed; two wording-level corrections above
(the sanitize schema's provenance, the maximized-window id nuance).**

---

## 2. How Clippy works today, and how the summon dialogue reuses it

### Today's machinery

Three pieces, cleanly separated:

1. **`src/lib/clippy.ts` — the state singleton and gestures.** A module-scope
   `ClippyState` (`visible`, `bubble`, `saysNo`, `listOpen`, `offering`,
   `:21-42`) with `subscribeClippy` / `getClippyState` (`:50-54`) — a
   plain external store, consumed by `src/shell/Clippy.tsx:23-26` via
   `useSyncExternalStore`. `sessionStorage` key `kroflmao_ui_var`
   (`:14,46`) remembers visibility. `attachClippy()` (`:220-236`) installs
   the global listeners:
   - the typed trigger word (`clippyRules.ts:34-38`) and the tap-to-summon
     blip (`:103-127`);
   - the refusable `window:close` handler `onCrunchy` (`:213-217`) — while
     the bubble is up, Clippy vetoes closes;
   - the `clippy:hid` handler (`:223`) — the post-park pipe-up
     (`offer`, `:149-156`).
2. **`src/shell/Clippy.tsx` — the mascot.** Rendered once from
   `src/shell/App.tsx:65`, it shows `<img src="/Clippy.png">`
   (`:225-226`), is corner-draggable with a click/drag threshold
   (`:17,67-120`), and renders the unhide list from the retained
   `window:hidden` roster (`:30`, `useSignalValue`).
3. **The window-side hook.** While Clippy is on screen (`getClippyState().visible`),
   ✕ parks the window instead of navigating:
   `src/window/Window.tsx:373-379` — `patch(id, { closed: true })` +
   `dispatch("clippy:hid", { id })`. The parked roster is published as the
   retained `window:hidden` signal from `WindowProvider`
   (`src/window/state.tsx:192-199`) and Clippy offers it back via
   `store.restore` (`state.tsx:177`).

The `clippy:hid` signal is a **notice about parked windows**, not a general
"Clippy appeared" channel — Phase 3 must not repurpose it.

### How the summon dialogue reuses it (no fork, no new signals)

- **The mascot is untouched.** `src/shell/Clippy.tsx` keeps the easter egg
  exactly as is. The dialogue is a separate native `<dialog>` owned by the
  lesson page (§7.1), skinned as an XP message box.
- **`public/Clippy.png` is reused directly** by the dialogue (`<img src="/Clippy.png" alt="">`,
  decorative), the same asset the mascot uses — no duplicate art, no new
  component around the mascot.
- **Summoned hints are ordinary windows driven through the existing window
  store.** The dialogue's OK button calls `useWindowStore().patch` /
  `expand` (`src/window/state.tsx:165-176`) on the hint window's id — the
  same mechanism every other inline reveal uses. That is the substantive
  "reuse the machinery": no new window kind, no new signal, no forked
  window tree.
- **No new signal names are needed** (§9.3 satisfied): the dialogue is
  component-local (it lives in the lesson page component, which can hold
  "which trigger link was clicked" as local state), the hint window is
  opened through the store's `patch`, and Escape/focus are plain DOM.
  If a design detail ever seems to demand a new signal — stop and ask, per
  §2.
- **Precedents to copy, not fork:**
  - delegated capture-phase click interception:
    `src/window/state.tsx:428-458` (`useRememberLeave`) — modifier clicks
    and non-left buttons already skip there; the lesson's trigger
    interceptor filters fragment links naming hint ids the same way;
  - the fragment-href render path: `src/lib/markdown.tsx:61-88` leaves
    non-`/`, non-`http` hrefs (i.e. `#hint-slug` fragments) as plain
    `<a href>` — trigger links need no markdown change; with JS the
    delegated handler `preventDefault`s (no history entry), without JS the
    browser jumps to the in-place-rendered hint.

---

## 3. tsconfig changes so `build/` can import `src/renderer/`

Current state:

- `tsconfig.json:34-36` — `"include": ["src"]`; `:30-32` — `paths: { "@/*":
["./src/*"] }`; `moduleResolution: "Bundler"` + `allowImportingTsExtensions`
  (`:12-13`).
- `tsconfig.node.json` extends it but **overrides `"paths": {}`** (`:6`) —
  so `@/*` is unavailable to `build/` (today `build/` imports only
  relatives like `./env.ts`) — and `types: ["node"]` (`:5`) drops
  `vite/client`.

Needed changes (Phase 1):

1. **`tsconfig.node.json` — remove the `"paths": {}` override.** Then
   `build/*.ts` shims can `import { ... } from "../src/renderer/index.ts"`
   (relative import to the package boundary, matching the "only import
   `src/renderer` (index)" rule), and the relocated `src/renderer/**` files
   keep their existing `@/...` internal aliases (`src/seo/prerender.tsx`
   imports `@/content`, `@/pages/*` today and those imports move with the
   file).
2. **`tsconfig.node.json` — add `"vite/client"` to `types`**
   (`"types": ["node", "vite/client"]`). The relocated `src/renderer/`
   code contains `import.meta.glob`/virtual-module consumers
   (`src/content/index.ts:3-4` today) that need the vite ambient types
   under the node config; without it `tsc -p tsconfig.node.json` fails on
   `import.meta`.
3. **`tsconfig.node.json` — `"include": ["vite.config.ts", "build",
"src/renderer", "test"]`** (or leave include as-is and rely on import
   closure — but adding `src/renderer` explicitly makes the node pass's
   coverage of the package deterministic, and `test/` so the renamed
   `test/renderer-*.test.js` files keep checking under the node config where
   their fs imports resolve).
4. **No change to the root `tsconfig.json`** beyond nothing: the app
   config must never pull `src/renderer/sources/collect.ts`'s fs code into
   the browser build. That is enforced by (a) the Phase 1 boundary test
   (specifier scan: nothing outside `src/renderer/` imports anything from
   `src/renderer/**` except the bare `src/renderer` index) and (b) keeping
   the `build/`-side imports node-only. Note the app bundle never type-level
   imports the node sources either — `src/content/index.ts` will import the
   pure resolver (`includes/resolve.ts`) only.

Everything else (`strict`, `verbatimModuleSyntax`,
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) is inherited by
both configs already and applies to the new package unchanged.

---

## 4. Include strategy decision (§4) — evidence

### Which pages use include directives today, and how

Directive syntax: `{ "include": "<public-path>" }` inside a Section's
`content` array (`src/content/schema.ts:14-16`). Three directives exist in
the whole content tree:

| file                                      | directive                                      | target                                           | how it renders                                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/addons.json:104`             | `"include": "/characters.json"`                | `public/characters.json` (a Section; exists)     | `AddonsPage` — a static `src/content` page expanded **synchronously at module load** (`src/content/index.ts:267-270`) and inlined into the app bundle      |
| `src/content/configs.json:28`             | `"include": "/characters.json"`                | same target                                      | `ConfigsPage` — same synchronous path                                                                                                                      |
| `src/content/projects/got-source.json:25` | `"include": "/blog/releases/get-traversal.md"` | `public/blog/releases/get-traversal.md` (exists) | `ProjectPage` for the got-source project — also synchronous: `projects` are expanded at module load (`src/content/index.ts:193-202` via `resolveIncludes`) |

No include directives exist anywhere in `public/blog/**` (grep across
`public/blog/` for `"include"` returns nothing) — blog posts are fetched at
runtime and never carry directives today.

So: **every include consumer today is a static `src/content` page expanded
synchronously at module load and inlined into the JS bundle.** The scanned
targets are all tiny (`public/characters.json` is a small Section;
`get-traversal.md` is a short release note), which is why the bundle
inlining was acceptable.

### Decision

**Recommendation adopted: (b) reference-driven build-time inlining for
static `src/content` pages; (a) async runtime fetch for pages under served
trees (`blog`, future `learning`).**

- Static `src/content` pages (the only include users today) keep their
  synchronous expansion — they are imported eagerly by
  `src/content/index.ts` and must render on first paint without a loading
  state. Inlining **only the referenced targets** (roots = the
  `src/content` imports, resolved through the shared path resolver's
  graph — not a directory list, no `INCLUDE_DIRS`, no scan registry)
  preserves today's bundle behaviour exactly and satisfies the byte-identical
  Phase 1 acceptance.
- Served-tree pages (`/blog/**`, `/learning/**`) never needed inlining:
  `.md` posts already embed by URL (`BlogPostPage.tsx:30-36`) and `.json`
  posts already fetch at runtime (`:44-62`). Lessons follow the same
  runtime-fetch pattern; an included `resources/*.md` inside a lesson is
  resolved by the same memoised `fetch`-backed resolver the lesson uses, so
  one loading state covers the lesson and its includes together.
- The one resolver (`src/renderer/includes/resolve.ts`, pure over a
  `read(path)` function) serves both: disk reads in the prerender, memoised
  fetch in the app. The prerender resolves every route, so a dangling
  include fails the build loudly and can never ship — the app's runtime
  fetch of an already-verified target cannot 404 in practice.

Per §4, **stop and get approval before implementing** — this document is
that decision request.

---

## 5. mdSection nesting design (the `hint:` / `advice:` / `ref:` convention)

One pure module: `src/renderer/includes/mdSection.ts` (both existing copies
deleted; the prerender imports it). Two layers:

### Layer 1 — today's `mdSection(stem, md)` unchanged

`src/content/index.ts:68-84` semantics exactly: strip `\r\n`, peel optional
leading `# Heading` (blank lines allowed before it), humanized-stem fallback,
rest of the file as the `content` markdown string.

### Layer 2 — the nested-section scan (pure, deterministic, unit-tested)

```
parseNestedSections(md: string): Section[]
```

Line walk with a fence-state machine:

- **Fence tracking (how fenced code is skipped):** a line matching
  `/^\s*(`{3,}|~{3,})/`toggles the in-fence state, remembering the fence
character and its length; the fence closes only on a line whose fence run
is the same character and at least as long. Indentation (≤ 3 spaces,
CommonMark) is allowed. While in-fence, **nothing is scanned** — no
heading recognition, no nesting boundaries, and the raw lines pass
through verbatim into whatever Section is being collected. (An inline
code span containing`#`never matches the anchored`^#` heading test, so
  only real fences matter.)
- **Heading recognition:** a line matching
  `/^(#{2,6})\s+(hint|advice|ref)\s*:\s*(.+)$/i` outside any fence opens a
  nested Section:
  - kind = `hint` | `advice` | `reference` (mapping `ref:` → `reference`);
  - heading = the text after the prefix, trimmed (prefix stripped from the
    displayed heading);
  - the Section collects every following line **until the next heading line
    of the same or shallower depth** (or end of input), with the same
    in-fence rule — a `#`-level heading (depth 1) ends any nested section
    since 1 < 2.
- **Recursion:** the collected body is itself scanned, so an `advice:`
  heading inside a `hint:` block nests as a child window (the window model
  already renders nested Sections as nested windows —
  `src/window/model.ts` `buildWindows` / `Window.tsx:42-43`).
- **Non-matching headings and all other text stay prose** in the enclosing
  Section's content, in order.
- **Anchors/ids:** nested windows need no authored anchor — the window tree
  derives ids (`tree-index` form, `src/window/model.ts`), which is the same
  id form trigger links use (§5 of the plan: "the id form the window system
  already uses for permalinks").
- Depth ≥ 2 only (the plan's rule): a `hint:` on an `#` line is not a
  trigger heading and stays prose.

Edge cases pinned by tests (Phase 2): `hint:` inside a fence (must NOT
open a section); a fence inside a hint section (body preserved verbatim,
fence not treated as a boundary); `~~~` fences; `HINT:` uppercase;
`advice : spaced` NOT matching (prefix must be `hint:`/`advice:`/`ref:`
immediately followed by `:`); a deeper-nested heading of the SAME depth as
an outer one closing only the innermost.

---

## 6. Files each later phase touches

Phase boundaries: every phase also passes the §9.4 gates. `git mv` per move;
one commit per move; each commit builds.

### Phase 1 — relocate and remove INCLUDE_DIRS (behaviour-preserving)

| file                                                                                                     | action                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/renderer/index.ts`                                                                                  | new — the only external import target                                                                                                                                                                                                                                                                           |
| `src/renderer/README.md`                                                                                 | new — package overview                                                                                                                                                                                                                                                                                          |
| `src/renderer/includes/resolve.ts`                                                                       | new — shared path resolver (pure over `read`)                                                                                                                                                                                                                                                                   |
| `src/renderer/includes/mdSection.ts`                                                                     | new — the single mdSection (from finding 5, layer 1 only in this phase)                                                                                                                                                                                                                                         |
| `src/renderer/includes/paths.ts`                                                                         | new — path validation rules                                                                                                                                                                                                                                                                                     |
| `src/renderer/snapshot/snapshot.tsx`                                                                     | moved from `src/seo/snapshot.tsx` (git mv)                                                                                                                                                                                                                                                                      |
| `src/renderer/snapshot/prerender.tsx`                                                                    | moved from `src/seo/prerender.tsx` (git mv); mirrored expansion deleted, imports the shared resolver                                                                                                                                                                                                            |
| `src/renderer/sources/collect.ts`                                                                        | moved from `build/blogSources.ts` (git mv), generalised to `blog` + `learning` trees                                                                                                                                                                                                                            |
| `src/renderer/meta/`                                                                                     | new home for `src/lib/seo.ts`'s helpers (decision: yes, move — see note)                                                                                                                                                                                                                                        |
| `build/includesPlugin.ts`                                                                                | deleted                                                                                                                                                                                                                                                                                                         |
| `build/blogSources.ts`                                                                                   | deleted (logic moved to `src/renderer/sources/collect.ts`)                                                                                                                                                                                                                                                      |
| `build/routeSkeletonsPlugin.ts`                                                                          | edited — thin shim importing `src/renderer`                                                                                                                                                                                                                                                                     |
| `build/prerender.ts`, `build/prerenderServer.ts`, `build/meta.ts`, `build/sitemap.ts`, `build/routes.ts` | edited — thin shims importing `src/renderer`                                                                                                                                                                                                                                                                    |
| `src/content/index.ts`                                                                                   | edited — imports the resolver; include expansion at module load now reference-driven                                                                                                                                                                                                                            |
| `src/virtual.d.ts`                                                                                       | edited — `virtual:content-includes` declaration removed (`:26-38`)                                                                                                                                                                                                                                              |
| `tsconfig.json`                                                                                          | unchanged                                                                                                                                                                                                                                                                                                       |
| `tsconfig.node.json`                                                                                     | edited per finding 3                                                                                                                                                                                                                                                                                            |
| `test/seo-*.test.js` (seo-boot.manual.mjs excluded), `test/route-skeletons.test.js`                      | renamed `test/renderer-*.test.js`, imports updated, assertions unchanged                                                                                                                                                                                                                                        |
| `test/renderer-boundary.test.js`                                                                         | new — the specifier-scan boundary test                                                                                                                                                                                                                                                                          |
| `src/lib/seo.ts`                                                                                         | **decision needed:** move to `src/renderer/meta/` (its consumers are `build/meta.ts` and `src/shell/useRouteMeta.ts` — the latter is app-side, so either the helper file stays put or the shell imports the boundary index; recommend moving it and re-exporting app-side imports through `src/renderer` index) |
| `docs/renderer.md`                                                                                       | new — package overview                                                                                                                                                                                                                                                                                          |
| `docs/seo-findings.md`, `docs/seo-verification.md`                                                       | **untouched** (they live in `docs/deprecated/` now)                                                                                                                                                                                                                                                             |
| `scripts/write-dist-checksums.mjs` / `scripts/verify-policy.mjs`                                         | only if the drift gate needs the new tree registered — new generated `learning` paths are auto-marked via `.generated.json` (`:42`), so likely no edit                                                                                                                                                          |

`src/seo/` must not exist afterward. `grep INCLUDE_DIRS virtual:content-includes
listIncludes` must return nothing.

### Phase 2 — content model and static layout

| file                                       | action                                                                                                                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/schema.ts`                    | edited — optional `kind: "hint" \| "advice" \| "reference"` and optional `flow: "diagonal"` fields                                                                                             |
| `src/renderer/includes/mdSection.ts`       | edited — the nesting layer (finding 5)                                                                                                                                                         |
| `src/window/model.ts`                      | at most touched if `kind`/`flow` must ride the WindowNode (window changes limited per §9.3; kind can render from the Section directly)                                                         |
| `src/window/Window.tsx`                    | **not touched in Phase 2** except possibly a `data-kind` passthrough on the window element — keeping within §9.3's "summoned presentation" scope; if a wider change seems needed, stop and ask |
| `src/styles/` (a new or existing file)     | edited — `[data-flow="diagonal"]` CSS on the existing `left:`/`right:` column machinery, mobile breakpoint reuse                                                                               |
| `src/content/pages.json`                   | edited — the `/learning` route added                                                                                                                                                           |
| lesson page component (new, `src/pages/`)  | new — the `/learning` route's page (stub landing, marked as stub)                                                                                                                              |
| `src/shell/App.tsx` / route mapping        | edited — wire the new page (mechanism follows how pages.json routes map to components)                                                                                                         |
| `src/renderer/snapshot/*`                  | edited — lessons render all hints in place in the snapshot                                                                                                                                     |
| `src/renderer/sources/collect.ts`          | edited — walk `public/learning/` too                                                                                                                                                           |
| `src/renderer/meta/` (or `src/lib/seo.ts`) | edited — per-lesson head meta (title, description, canonical, JSON-LD `TechArticle` from file fields only)                                                                                     |
| `public/learning/`                         | new directory; minimal structural fixtures only, placeholders marked as stubs                                                                                                                  |
| `test/renderer-*.test.js`                  | edited/added — the nesting convention tests (fenced code included), snapshot tests for a lesson                                                                                                |

Acceptance: `curl` of a lesson page shows hint text raw; one h1/title/canonical;
trigger links carry real hrefs; non-study routes byte-identical.

### Phase 3 — summon, Clippy, persistence

| file                                                      | action                                                                                                                                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lesson page component                                     | edited — the Clippy dialogue (`<dialog>`), the delegated trigger-link interceptor, the summoned-hint presentation wiring                                                                                    |
| `src/window/Window.tsx`                                   | edited — ONLY the summoned presentation (separate flag from `expanded`, Clippy icon in the title bar, close button, `role="dialog"`, focus/Escape, slide transition with reduced-motion guard) — §9.3 scope |
| `src/window/state.tsx`                                    | at most — the summoned flag rides `WindowFlags` (`:27-32`); no gating change                                                                                                                                |
| `src/window/TitleBar.tsx`                                 | edited — the summoned title bar (Clippy icon, close)                                                                                                                                                        |
| `src/window/window.css` / styles                          | edited — summoned presentation, slide transform                                                                                                                                                             |
| `src/styles/`                                             | edited — the dialogue's XP message-box skin                                                                                                                                                                 |
| persistence module (new, e.g. `src/lib/learningState.ts`) | new — `sessionStorage` `learning:<route path>` read/write, try/catch, fake-Storage testable                                                                                                                 |
| `test/learning-*.test.js`                                 | new — storage logic (throwing storage, corrupt JSON), dialogue DOM tests where jsdom allows                                                                                                                 |
| `scripts/` (new manual script)                            | new — manual browser checks; NOT in `test/`                                                                                                                                                                 |

### Phase 4 — drag

| file                                    | action                                                                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lesson page component / summoned window | edited — pointer events on title bar only, `setPointerCapture`, `touch-action: none`, `--dx`/`--dy` custom properties, clamping, z-raise, persist on drop |
| `src/window/TitleBar.tsx`               | edited — keyboard movement (arrow keys 16px / Shift 64px, `aria-describedby` instructions)                                                                |
| `src/styles/`                           | edited — dragging disabled on the stacked mobile layout                                                                                                   |
| `test/learning-*.test.js`               | added — clamping, keyboard movement, drop-only persistence                                                                                                |

### Every phase may also touch

`docs/renderer.md` (Phase 1+), `docs/learning-verification.md` (commands run
and literal output, plus the UI-string list from Phase 3 onward). Never:
`src/content/**` prose, `public/**` copy, `public/checksums.txt` (hand-edit),
`src/lib/signals.tsx`, window gating, `package.json` / lockfile (§9.2).

---

## Status

Phase 0 complete. Stopping here for review before Phase 1. Decisions that
need approval:

1. **Include strategy (finding 4):** reference-driven inlining for static
   `src/content` pages; runtime fetch for `blog`/`learning` trees. Per §4,
   implementing awaits approval.
2. **`src/lib/seo.ts` destination (finding 6, Phase 1):** recommend
   `src/renderer/meta/` with app-side imports rerouted through the package
   index — flag if you'd rather keep it put.

---

## Addendum — Phase 0 review decisions and their design consequences

Approved with the include strategy settled: **(b) reference-driven
build-time inlining for `src/content` pages, (a) runtime fetch for
`blog`/`learning` trees.** Mechanism (Phase 1) and the two carry-forward
designs below.

### A.1 The include mechanism, exactly (Phase 1)

- `build/contentTargetsPlugin.ts` serves `virtual:content-targets`: a map
  from public path to raw file text, built by scanning only **include path
  strings found in content** — the roots are the `src/content/**/*.json`
  files (the set the app bundles; a fixed content directory, NOT a
  `public/` directory list), and every directive's target is read and,
  if it is a `.json`, scanned for further directives (transitive closure).
  `.md` targets are leaves (today's behaviour: `mdSection` never scans
  markdown for directives). No directory list anywhere: a directive
  pointing at any path under `public/` resolves with no config edit; a
  dangling path throws in the plugin's `load()` and fails the build,
  naming the including file and the path.
- `src/content/index.ts` imports `virtual:content-targets` and expands
  through the shared pure resolver (`src/renderer/includes/resolve.ts`),
  which is the same code the prerender uses — one expansion
  implementation, two `read` backends (the map in the app, disk in
  node).
- Test: `test/renderer-includes.test.js` — (1) a directive pointing at a
  brand-new file under `public/` is discovered and inlined with no other
  config change (the pure `discoverTargets` over fixture texts); (2) a
  dangling path throws with the including file and path named.
- Carry-forward note: lessons (Phase 2) resolve their includes through
  the **same runtime-fetch resolver** and MUST do so _before_ mounting
  `WindowProvider` — its `useReducer` initialiser (`initialFlags`)
  captures window state once, so a window tree that changes shape after
  mount (an include resolving late) would strand flags keyed by ids that
  no longer exist. The lesson page fetches → resolves → renders
  `WindowProvider` with the complete tree.

### A.2 Window ids for kind sections (Phase 2 carry-forward)

Today's window ids are **positional** (`src/window/model.ts:70/101/123`):
`tree-index` chains by order, and only roots honour an authored `anchor`
(`model.ts`, depth 0). A hint section opened by the `hint:` heading
convention sits at an arbitrary nesting depth, so its positional id
depends on document order above it — brittle for `[need a
hint?](#hint-slug)` trigger links that must name a stable target.

Design:

- The nesting parser (finding 5) assigns each kind section a **stable
  slug id**: `hint-<slug>` (also `advice-<slug>`, `ref-<slug>`) where
  `<slug>` is `toSlug(heading-text-after-prefix)`
  (`src/window/state.tsx:210-222`). The parser emits it as the Section's
  `anchor` field.
- `model.ts` honours an authored `anchor` on **kind sections at any
  depth** — the minimal change; all other windows keep positional ids.
  A model-side invariant test pins "an anchored non-root window keeps
  its authored id".
- **Duplicate slugs within one lesson are a build error** (the nesting
  parser throws, naming the file and the duplicated slug), and a
  model-side assertion backs it up.
- The snapshot derives ids from the same `buildWindows` model, so it
  emits the same `hint-<slug>` ids automatically — the static page's
  fragment jump and the interactive trigger agree.
- Trigger links are authored as `[text](#hint-<slug>)`.

### A.3 Summoned hints: a separate flag, a portal layer, inline suppression (Phase 3 carry-forward)

- Summoning must **not** use `expand()`
  (`src/window/state.tsx:167-176`): it opens the whole `lineage(id)`
  inline, which would unfold the lesson's ancestors as a side effect.
  Instead: a new `summoned` flag on `WindowFlags`
  (`src/window/state.tsx:27-32`) applied directly to the hint window's
  own id via `patch(id, { summoned: true })` — no lineage, no ancestors.
- A **portal layer** in the lesson page (`createPortal` to a dedicated
  layer element) reads the window model + store flags and renders every
  summoned hint there, outside the lesson's document flow — the slide-in
  position and the stacked-layout ignore rule (§7.3) live entirely in
  that layer.
- **`kind: hint` children are suppressed inline in the interactive
  app.** The inline rendering of a lesson (the normal `Children` path,
  `src/window/Window.tsx:17-48`) skips kind-carrying child windows
  entirely when not summoned (render nothing, not even a collapsed title
  bar — the hint exists only through the portal). The **snapshot keeps
  rendering them in place** (it walks the model directly and honours no
  flags, `src/renderer/snapshot/snapshot.tsx:173-206`), so crawlers and
  no-JS clients see the full lesson (§5).
- Escape/focus rules of §7.2 attach to the portal-rendered window; the
  inline OK-reveal machinery of ordinary windows is untouched
  (§9.3 scope respected: this is the summoned presentation only).
