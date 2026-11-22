# learning — verification log

Commands actually run on the `learning` branch, with their literal
output, plus the UI-string list §7.1 requires. The static architecture
constraints are lint rules (eslint.config.js — Phase 3.5); behavioural
coverage is in `test/`.

## Gates

### `npm run typecheck`

    > website-xp-phone@2.7.0 typecheck
    > tsc --noEmit && tsc -p tsconfig.node.json --noEmit

(no output — clean)

### `npm run lint`

prettier reformat list (all `unchanged`) and **0 errors, 0 warnings**
with the Phase 3.5 rules active: renderer boundary, node-builtin
confinement, learningStorage purity, history-write confinement.

### `npm test`

    # tests 127
    # pass 127
    # fail 0

Coverage by area:

- renderer includes: discovery, dangling paths, transitive json,
  STRICT path containment (symlink file/dir escape, raw traversal,
  validator shapes)
- renderer boundary: the transitive browser-closure walk (the
  per-file boundary scan is a lint rule now)
- renderer meta: Person/software/TechArticle JSON-LD, sameAs present
  in content
- md lesson convention: prefixes (case-insensitive, ref: → reference),
  plain headings stay prose, fenced code never scanned, deeper hints
  nest, same/shallower ends a hint, anchors, base mdSection untouched
- learning storage: fake Storage round-trip, throwing storage,
  corrupt/malformed payloads, per-route keys, withoutEntry, raised,
  summonPosition (side opposite, clamp, z-stack), clampEntry,
  keyStep (16/64px), keyboardMove
- lesson summon DOM flow (jsdom): trigger click → prompt (heading
  named) → OK summons the SAME window node (no duplicate), persisted;
  Escape dismisses + persisted; arrow keys move 16px through the
  store, persisted; non-movement keys inert

### `npm run build`

    ✓ built in ~0.8s

lesson page emitted at `dist/learning/lesson-template/index.html` with
TechArticle JSON-LD and `data-kind="hint"` in the raw HTML; non-study
routes byte-identical vs the seo-prerender baseline (verified after
Phase 2; the only diffs were the intentional instagram-handle pages).

### `node scripts/learning-summon.manual.mjs`

    ok - reduced-motion: the summon slide is disabled under prefers-reduced-motion
    ok - stacked layout: summoned positions are ignored at the mobile breakpoint
    ok - no slide for restored hints (.summon-restore)
    all CSS checks passed

(the source-level guarantees are lint rules; the pointer-drag items and
the full 19-point interactive checklist print with the script.)

## UI strings (§7.1: every string, for author review)

| String                                                                                          | Where                                                       |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `it looks like you're reading about {hint heading}. would you like a hint?`                     | Clippy prompt body (§7.1 default copy)                      |
| `OK` / `Cancel`                                                                                 | Clippy prompt buttons                                       |
| `Close`                                                                                         | summoned window's ✕ (aria-label)                            |
| `arrow keys move this window 16 pixels, or 64 pixels with Shift held; press Escape to close it` | title bar aria-describedby movement instructions (§7.4)     |
| `lesson unavailable` / `Failed to load the lesson at {path}: {message}`                         | runtime lesson-fetch failure window                         |
| `no lessons yet — the route is a stub`                                                          | /learning landing with zero lessons                         |
| `learning of kine` / `{name} \| learning of kine`                                               | route + lesson titles (pages.json, resolveRoute, prerender) |
| `{name} — a lesson from the learning of kine.`                                                  | lesson meta description                                     |

## Copy that looks unverifiable (listed only, never edited)

- the prompt copy is the plan's default ("final copy is the author's
  call" — §7.1); flagging it for a read-through.
- `learning of kine` mirrors the blog's `blog of kine` convention —
  invented by analogy, not specified verbatim anywhere.
- the drag-hint instructions text is new (§7.4 requires the text to
  exist but does not write it).

## Post-review revisions (author feedback, post-Phase 4)

- **Roaming space = the viewport, not the lesson container** (revises
  §7.3/§7.4): the container clamp made the popups nearly immovable.
  Summoned windows are now `position: fixed`, clamped to the viewport
  alone, and stay put while the page scrolls. The zig-zag side decision
  still reads the lesson layout; persistence stays the same key/shape,
  restores clamp against the viewport.
- **Deterministic entrance** (revises §7.2's "enters from the side
  opposite the column"): fresh summons rest at the page CENTRE and
  enter from offscreen below, crossing the bottom edge — the crossing
  point offset to the mouse's x when a mouse is present (a
  non-orthogonal path), straight up otherwise. Dismiss → re-summon can
  no longer wander.
- **✕ fix**: the drag controller used to capture the pointer on ANY
  title-bar pointerdown — including the close button's press — so the
  button never received its click. A pointerdown on a control
  (`button, a, input, select, textarea`) is now never a drag start
  (regression-tested).
- **Focus-return fix**: the recorded trigger element goes stale across
  summon/dismiss cycles (React re-creates the anchor's DOM node);
  `refocusTrigger` now falls back to the fragment-convention query.
- **Lesson fold**: ✕/minimize on a lesson's top-level windows
  navigates to /learning (the store's onLeave mechanism, like blog
  posts and projects) — author request.
