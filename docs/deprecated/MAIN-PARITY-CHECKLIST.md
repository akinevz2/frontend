# Main-branch feature-parity checklist

This is the single progress checklist for restoring the current refactor to
the behavior and appearance of `main`. Use checkboxes to track verified work;
do not mark an item complete based only on code presence.

The refactor is intentionally moving away from the tightly coupled,
unmanageable `Section.tsx` monolith. Restore the user-visible feature set by
composing small, loosely coupled components, hooks, contexts, content
adapters, and testable utilities. Do not recreate a giant section component or
hide multiple feature areas inside a single renderer. Keep feature ownership
clear and test behavior at component and integration boundaries.

## Baseline and guardrails

- Baseline: `origin/main` at `b73ca19b5244c16e21f717aa21af35d690c1370c`.
- Live reference: <https://akinevz.com/>.
- The baseline source layout cited here is the layout at that commit. For
  example, baseline `src/windowing/Section.tsx` is the current branch's
  `src/page/components/hooks.tsx`/window components, not a path expected to
  exist on the refactor branch.
- The current refactor workspace has pre-existing staged, unstaged, deleted,
  and untracked files. Inspect `git status` before every implementation phase.
  Preserve those changes, do not reset/checkout or overwrite them, and do not
  mix unrelated work into parity changes.
- Implement one bounded phase at a time. Do not begin later phases until the
  preceding phase's acceptance checks pass or any blocker is documented.
- Compare actual behavior and rendered output, not merely file names. Some
  old code may have been moved, partially reimplemented, or deliberately
  removed.
- Treat visual parity as a deliverable: capture reference screenshots from
  `main`/the live site and compare at desktop and mobile viewport sizes.
  Record intentional differences and obtain confirmation before keeping them.
- Use existing dependencies and project conventions. Do not add dependencies
  unless an identified behavior cannot reasonably be restored without one.
- Keep security properties at least as strong as baseline, especially
  sanitization and URL validation. Report any incompatible content rather
  than weakening sanitization.
- Preserve modularity: split window controls/state, section rendering,
  markdown, media, addon behavior, routing, and global interactions into
  focused units with explicit inputs and testable contracts. Share small
  utilities where appropriate; avoid coupling page-specific behavior into
  generic window primitives.

## Progress checklist

- [ ] Phase 0: Capture and verify baseline behavior.
- [ ] Phase 1: Restore routes and page metadata.
- [ ] Phase 2: Complete modular window/section behavior.
- [ ] Phase 3: Match the content/section contract.
- [ ] Phase 4: Restore complete primary pages.
- [ ] Phase 5: Restore shell, navigation, and global behaviors.
- [ ] Phase 6: Verify visual and responsive parity.
- [ ] Phase 7: Verify pipeline, production behavior, and closeout.

## Verified inventory

Status labels describe evidence from the baseline source and current worktree:

- **Present**: a matching implementation is visible in current source.
- **Missing**: the baseline capability is not represented in the current
  implementation or its replacement is visibly a placeholder.
- **Incomplete**: a current implementation exists but has stubs or only covers
  part of the baseline behavior.
- **Changed**: the behavior/architecture differs; parity is not established.
- **Uncertain**: source review alone cannot establish live behavior or
  intentionality; verify before changing.

### Routes and page shell

- **Changed — route inventory.** Baseline `pages.json` defines `/`, `/resume`,
  `/addons`, `/sitemap`, `/contact`, `/wow`, `/pagerts`, `/music`, `/blog`,
  and `/404` (baseline `pages.json`, lines 1–78). Current
  `src/content/pages.json` defines `/`, `/contact`, `/wow`, `/characters`,
  `/projects`, `/music`, `/blog`, `/resume`, and `/404`; it lacks `/addons`,
  `/sitemap`, and `/pagerts`, and adds `/characters` and `/projects`
  (`src/content/pages.json`, lines 1–69). Do not conclude a route is actually
  unreachable from the manifest alone; validate it through the current route
  registry and direct navigation.
- **Changed — routing composition.** Baseline `src/App.tsx` owns pathname
  routing, route-specific content, hash handling and global shell
  (`src/App.tsx`, lines 326–345 and 1207–1218). Current `src/Website.tsx`
  renders `PageProvider`, `MenuBar`, and `PageSpace` through providers
  (`src/Website.tsx`, lines 9–17; `src/page/components/PageProvider.tsx`,
  lines 10–49). Verify direct loads, browser history, route fallback, title
  and description updates, and in-page/hash navigation before deciding what
  needs porting.
