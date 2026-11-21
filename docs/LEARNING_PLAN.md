# PLAN — study pages (the "learning" section)

Status: **DIRECTION SETTLED. Start at Phase 0 (read-only) and stop for review.**
Supersedes `CYOA_PLAN.md` (a choose-your-own-adventure graph with quizzes,
events and generators). Delete that file when this plan lands.
Written against branch `seo-prerender` @ `523d060`. Every "what exists" claim
below was read from that tree and must be re-verified in Phase 0.

Goal: static, blog-like study material for developers (why learn vim, how to
rebind a comfortable keymap in VS Code, ...). A lesson is a window. Hints are
windows too: the reader summons one through an inline hyperlink and a Clippy
dialogue, it slides onto the page, and it can be dragged to compare hints or
carry one down the page. Reading-heavy content flows diagonally. No quizzes,
no scoring, no generated content.

---

## 1. Settled decisions (do not re-litigate)

1. **Static and blog-like.** Lessons are authored files in `public/learning/`.
   No quizzes, no scoring, no randomized or generated content, no events /
   reducer / story graph, no `?step=` addressing.
2. **Windows all the way.** Lessons are windows (Section files). Hints,
   advice and references are windows too, summoned (see §7), not `<details>`.
3. **Paths.** Lessons and the landing content live under `public/learning/`;
   reusable objects (shared hints, advice, references) under
   `public/learning/resources/`.
4. **Includes work by file path within `/public` only**, embedding either a
   rendered `.md` or a parsed `.json`. The `INCLUDE_DIRS` mechanism is removed
   entirely: no directory allowlist, no scan registry, no
   `virtual:content-includes` (§4).
5. **One package, `src/renderer/`**, owns include resolution, the static
   snapshot and the prerender. `src/seo/` is renamed away and must not remain
   (§3).
6. **Navigation on study pages is exclusively inline hyperlinks.** No
   next/previous buttons, steppers, tabs, sidebars or per-page tables of
   contents. The site's existing chrome is untouched.
7. **Clippy presents hints.** The summon dialogue is Clippy's, and summoned
   hint windows carry him (§7). Reuse the existing Clippy machinery.
8. **State is innate and automatic.** Lesson state saves on every mutation,
   per session, in `sessionStorage`. No save button, no reset UI, no
   collapse-all / reveal-all control (the interface is one dialogue at a
   time, like XP modals). State is never written to the address bar.
9. **No analytics, no cookies, no cookie banner.** Nothing may obscure the
   first-load screen. Only first-party `sessionStorage` for functional state.
10. **Layout is more dynamic than the rest of the site:** diagonal reading
    flow built on the existing `left:` / `right:` column machinery (§6).
11. **Pinning a hint to follow the scroll is out of scope** (§11).

---

## 2. What exists today (constraints we build on)

Verify each of these in Phase 0 and correct this section if any is wrong.

- **Window gating.** `src/window/Window.tsx` `Body()` renders children only
  when `expanded || Boolean(node.link)`. A collapsed link-less window does not
  mount its children. State and permalink logic assume "a collapsed parent
  never mounts its target". Do not change this gating.
- **Window store.** `src/window/state.tsx`: a reducer over
  `Record<id, { expanded, minimized, closed, maximized }>`, seeded by
  `initialFlags` from the URL (`?post=` on the blog, `#tree-index` elsewhere).
  The DOM id of a window is its model id.
- **Signals.** `src/lib/signals.tsx` has 15 named signals (7 commands, 1
  refusable request, 6 notices, 1 retained store). **Do not refactor it and do
  not add signal names.** If a feature seems to need a new signal, stop and
  ask.
- **Markdown pipeline.** `src/lib/markdown.tsx` (`Md`, `MdBase`) with
  `src/lib/sanitizeSchema.ts`. Verified: `<details>`, `<summary>`, `open`
  survive; `data-*` attributes are stripped; element ids get a
  `user-content-` prefix.
