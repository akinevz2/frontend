# PLAN — Choose-Your-Own-Adventure content for the website

Status: **PROPOSAL — open questions at the bottom must be settled before implementation.**
Goal: a "choose-your-own-adventure" specification layered on the existing
`sections.json` architecture, able to express tutorial pages / games with
procedural learning material and dynamic page content at varying levels of
hand-holding.

---

## 1. What exists today (constraints we build on)

- Content is the window-tree: `Section = { heading?, content?, link?, theme?,
  anchor?, ... }`, `Item = string | Section | Embed | Banner | IncludeRef`.
  Content files are plain JSON (`sections.json`, `*.json` under
  `public/includes/`) or markdown wrapped by `mdSection`.
- Includes are resolved **at build time** (`build/includesPlugin.ts` walking
  `public/includes/` and `public/blog/releases/`), expanded recursively in
  `src/content/index.ts`. Cycles are broken by a seen-set; unknown directives
  throw at module load.
- Routes are declared in `pages.json` (`Route = { path, title, page, ... }`).
- The site is a React (vite) SPA; sections render as nested "windows" with
  themes. There is no state, no routing-parameters, no procedural content
  today — everything is static after build.

Implication: static JSON gives us the **story graph**, but "dynamic events"
need a runtime layer the site currently doesn't have. That's the core design
discussion.

## 2. Proposed model: story graph + runtime state

### 2.1 New content shape (static, build-time — fits current architecture)

A new includable content file type, e.g. `public/includes/*.cya.json`
(registration widens `includesPlugin.ts` **only for `.cya.json`** to avoid
inlining blog posts):

```jsonc
{
  "type": "cya",
  "title": "Learning Make, step by step",
  "start": "intro",
  "nodes": {
    "intro": {
      "heading": "what is a Makefile",
      "content": [ "a Makefile is...", { "heading": "example", "content": "..." } ],
      "choices": [
        { "label": "I'm brand new — walk me through it", "goto": "walkthrough" },
        { "label": "I know the basics — quiz me",        "goto": "quiz" }
      ]
    },
    "quiz": {
      "heading": "question 1",
      "content": ["what does .PHONY do?"],
      "choices": [
        { "label": "declares targets not backed by files", "goto": "correct",
          "event": { "score": "+1" } },
        { "label": "marks files as dirty", "goto": "hint-1", "event": { "attempt": "+1" } }
      ]
    }
    // ...
  }
}
```

Key points:

- A CYO page is **one route** with internal navigation (choices swap the
  visible node), so it composes with `pages.json` exactly like any other page.
  Alternative (each node = its own route) is rejected: it fights the window
  tree, the sitemap, and the include system; see §5.
- Nodes are `Section`-shaped, so all existing rendering, themes, embeds,
  banners work unchanged inside a node.
- **Procedural learning material**: nodes may reference *generators* instead
  of literal content (§3), so one node can render parameterized exercises
  (random values, randomized answer order, generated code samples).

### 2.2 Runtime layer (the new part)

A small state machine module (`src/lib/cya/`):

- **Story state**: `currentNode`, visited set, counters/flags from `event`
  payloads (e.g. `score`, `attempt`, `unlocked:xyz`). Persisted in
  `sessionStorage` (per-visit) — maybe `localStorage` opt-in for progress.
- **Choice evaluation**: a `goto` may be conditional (`when`) on state,
  enabling branching by performance ("if score < 2, reroute to recap").
- **Dynamic events**: `event` payloads are declarative ops, evaluated at
  runtime: `{ "score": "+1" }`, `{ "flag": "saw-intro" }`, `{ "shuffle": ["a","b"] }`.
  This is the piece to *discuss in detail* — see §5 Q2.

## 3. Procedural content / levels of hand-holding

Hand-holding is expressed as **node variants selected by state**, plus
generators:

- **Scaffold levels**: a node may declare `variants: [ { when: "handhold=full",
  content: [very detailed...] }, { when: "handhold=light", content: [...] } ]`.
  A choice ("more detail please / I got it, move on") mutates `handhold`
  — the reader controls their own level mid-reading, per topic.
- **Generators**: `{ "generate": "arithmetic", "seed": "random", "params": {...} }`
  resolved at render time by a small registry of TS generator functions
  (`src/lib/cya/generators/`). Deterministic-per-seed so a "show this again"
  reproduces the same exercise. Start with a tiny library (fill-in-the-blank,
  multiple-choice-from-facts, code-template substitution); authors can add
  generators as TS files — the JSON stays declarative.
- **Adaptive rerouting**: `when` conditions on choices/variants use the state
  flags, so wrong answers route to hints (more hand-holding), right answers
  progress (less).

## 4. Implementation steps (once open questions are settled)

1. Schema: `CyaStory`, `CyaNode`, `CyaChoice`, `CyaEvent`, `CyaCond` in
   `src/content/schema.ts`; validation in the includes plugin (throw loudly
   on bad graphs: dangling `goto`, unreachable nodes, missing `start`).
2. `build/includesPlugin.ts`: register `.cya.json` files.
3. Runtime: `src/lib/cya/` — reducer for state, `<CyaView>` component
   rendering current node as a normal Section tree + choices; story entry
   section type so it can be placed in `sections.json` like an embed.
4. Generators registry + 2–3 seed generators.
5. Build-time **graph linter** (node: all `goto` targets resolve; warn on
   dead ends without `end: true`).
6. Content: one tutorial pilot (e.g. a "learning Make" or vim story) as
   proof-of-concept; iterate on authoring ergonomics.
7. Tests: state machine unit tests (vitest, the repo already has `test/`).

Estimated shape: schema+plugin ~small; `cya/` runtime a few hundred lines;
the long tail is authoring content and tuning the hand-holding UX.

## 5. OPEN QUESTIONS — to discuss before coding

1. **State persistence**: session only, or saved progress across visits
   (localStorage)? Affects "resume your tutorial" UX and privacy.
2. **Dynamic event semantics**: should events be purely declarative ops in
   JSON (safe, limited — my recommendation: start here), or should authors
   be able to attach small TS hooks for arbitrary logic? Declarative covers
   scoring/flags/shuffling; arbitrary logic is power with a security and
   review cost. A middle path: declarative ops + escape hatch generators
   written in TS (code lives in the repo, not the JSON).
3. **Routing**: one route per story with internal state (proposed), or
   hash-per-node (`/cya/make-tutorial#quiz`) for linkable mid-story state?
   Hash nodes are bookmarkable/shareable at the cost of serialization work.
4. **Where do stories live**: `public/includes/*.cya.json` (reuses include
   registration) vs a dedicated `src/content/stories/` directory imported
   directly. The include route keeps "one file = standalone page" semantics;
   the src route avoids bundle inlining concerns.
5. **Hand-holding granularity**: per-story, per-chapter, or per-node
   (`handhold` flag scoped where)? Per-node is most flexible but needs UI
   affordance for the reader to change level at any point.
6. **Procedural scope for v1**: is randomized quiz content enough, or is
   full text generation in scope? Full generation is a much bigger project.
7. **Analytics**: do we want to record which branches readers take (the
   site appears self-hosted; a tiny endpoint would inform content tuning)?
   Optional, deferrable.