- **Incomplete — current route data.** Current `pages.json` has `page` and
  `content` fields and some placeholder metadata. Baseline uses a route
  configuration in `src/App.tsx` plus `pages.json`. Confirm page lookup and
  content-loading semantics rather than copying one manifest over the other.
- **Changed — menu policy.** Baseline `src/components/MenuBar.tsx` filters
  hidden items, conditionally exposes sitemap for admin, treats addons,
  resume, and documents specially, supports first-letter keyboard navigation,
  click navigation and Clippy drag/drop (`MenuBar.tsx`, lines 24–83 and
  110–195). Current `src/page/components/menu/MenuBar.tsx` builds links from
  `PageContext` and uses router navigation (`MenuBar.tsx`, inspect current
  file). Parity for keyboard shortcuts, admin visibility, hidden routes,
  menu actions, drag/drop, active-path behavior, and responsive overflow is
  **uncertain** until each is exercised.

### Windows and sections

- **Incomplete — reveal state.** Baseline `src/windowing/Section.tsx`
  separates collapsed content, the OK action, and section primary actions
  (`Section.tsx`, lines 757–846 and 878–1017). Baseline `src/windowing/hooks.ts`
  owns minimize/maximize/close state (`hooks.ts`, lines 13–139). The current
  implementation now has context-backed reveal state and minimize reset in
  `src/page/components/SectionContext.tsx` and `src/page/components/hooks.tsx`;
  it was recently changed, so verify it in a browser. Existing
  `test/window.test.js` checks initial SSR output and `"open"` theme output,
  but does not exercise clicks, nested layers, or minimize.
- **Missing/incomplete — legacy window lifecycle.** Baseline has distinct
  maximize registration, close/minimized tracking and restoration, including
  ancestry-aware restoration (`src/windowing/context.tsx`, lines 4–17;
  `src/windowing/provider.tsx`, lines 4–98; `src/windowing/hooks.ts`, lines
  14–139). Current `useMaximizeHandle` and `useCloseHandle` in
  `src/page/components/hooks.tsx` are stubs; current decorations expose all
  three controls (`src/page/components/window/WindowDecorations.tsx`). The
  current `SectionContext` only tracks collapsed state
  (`src/page/components/SectionContext.tsx`). Port/replace behavior
  intentionally, including whether maximize/close is in scope for each
  window, rather than making decorative buttons appear functional.
- **Missing/incomplete — window presentation behavior.** Baseline `Section`
  supports normal versus plain (`nowindow`) rendering, addon sections, links,
  printouts, external links, permalinks, and special section content
  (`src/windowing/Section.tsx`, lines 350–435, 690–876, 878–1281). The new
  recursive renderer in `src/page/components/hooks.tsx` handles a narrower
  content shape. Audit each baseline branch against the new renderer and
  retain only features that are part of the baseline contract.
- **Changed — section identity/state.** Baseline section metadata includes
  UUID, heading and depth; state tracks expanded sections, minimized sections,
  and maximized windows (`src/windowing/types.ts`, lines 31–49;
  `src/windowing/context.tsx`, lines 4–17). Current metadata is stamped in
  `src/page/components/hooks.tsx` and has `uuid`, `depth`, and `index`;
  current context stores a per-UUID collapse value. Verify stable identity
  through navigation/re-render and any permalink or parent/child behavior.

### Themes, content, and rendering

- **Present but verify parity — `"open"` theme.** Baseline theme engine has a
  force-expanded rule (`src/windowing/themeEngine.ts`, inspect `isForceExpandedTheme`
  and theme registry). Current `src/content/themeEngine.ts` has an open
  definition and `forceExpanded` handling. Current tests cover static open
  rendering, not reset/minimize behavior or theme arrays.
- **Changed — themes and styles.** Baseline includes experimental, centered,
  open, plain/no-window and Clippy/site-wide themes. Current
  `src/content/themeEngine.ts` registers default, experimental, centered, and
  open; current `src/theme.ts` separately contains persisted page-level theme
  behavior. Verify CSS selectors receive their expected classes/data
  attributes and the lilac, border-flash, experimental motion, centered, and
  plain-window effects are preserved.
- **Incomplete/uncertain — Markdown and links.** Baseline `src/App.tsx`
  defines sanitization/plugins, custom markdown components, printout URL
  resolution and special triggers (roughly lines 322–435 and 436–656).
  Current rendering uses `ReactMarkdown`, `rehypeRaw`, and `rehypeSanitize` in
  `src/page/components/hooks.tsx`, with a separate
  `src/page/components/MarkdownContent.tsx`. Compare allowed tags/attributes,
  link targets, iframe attributes, printouts, heading/slug behavior, nested
  markdown, and the original link validation policy. Do not relax sanitization
  to make a test pass.