- **`mdSection`** (`src/content/index.ts`) peels only the leading `# heading`
  and returns the rest as a single markdown string. A second, mirrored copy
  lives in `src/seo/prerender.tsx`; its own comment says it mirrors the first.
- **Includes today.** `build/includesPlugin.ts` has
  `INCLUDE_DIRS = ["", "blog/releases"]` (non-recursive), inlines every
  scanned file into the JS bundle and serves it as `virtual:content-includes`.
  `build/blogSources.ts` imports `listIncludes` from it. `src/content/index.ts`
  expands include directives at module load and throws on unknown directives;
  cycles are broken by a seen-set. `src/seo/prerender.tsx` mirrors the
  expansion.
- **Blog precedent.** `public/blog/**` is listed (directories and filenames
  only) by `build/blogDirsPlugin.ts` as `virtual:blog-dirs`; posts are fetched
  at runtime (`fetch(`${pathname}.json`)` in `BlogPostPage`); the prerender
  walks the same tree via `collectBlogSources`.
- **Prerender.** `build/routeSkeletonsPlugin.ts` emits one html file per
  route with per-route head and a static snapshot injected into
  `<div id="root">`; `src/main.tsx` uses `createRoot` (no hydration). Generated
  paths must be registered (`generatedPathsForRoutes` / `.generated.json`) or
  `verify:policy` fails. Do not hand-edit `public/checksums.txt`.
- **Clippy.** `public/Clippy.png`, `src/lib/clippy` (`CLIPPY_LINK`) and the
  `clippy:hid` signal: Clippy parks windows the reader closes (an easter egg).
- **Collision to avoid.** A file `public/learning/index.html` would collide with
  the generated `dist/learning/index.html`. Do not create one. The landing is
  a route in `pages.json`.
- **Tooling.** Tests run with `node --import tsx --test` (node:test, not
  vitest) and `test/` is globbed, so manual or browser-dependent scripts must
  not live in `test/` (put them in `scripts/`). CI runs `build:gated` and
  `verify:policy`. Deploy builds (render.com) must stay cheap and
  side-effect-free.

---

## 3. Package: `src/renderer/`

Everything about *turning content into rendered output* lives in one package
under one name. The affected sources are relocated, not patched in place:

| from | to |
|---|---|
| `build/includesPlugin.ts` (+ its `virtual:content-includes` entry in `src/virtual.d.ts`) | **deleted**; replaced by the path resolver below |
| include expansion inside `src/content/index.ts` | `src/renderer/includes/resolve.ts` (`src/content/index.ts` keeps only content assembly and imports the resolver) |
| both `mdSection` copies | one pure `src/renderer/includes/mdSection.ts` |
| the mirrored include expansion in `src/seo/prerender.tsx` | **deleted**; the prerender imports the shared resolver |
| `src/seo/snapshot.tsx`, `src/seo/prerender.tsx` | `src/renderer/snapshot/snapshot.tsx`, `src/renderer/snapshot/prerender.tsx` |
| `build/blogSources.ts` | `src/renderer/sources/collect.ts`, generalised from "the blog" to a list of served trees (`blog`, `learning`) |
| `src/lib/seo.ts` | decide in Phase 0 (likely `src/renderer/meta/`) |
| `test/seo-*.test.js`, `test/route-skeletons.test.js` | renamed `test/renderer-*.test.js`, imports updated, assertions unchanged |

Target shape:

```
src/renderer/
  index.ts              the ONLY import target from outside the package
  README.md             what it is, who imports it, the boundary rules
  includes/             resolve.ts, mdSection.ts, paths.ts
  snapshot/             snapshot.tsx, prerender.tsx
  sources/              collect.ts   (node-only: fs reads; never imported by the app bundle)
```

Rules:

- `build/` keeps only thin vite-plugin shims (`routeSkeletonsPlugin.ts`,
  `prerender.ts`, `prerenderServer.ts`, `meta.ts`, `sitemap.ts`, `routes.ts`)
  that import from `src/renderer`. No logic is duplicated across the boundary.
- **Boundary test:** a node:test that fails if any file outside `src/renderer/`
  imports a `src/renderer/**` path other than `src/renderer` (index). (A
  specifier scan is enough.)
- Node-only code (`fs`) is confined to `src/renderer/sources/` so the browser
  bundle never reaches it. Confirm in Phase 0 how `tsconfig.json` and
  `tsconfig.node.json` must change to let `build/` import from `src/`.
- Use `git mv` so history follows the files; one commit per move; each commit
  builds.
- `src/seo/` must not exist afterward. Historical docs
  (`docs/seo-findings.md`, `docs/seo-verification.md`) are left as written;
  add `docs/renderer.md` as the package overview.

---

## 4. Includes by path

An include names a public-rooted path, e.g. `/learning/resources/vim-motions.md`.

- **Target forms:** `.md` resolves to `mdSection(stem, text)` (rendered
  markdown); `.json` resolves to a parsed Section. No other extensions.
- **Path rules** (`includes/paths.ts`): leading `/`, normalised, must resolve
  inside `public/`, no `..`, no symlink escape, case-sensitive, no
  directories, no globs.
- **Failures are loud:** an unresolvable path is an error that names the
  including file and the path; the build fails (the prerender resolves every
  route, so a dangling include can never ship). Cycles keep the seen-set
  behaviour and additionally emit a build warning.
- **No registry of any kind:** no directory list, no allowlist, no scan, no
  virtual module. `grep` for `INCLUDE_DIRS` and `virtual:content-includes`
  must return nothing afterward.
- **One resolver** (`includes/resolve.ts`) is pure and parameterised by a
  `read(path)` function: disk reads in the prerender, `fetch` (memoised) in
  the app. The app and the prerender import the *same* module.
- **Phase 0 decides, with evidence, how the app gets includes for pages that
  today expand synchronously at module load** (`src/content/*.json`):
  (a) async runtime fetch with a loading state, or (b) build-time inlining of
  only the *referenced* targets (reference-driven; roots are the `src/content`
  imports, not a directory list). Recommendation: lessons and blog trees use
  (a) like blog posts do today; static `src/content` pages use (b) only if
  they use includes at all. **Stop and get approval before implementing.**

---

## 5. Content model and authoring

- **Lessons:** `public/learning/<slug>.md` or `.json` (a Section).
- **Landing:** a `/learning` route in `pages.json` whose content links to
  lessons with ordinary inline hyperlinks.
- **Reusable objects:** `public/learning/resources/*.md|json`, included by
  path from any lesson. Use the existing include directive shape; document it
  in `docs/renderer.md`.
- **`kind`:** a new optional Section field, `"hint" | "advice" | "reference"`
  (`src/content/schema.ts`), rendered by React as `data-kind` on the window
  element. No sanitizer change is expected because `kind` is a Section field,
  not raw html in markdown. If Phase 0 finds otherwise, stop and ask.
- **Markdown convention** (extension of the single `mdSection`): a heading at
  depth >= 2 whose text starts with `hint:`, `advice:` or `ref:`
  (case-insensitive) opens a nested Section of that kind, containing everything
  up to the next heading of the same or shallower depth; the prefix is stripped
  from the displayed heading. All other headings and text stay prose. Fenced
  code blocks are never scanned for headings. Deterministic and unit-tested.
- **Triggers are ordinary hyperlinks:** `[need a hint?](#hint-slug)`. The href
  is a real fragment URL naming the hint window's id (the id form the window
  system already uses for permalinks).
  - *Without JS and in the static snapshot:* the link jumps to the hint, which
    the snapshot renders in place. Crawlers and unfurlers see the whole lesson.
  - *With JS:* a delegated click handler on the lesson container intercepts
    links whose fragment names a hint on this page, calls `preventDefault`
    (no history entry, no address-bar change) and opens the Clippy dialogue.
    Modified clicks (ctrl/cmd/shift/middle) are not intercepted.
- **Navigation is links only** (see §1.6). Lesson-to-lesson and reference links
  are plain `<a href>` written by the author in prose.