- **Changed — content schema.** Baseline `src/windowing/types.ts` supports
  typed section content, music tracks, links, printouts, UUID/depth/treeIndex
  (`types.ts`, lines 1–57). Current `src/content/types.d.ts` defines the
  recursive content model, metadata, music and addon extensions. Confirm every
  baseline field has a consumer or document intentional removals; type-check
  the final model.

### Page features

- **Missing — real blog page.** Baseline app has post listing, slug
  normalization, permalink/hash opening, scroll restoration, random post
  navigation and blog-specific content/security behavior (`src/App.tsx`,
  lines 18–35, 246–320, 516–656; inspect remaining blog route handlers around
  600–760 and `src/components/BlogContent.tsx`). Current
  `src/page/implementations/BlogPage.tsx`, lines 4–11, explicitly renders
  placeholder text. Current `src/page/utils/randomPostPath.ts` exists but
  does not by itself prove parity. Restore actual content loading, post
  routes, sanitization, slugs/permalinks, random selection, and scroll
  handling as applicable.
- **Missing — music page.** Current
  `src/page/implementations/MusicPage.tsx`, lines 134–142, calls a function
  that throws `Function not implemented.` Baseline includes SoundCloud and
  Spotify track detection/URL construction, iframe sections, Spotify sizing,
  validation and music page state in `src/App.tsx`, lines 39–224, and
  `src/lib/musicSchema.ts`. Restore the working live track list and player
  behavior; test valid/invalid URLs and each provider.
- **Uncertain — addons.** Current `src/page/implementations/AddonsPage.tsx`
  exists and baseline has `src/components/Addon.tsx`, but existence does not
  establish behavior. Compare download URLs, status, copy-to-clipboard,
  external-link behavior, auth/theme hooks and addon-specific section state.
  Baseline `SectionProvider` receives `isAddonPage` (`src/components/Page.tsx`,
  lines 37–74; `src/windowing/provider.tsx`, lines 34–98).
- **Uncertain — resume/contact.** Current page implementations and JSON
  content exist; verify complete content, links, page metadata, and visual
  layout against baseline `src/pages/ResumePage.tsx`,
  `src/pages/ContactPage.tsx`, `contacts.json`, and the live routes.
- **Changed/uncertain — projects, pagerts, sitemap, characters.** Current
  has ProjectsPage, GenSitemapPage, sitemap content, project metadata, and
  characters content; baseline exposes Pagerts and sitemap routes. Verify the
  current generated page registry and page manifest actually expose these
  surfaces and compare output. Do not assume a new project route is
  equivalent to `/pagerts`.
- **Changed — errors/404.** Baseline has route fallback and not-found page
  behavior in `src/App.tsx` and `src/pages/NotFoundPage.tsx`. Current has an
  error boundary and an `open`-themed NotFound page. Compare unknown URL,
  failed content load, route metadata, and the distinction between recoverable
  route errors and application exceptions.

### Global shell and special interactions

- **Missing/uncertain — Clippy/assistant experience.** Baseline `src/App.tsx`
  includes Clippy visibility/state, assistant/conversation windows, submit
  and error states, touch/drag handling, drag-to-menu navigation, border flash,
  lilac theme persistence, and toast UI (state/effects around lines 326–517;
  interaction handlers around 835–1037; render around 1207–1445). Current
  `src/Website.tsx` has only the menu and page provider (lines 9–17). Check
  separately for intentionally retired features before porting; where parity
  is required, restore each user-visible behavior and its assets/config.
- **Changed — page/provider boundaries.** Baseline creates a section provider
  with page metadata per page (`src/components/Page.tsx`, lines 19–74).
  Current wraps `children` and `PageSpace` in one `SectionProvider`
  (`src/page/components/PageProvider.tsx`, lines 45–49). Confirm state resets
  correctly on route changes and cannot leak between page trees.
- **Changed — global CSS.** Baseline `src/styles/main.css` is now
  `src/main.css`; current global styles have been rewritten. Perform a
  screenshot comparison rather than treating a successful build as visual
  parity. Include title bars, nested windows, spacing, page width, menu
  placement, colors/themes, desktop and small-screen widths, focus/hover, and
  reduced motion.

### Build, content, and verification

- **Changed — content pipeline/assets.** The branch removes baseline content
  generation/policy files and moves JSON into `src/content`; it also deletes
  tracked blog data and scripts while adding a different data layout.
  Compare `scripts/`, `public/blog/`, `src/lib/`, and checksums against
  baseline. Verify deployed assets and generated data, not just imports.