---

## 6. Layout

- A lesson's root Section opts in with an optional `flow: "diagonal"` field.
  Default is today's layout; **non-study pages must not change at all.**
- Pure CSS on `[data-flow="diagonal"]` in `src/styles/`, built on the existing
  `left:` / `right:` column machinery. Sections alternate columns by sibling
  index with a stepped offset, so the reading path runs diagonally down the
  page. It stacks to one column at the existing mobile breakpoint. No JS, no
  per-element inline styles.
- A summoned hint enters from the side opposite the column of the section that
  contains its trigger link, continuing the zig-zag.

---

## 7. Runtime behaviour

### 7.1 The Clippy dialogue

- Native `<dialog>` opened with `showModal()` (free focus trap and Escape),
  skinned as an XP message box. It shows `Clippy.png` beside the text
  (`alt=""`, decorative) with OK and Cancel.
- Default text: "it looks like you're reading about {hint heading}. would you
  like a hint?" (final copy is the author's call; list every UI string in
  `docs/learning-verification.md` for review).
- Cancel / Escape closes it and returns focus to the trigger link. OK closes it
  and summons the hint.
- At most one Clippy dialogue is open at a time. Summoned hint windows are
  non-modal and may coexist so the reader can compare them.
- **Reuse the existing Clippy machinery** (`src/lib/clippy`, `Clippy.png`, the
  `clippy:hid` roster). Phase 0 reports how it works and how to share it. Do
  not fork or duplicate Clippy code, and do not change the existing easter-egg
  behaviour.

### 7.2 The summoned hint window

- An existing window component in a "summoned" presentation (a separate flag
  from `expanded`; the inline OK-button reveal of normal windows is unchanged
  everywhere else). A small Clippy icon sits in its title bar; it has a close
  button.
- `role="dialog"` (non-modal) with `aria-labelledby`. Focus moves into it on
  summon; Escape closes it and returns focus to the trigger link. Summoning an
  already-summoned hint focuses it rather than duplicating it.
- It slides in with a CSS transform transition. Under
  `prefers-reduced-motion: reduce` there is no slide (instant or fade).
- No history entries, nothing in the address bar.

### 7.3 Persistence (automatic, per session)

- `sessionStorage` key `learning:<route path>`:
  `{ "v": 1, "summoned": [{ "id": "...", "x": 0, "y": 0, "z": 1 }] }`.
- Written on mutation (summon, close, drop, raise), never during pointermove.
  Read once at mount; unknown ids are dropped; every access is in try/catch
  (storage can throw, and the page must work without it).
- Persisted hints are re-summoned on mount without animation. Positions are px
  offsets in the lesson container's coordinate space, clamped on restore and
  ignored in the stacked mobile layout.
- No cookies, no `localStorage`, no network, no analytics.

### 7.4 Dragging (Phase 4)

- Pointer events on the title bar only, with `setPointerCapture` and
  `touch-action: none` on title bars only. Position is applied as CSS custom
  properties `--dx` / `--dy` on the window element, so there is no React
  re-render per move. Clamp to the lesson container and viewport. Raise
  z-order on pointerdown. Persist on drop.
- **Keyboard:** with a summoned window's title bar focused, arrow keys move it
  16px (Shift: 64px). State the instructions in the title bar's
  `aria-describedby` text. Escape still closes it.
- Dragging is disabled in the stacked mobile layout.

---

## 8. Phases (each independently shippable; stop for review after each)

**Phase 0 — read-only.** Branch `learning` off `seo-prerender`. No edits.
Write `docs/learning-findings.md`: verify §2 with file:line; report how Clippy
works today; propose the `tsconfig` changes for the new package boundary;
choose the include strategy in §4 with evidence; confirm the `mdSection`
nesting design; list every file the move touches. **Stop.**