- **Incomplete — type/build verification.** At the time this handoff was
  created, targeted tests passed, but `npx tsc --noEmit --incremental false`
  reported errors in `src/page/components/window/Window.tsx`,
  `src/page/implementations/BasePage.tsx`, and
  `src/page/implementations/MusicPage.tsx`. Recheck current status before
  implementing; these errors are evidence of incomplete type coverage, not
  permission to alter unrelated changes.
- **Uncertain — runtime security headers.** Baseline `vite.config.ts` and
  production hosting configuration include security-related setup. Compare
  current Vite and deployment configuration with baseline and test the
  deployed response headers. A dev server response is not proof of production
  headers.

## Step-wise implementation plan

Each phase should be a separate, reviewable change. If two behaviors share a
root cause, keep the fix together, but do not bundle unrelated migrations.

### Phase 0 — Freeze reference behavior and scope

- [ ] Record live route responses, titles, descriptions, and page content.
- [ ] Capture baseline and refactor screenshots at matching desktop/mobile
  viewports, including initial and revealed window states.
- [ ] Validate inventory items below; distinguish intentional changes from
  missing features and unresolved questions.
- [ ] Record baseline/refactor test, typecheck, and build results without
  folding unrelated repairs into this phase.

**Inspect:** Baseline `pages.json`, baseline `src/App.tsx`, baseline
`src/windowing/Section.tsx`, baseline `src/styles/main.css`, current route
manifest, page implementations, and the dirty worktree.

**Do:**

1. Record route response/title and screenshots for each live route.
2. Capture desktop and mobile screenshots on `main` and current branch using
   consistent viewport dimensions and state (initial and revealed windows).
3. Build a baseline feature checklist from this document. Mark deliberate
   product changes separately and confirm them with the owner.
4. Record baseline and current test/typecheck/build results. Do not repair
   unrelated baseline or pre-existing failures in this phase.

**Accept when:** The route/screenshot/reference set exists, all status
classifications are validated or marked uncertain, and no code has changed.

### Phase 1 — Restore routes and page metadata

- [ ] Reconcile route inventory and menu labels with baseline/live behavior.
- [ ] Verify direct navigation, fallback, deep links, browser history, and
  title/description updates.

**Scope:** `src/content/pages.json`, `src/page/index.ts`,
`src/page/routing.ts`, `src/page/components/PageSpace.tsx`,
`src/page/components/PageProvider.tsx`, and content/page lookup helpers.

**Do:** Reconcile each route with baseline/live; reinstate missing routes and
labels; verify direct navigation, prefix/nested routes, `404`, and title/
description metadata. Preserve intentional additions only after identifying
them as additions, not replacements.

**Accept/tests:** Table-driven tests for every baseline route, unknown paths,
deep links, trailing-slash policy, history back/forward, and page title/
description updates. No route renders the wrong component or placeholder
metadata.

### Phase 2 — Complete the shared window model

- [ ] Implement window/section state through focused context and hooks.
- [ ] Keep titlebar controls, reveal UI, and section body independently
  composable and testable.
- [ ] Restore baseline minimize/iconise, close/restore, maximize, and
  ancestry behavior where confirmed.
- [ ] Cover reveal, nested sections, themes, controls, keyboard use, and
  route-change lifecycle with interaction tests.

**Scope:** `SectionContext.tsx`, current content renderer/hooks,
`WindowTitlebar.tsx`, `WindowDecorations.tsx`, `OkButton.tsx`, and focused
window tests.

**Do:** Model per-section reveal, minimize/iconise, close/restore, maximize,
and ancestry rules that exist in baseline. Preserve `"open"` always-revealed
behavior. Make controls accessible, ensure each control targets the correct
section, and define route-change state lifetime.

**Accept/tests:** Interactive tests—not SSR-only assertions—for initial
collapsed state, OK revealing one layer, nested children remaining
independent, open theme, minimize and restore, close and restore, maximize
toggle, keyboard/focus behavior, and route changes. No decorative control
silently does nothing.

### Phase 3 — Match the content/section contract

- [ ] Support the confirmed baseline section/content shapes through dedicated
  renderers/adapters instead of a monolithic `Section` component.
- [ ] Verify Markdown, URL validation, sanitization, embeds, printouts, links,
  addons, and permalinks with focused fixtures.

**Scope:** Current content types, recursive renderer, markdown components,
copy button, addon component, and content validation.

**Do:** Port supported baseline section branches (link, printout, raw/plain
window, markdown, nested sections, addon fields, external links and
permalinks). Preserve sanitizer rules and URL policy. Establish explicit,
typed handling for unsupported or invalid data.

**Accept/tests:** Fixtures covering each content shape and theme; tests for
sanitization, safe external URLs, iframe allowlist, link handling, and
copy-to-clipboard feedback; no invalid content produces success-shaped
fallback output.

### Phase 4 — Restore complete primary pages

- [ ] Replace page placeholders and render-time throws with complete
  implementations.
- [ ] Restore each confirmed live page in bounded page-specific slices using
  the shared content and window primitives.
- [ ] Test page data, route loading, links, and interactive behavior for each
  restored route.

**Scope:** Blog, music, addons, resume, contact, characters/projects/pagerts,
and sitemap implementations, their content loaders/data, and their
page-specific tests.

**Do in bounded sub-slices:** Start with the live route that currently
throws/uses a placeholder (Music and Blog), then addons, then the remaining
content pages. Reuse shared section rendering instead of creating parallel
window systems. Restore random blog/permalink/hash/scroll behavior and
SoundCloud/Spotify embeds only where confirmed in baseline.

**Accept/tests:** Each live route has representative content assertions,
working links/actions, and no placeholder/throw. Validate blog slug and
random path edge cases; music source resolution and malformed data; addon
download/copy behavior; direct route reload.

### Phase 5 — Restore shell, navigation, and global behaviors

- [ ] Verify menu visibility, keyboard and pointer navigation, admin rules,
  responsive behavior, and route state.
- [ ] Restore confirmed global interactions and themes as separate components
  or services with explicit dependencies and tests.

**Scope:** `Website.tsx`, menu components, theme integration, assistant/Clippy
components/state, toast behavior, route/hash listeners, and assets/config.

**Do:** Port baseline-visible menu filtering, keyboard shortcuts, responsive
overflow, active route, admin-only sitemap rules, Clippy interactions,
assistant visibility/error interactions, theme persistence, and any global
toast behaviors individually. Mark retired features explicitly rather than
silently losing them.

**Accept/tests:** Menu tests for keyboard and pointer behavior, hidden routes,
admin state and small widths; isolated interaction tests for Clippy/assistant
behaviors retained from baseline; browser tests for persisted theme and
navigation.

### Phase 6 — Visual and responsive parity

- [ ] Compare each baseline route at desktop and mobile sizes against the
  captured reference.
- [ ] Verify layout, typography, window chrome, colors, overflow, media sizing,
  focus, and reduced-motion behavior.

**Scope:** `src/main.css`, component styles, theme selectors, and layout.

**Do:** Compare baseline and current screenshots for identical viewport,
route, scroll, font loading, theme, and window state. Correct structural
differences in page width, title-bar controls, spacing, color, stacking,
focus, iframe sizing, overflow, and mobile layout. Honor reduced-motion.

**Accept:** For every baseline route, desktop and mobile comparisons are
reviewed and pass agreed visual tolerances; accessibility checks cover
keyboard reachability, labels, contrast-sensitive themes, and reduced motion.
Document any intentional visual differences.

### Phase 7 — Pipeline, production checks, and parity closeout

- [ ] Verify generation scripts, content/assets, checksums, build/deployment
  configuration, and production headers.
- [ ] Run focused tests, full tests, typecheck, and production build.
- [ ] Publish a final parity matrix with any remaining intentional differences.

**Scope:** package scripts, Vite/deployment config, content-generation scripts,
public assets and checksums, type coverage, and the full test suite.

**Do:** Compare pipeline and production headers to baseline; restore required
generation and assets; remove a baseline artifact only after proving a
maintained replacement exists. Fix parity-related type errors without
rewriting unrelated worktree changes.

**Accept:** Relevant unit/integration/browser tests pass; TypeScript and
production build pass; generated checksums/data are reproducible; deployed
headers/assets/routes are smoke-tested. Submit a final baseline-versus-current
feature matrix and list any outstanding intentional differences.

## Handoff requirements for every implementation phase

Before editing, state the phase and exact in-scope files. Keep each change
reviewable, narrowly scoped, and consistent with the modular design goal.
After editing:

1. Summarize behavior restored and any intentionally deferred differences.
2. List tests/build/typecheck commands and exact results.
3. Report any unrelated pre-existing errors separately; do not conceal or
   opportunistically fix them.
4. Preserve all staged, unstaged, and untracked work that predates the phase.
5. Do not claim visual parity without a desktop/mobile comparison.