**Phase 1 — relocate and remove `INCLUDE_DIRS` (behaviour-preserving).**
Create `src/renderer/` per §3, one commit per move; implement the shared
path resolver; delete `build/includesPlugin.ts`, the virtual module typing and
both mirrored copies; add the boundary test; rename tests.
*Acceptance:* all tests pass; `dist/` html for every existing route is
byte-identical before and after (compare against a build of `seo-prerender`
@ `523d060`, excluding `checksums.txt`, `drift-report.json` and any
mtime-derived `lastmod`); `src/seo/` is gone; `grep` for `INCLUDE_DIRS`,
`virtual:content-includes` and `listIncludes` returns nothing.

**Phase 2 — content model and static layout.** `kind`, the `mdSection`
heading convention, `flow: "diagonal"` CSS, the `/learning` route and a stub
landing, snapshot support for lessons (all hints rendered in place), sitemap
and per-lesson head meta (title, description, canonical; JSON-LD `TechArticle`
using only fields present in the file). Include `public/learning/resources/`
in whatever the prerender walks. Do not write lesson prose; use a minimal
structural fixture under `test/` and mark any placeholder content in `public/`
as a stub.
*Acceptance:* unit tests for the convention (including fenced code); `curl -s`
of the lesson page shows hint text in the raw html; one h1 / title / canonical
per page; no iframe; trigger links have real hrefs; non-study routes
unchanged (re-run the Phase 1 byte comparison).

**Phase 3 — summon, Clippy, persistence.** §7.1 to §7.3.
*Acceptance:* tests for the storage logic against a fake Storage (including
throwing storage and corrupt JSON); DOM tests for the dialogue flow where
jsdom allows; a manual script in `scripts/` (not `test/`) for the rest;
reduced-motion verified; no console errors or React warnings.

**Phase 4 — drag.** §7.4.
*Acceptance:* unit tests for clamping and keyboard movement; dragging inert on
the stacked layout; position persisted on drop only.

---

## 9. Hard constraints for the agent

1. Never edit lesson or site prose. You may add the `/learning` route to
   `pages.json` and a clearly marked stub landing; everything else under
   `src/content/**` and `public/**` copy is the author's.
2. No new dependencies. If one seems necessary, stop and ask.
3. Do not touch `src/lib/signals.tsx`, add signals, or change
   `src/window/Window.tsx` gating. Window changes are limited to the summoned
   presentation and its drag handling.
4. Gates must pass after every phase: `npm run typecheck`, `npm run lint`,
   `npm test`, `npm run build:gated`, `npm run verify:policy`. New generated
   files must be registered or the drift gate fails. `npm run lint` runs
   `prettier --write` over `src/**`; if it touches a file you did not change,
   stop and report.
5. **Forbidden commands:** `npm run build:ready`, `push`, `build:local`,
   `build:prep`, `open`, `refresh:content`, `refresh:soundcloud` (they push to
   main, hit the network or open a browser). Never `git push`; never
   `git add -A` (stage by path).
6. Small commits, one logical step each. Messages: `renderer: <what>` for the
   package and include work, `learning: <what>` for the feature. No squashing.
7. Accessibility is part of "done": focus management, Escape, keyboard
   movement, reduced motion.
8. When anything is ambiguous, stop and ask.

---

## 10. Deliverables

The `learning` branch, `docs/learning-findings.md` (Phase 0),
`docs/renderer.md`, `docs/learning-verification.md` (commands run and their
literal output, plus the UI-string list), and a final message listing: what
changed, what could not be done, decisions that need review, and any copy that
looks unverifiable (list only, never edit).

---

## 11. Deferred / out of scope

- Pinning a hint to follow the scroll (`position: fixed`); revisit after drag
  works.
- Any analytics, quizzes, scoring, generators, collapse-all / reveal-all,
  `localStorage` progress, or per-lesson "resume" UI.
- Refactoring `src/lib/signals.tsx` into notices / stores / commands (a good
  idea for a day when window behaviour changes anyway).
- Confirming third-party embeds use click-to-load and `youtube-nocookie.com`
  (worth a separate check; it is the only real cookie surface on the site).
